/**
 * SimulationEngine — orchestrates the simulation clock and propagation loop.
 *
 * Features:
 *   • Re-entrant propagation guard (#1): prevents nested propagation calls
 *   • Seed batching (#3): coalesces multiple triggerPropagation calls per frame
 *   • Exception isolation (#9): faulty component evaluations don't crash the engine
 *   • Output sink reconciliation: ensures LEDs/Displays reflect settled state
 *   • Propagation metrics: exposed via getStats() for the Propagation console tab
 */

import { type ComponentLibrary } from "./ComponentLibrary";
import {
  ENGINE_EVENT_TYPE,
  SIMULATION_STATUS,
  TICKS_PER_CYCLE,
} from "./constants";
import { type GraphManager } from "./GraphManager";
import { type SignalPropagator } from "./SignalPropagator";
import type {
  ComponentInstance,
  EngineEvent,
  EngineListener,
  SignalValue,
  SimulationStats,
  SimulationStatus,
} from "./types";
import { LogicValue } from "./types";
import { propagateViaSignals } from "./ViaService";

const U = LogicValue.HIGH_IMPEDANCE;

export interface SimulationEngineOptions {
  clockHz?: number; // simulation ticks per second (default 8)
}

export class SimulationEngine {
  private tick = 0;
  private clockHz: number;
  private status: SimulationStatus = SIMULATION_STATUS.IDLE;
  private eventsProcessed = 0;
  private oscillationsDetected = 0;

  private rafHandle: number | null = null;
  private lastTime: number | null = null;
  private accumulator = 0; // ms accumulated since last tick

  private listeners: Set<EngineListener> = new Set();

  // ── Re-entrant propagation guard (#1) ──────────────────────────────────────
  private isPropagating = false;
  private deferredSeeds: string[] = [];

  // ── Seed batching (#3) ─────────────────────────────────────────────────────
  private batchedSeeds: string[] = [];
  private batchFlushScheduled = false;

  // ── Exception tracking (#9) ────────────────────────────────────────────────
  private faultedComponents: Set<string> = new Set();
  private evaluationErrors: Array<{
    compId: string;
    error: string;
    tick: number;
  }> = [];

  private readonly maxErrorHistory = 50;

  constructor(
    private readonly components: Record<string, ComponentInstance>,
    private readonly graph: GraphManager,
    private readonly library: ComponentLibrary,
    private readonly propagator: SignalPropagator,
    options: SimulationEngineOptions = {},
  ) {
    this.clockHz = options.clockHz ?? 8;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  start(): void {
    if (this.status === SIMULATION_STATUS.RUNNING) return;

    this.status = SIMULATION_STATUS.RUNNING;
    this.lastTime = null;
    this.accumulator = 0;
    this.faultedComponents.clear();
    this.rafHandle = requestAnimationFrame(this.loop);
    this.emit({ type: ENGINE_EVENT_TYPE.STARTED });
  }

  pause(): void {
    if (this.status !== SIMULATION_STATUS.RUNNING) return;

    this.status = SIMULATION_STATUS.PAUSED;

    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }

    this.emit({ type: ENGINE_EVENT_TYPE.PAUSED });
  }

  stop(): void {
    this.pause();
    this.status = SIMULATION_STATUS.IDLE;
  }

  step(): void {
    const dt = 1000 / Math.max(1, this.clockHz * TICKS_PER_CYCLE);

    this.doTick(dt);
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  reset(): void {
    this.stop();
    this.tick = 0;
    this.eventsProcessed = 0;
    this.oscillationsDetected = 0;
    this.faultedComponents.clear();
    this.evaluationErrors = [];
    this.batchedSeeds = [];
    this.deferredSeeds = [];

    const defs = this.library;

    for (const id of Object.keys(this.components)) {
      const comp = this.components[id];

      if (!defs.has(comp.type)) continue;

      const def = defs.get(comp.type);
      const initialState = def.initialState();
      const resetDefault = def.isInput || def.isClock ? U : LogicValue.ZERO;

      // Exception isolation: wrap evaluate in try/catch (#9)
      let initialOutputs: SignalValue[];

      try {
        initialOutputs = def.evaluate(
          new Array<SignalValue>(def.inputs).fill(resetDefault),
          initialState,
        ).outputs;
      } catch (e) {
        this.recordEvaluationError(id, e);
        initialOutputs = new Array<SignalValue>(def.outputs).fill(
          LogicValue.UNKNOWN,
        );
      }

      this.components[id] = {
        ...comp,
        state: initialState,
        outputs: initialOutputs,
        inputs: new Array<SignalValue>(def.inputs).fill(resetDefault),
      };
    }

    this.propagator.recomputeAll(this.components);
    this.emit({ type: ENGINE_EVENT_TYPE.RESET });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  // ── Clock control ──────────────────────────────────────────────────────────

  setClockHz(hz: number): void {
    this.clockHz = Math.max(1, hz);
  }

  getClockHz(): number {
    return this.clockHz;
  }

  getStatus(): SimulationStatus {
    return this.status;
  }

  getStats(): SimulationStats {
    const lastMetrics = this.propagator.getLastMetrics();

    return {
      tick: this.tick,
      eventsProcessed: this.eventsProcessed,
      oscillationsDetected: this.oscillationsDetected,
      status: this.status,
      clockHz: this.clockHz,
      propagation: lastMetrics
        ? {
            evaluations: lastMetrics.evaluations,
            deltaCycles: lastMetrics.deltaCycles,
            maxQueueDepth: lastMetrics.maxQueueDepth,
            skippedEvents: lastMetrics.skippedEvents,
            avgPropagationDepth: lastMetrics.avgPropagationDepth,
            oscillatingComponents: lastMetrics.oscillatingComponents,
            evalsPerDelta: lastMetrics.evalsPerDelta,
            durationMs: lastMetrics.durationMs,
          }
        : null,
      faultedComponents: Array.from(this.faultedComponents),
      recentErrors: this.evaluationErrors.slice(-10),
    };
  }

  /** Get the list of components that have thrown during evaluation */
  getFaultedComponents(): string[] {
    return Array.from(this.faultedComponents);
  }

  /** Get recent evaluation errors */
  getEvaluationErrors(): Array<{
    compId: string;
    error: string;
    tick: number;
  }> {
    return this.evaluationErrors.slice(-10);
  }

  /** Clear faulted state for a component (e.g. after it's been fixed) */
  clearFault(compId: string): void {
    this.faultedComponents.delete(compId);
  }

  // ── RAF loop ───────────────────────────────────────────────────────────────

  private loop = (now: number): void => {
    if (this.status !== SIMULATION_STATUS.RUNNING) return;
    if (this.lastTime === null) this.lastTime = now;

    const elapsed = now - this.lastTime;

    this.lastTime = now;

    const interval = 1000 / (this.clockHz * TICKS_PER_CYCLE);

    this.accumulator += elapsed;

    let ticked = false;
    let catchUp = 0;

    while (this.accumulator >= interval && catchUp < 4) {
      this.doTick(interval);
      this.accumulator -= interval;
      ticked = true;
      catchUp += 1;
    }

    if (ticked) {
      this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
    }

    this.rafHandle = requestAnimationFrame(this.loop);
  };

  // ── Core tick ──────────────────────────────────────────────────────────────

  private doTick(dt: number): void {
    this.tick += 1;

    const seeds: string[] = [];

    for (const id of Object.keys(this.components)) {
      const comp = this.components[id];

      if (!this.library.has(comp.type)) continue;
      // Skip faulted components (#9)
      if (this.faultedComponents.has(id)) continue;

      const def = this.library.get(comp.type);

      if (!def.isClock || !def.tick) continue;

      const prevOutput = comp.outputs[0] ?? U;

      // Exception isolation (#9)
      let result;

      try {
        result = def.tick(comp.state, dt);
      } catch (e) {
        this.recordEvaluationError(id, e);
        continue;
      }

      const newOutput = result.outputs[0] ?? U;

      this.components[id] = {
        ...comp,
        outputs: result.outputs,
        state: result.state ?? comp.state,
      };

      if (newOutput !== prevOutput) seeds.push(id);
    }

    if (seeds.length > 0) {
      const result = this.propagator.propagate(
        seeds,
        this.components,
        this.tick,
      );

      this.eventsProcessed += result.evaluations;

      if (result.oscillationDetected) {
        this.oscillationsDetected += 1;
        this.emit({ type: ENGINE_EVENT_TYPE.OSCILLATION });
      }
    }

    // Post-tick: propagate via signals (broadcaster → receiver)
    const viaChanged = propagateViaSignals(this.components);

    if (viaChanged.length > 0) {
      const viaResult = this.propagator.propagate(
        viaChanged,
        this.components,
        this.tick,
      );

      this.eventsProcessed += viaResult.evaluations;
    }

    // Sample probes and other samplesEveryTick components
    for (const id of Object.keys(this.components)) {
      const comp = this.components[id];

      if (!this.library.has(comp.type)) continue;
      if (this.faultedComponents.has(id)) continue;

      const def = this.library.get(comp.type);

      if (!def.samplesEveryTick) continue;

      try {
        const result = def.evaluate(comp.inputs, comp.state, {
          tick: this.tick,
        });

        this.components[id] = {
          ...comp,
          state: result.state ?? comp.state,
        };
      } catch (e) {
        this.recordEvaluationError(id, e);
      }
    }
  }

  // ── Triggered propagation (#1, #3) ─────────────────────────────────────────

  /**
   * Trigger signal propagation from changed components.
   *
   * Features:
   * - Re-entrant guard: if called during an active propagation, seeds are
   *   deferred and flushed after the current pass completes.
   * - Batch mode: when batching is active (transaction), seeds are collected
   *   and propagated once on flush.
   */
  triggerPropagation(changedIds: string[]): void {
    // If inside a transaction, just collect seeds (#4 — handled by CircuitManager)
    if (this.batchedSeeds.length > 0 && this.batchFlushScheduled) {
      this.batchedSeeds.push(...changedIds);

      return;
    }

    // Re-entrant guard (#1): if already propagating, defer
    if (this.isPropagating) {
      this.deferredSeeds.push(...changedIds);

      return;
    }

    this.executePropagation(changedIds);
  }

  /**
   * Begin batching propagation seeds (#3).
   * All triggerPropagation calls between beginBatch/flushBatch are coalesced.
   */
  beginBatch(): void {
    this.batchFlushScheduled = true;
  }

  /**
   * Flush batched seeds and propagate once (#3).
   * Deduplicates seed IDs before propagating.
   */
  flushBatch(): void {
    this.batchFlushScheduled = false;

    if (this.batchedSeeds.length === 0) return;

    // Deduplicate seeds
    const uniqueSeeds = Array.from(new Set(this.batchedSeeds));

    this.batchedSeeds = [];
    this.executePropagation(uniqueSeeds);
  }

  /**
   * Execute propagation with all guards and post-processing.
   */
  private executePropagation(seeds: string[]): void {
    this.isPropagating = true;

    try {
      const result = this.propagator.propagate(
        seeds,
        this.components,
        this.tick,
      );

      this.eventsProcessed += result.evaluations;

      if (result.oscillationDetected) {
        this.oscillationsDetected += 1;
        this.emit({ type: ENGINE_EVENT_TYPE.OSCILLATION });
      }

      // Post-propagation: reconcile output sinks
      this.reconcileOutputSinks();

      // Post-propagation: sync via signals (broadcaster → receiver)
      const viaChanged = propagateViaSignals(this.components);

      if (viaChanged.length > 0) {
        const viaResult = this.propagator.propagate(
          viaChanged,
          this.components,
          this.tick,
        );

        this.eventsProcessed += viaResult.evaluations;
        this.reconcileOutputSinks();
      }
    } finally {
      this.isPropagating = false;
    }

    // Flush any deferred seeds that arrived during propagation (#1)
    if (this.deferredSeeds.length > 0) {
      const deferred = this.deferredSeeds.splice(0);

      // Deduplicate
      const uniqueDeferred = Array.from(new Set(deferred));

      this.executePropagation(uniqueDeferred);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  /**
   * Ensure output sinks (LED, Display — 0 output pins) reflect
   * the final settled signals after propagation.
   */
  private reconcileOutputSinks(): void {
    for (const id of Object.keys(this.components)) {
      const comp = this.components[id];

      if (!this.library.has(comp.type)) continue;
      if (this.faultedComponents.has(id)) continue;

      const def = this.library.get(comp.type);

      if (def.outputs > 0 || def.isInput || def.isClock) continue;

      const liveInputs: SignalValue[] = new Array<SignalValue>(def.inputs).fill(
        LogicValue.ZERO,
      );

      for (let pin = 0; pin < def.inputs; pin += 1) {
        const wire = this.graph.getInputWire(id, pin);

        if (wire) {
          const src = this.components[wire.from.comp];

          if (src)
            liveInputs[pin] = src.outputs[wire.from.pin] ?? LogicValue.ZERO;
        }
      }

      try {
        const evalResult = def.evaluate(liveInputs, comp.state, {
          tick: this.tick,
        });

        this.components[id] = {
          ...comp,
          inputs: liveInputs,
          outputs: evalResult.outputs,
          state: evalResult.state ?? comp.state,
        };
      } catch (e) {
        this.recordEvaluationError(id, e);
      }
    }
  }

  // ── Exception isolation (#9) ───────────────────────────────────────────────

  /**
   * Record an evaluation error for a component.
   * Marks the component as faulted (will be skipped in subsequent ticks)
   * and stores the error for diagnostic display.
   */
  private recordEvaluationError(compId: string, error: unknown): void {
    this.faultedComponents.add(compId);

    const msg = error instanceof Error ? error.message : String(error);

    this.evaluationErrors.push({ compId, error: msg, tick: this.tick });

    if (this.evaluationErrors.length > this.maxErrorHistory) {
      this.evaluationErrors.shift();
    }

    this.emit({
      type: ENGINE_EVENT_TYPE.ERROR,
      payload: { compId, error: msg },
    });
  }

  // ── Event bus ──────────────────────────────────────────────────────────────

  on(listener: EngineListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    for (const l of this.listeners) l(event);
  }
}
