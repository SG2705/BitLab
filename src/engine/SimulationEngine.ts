/**
 * SimulationEngine — orchestrates the simulation clock and propagation loop.
 *
 * Responsibilities:
 *   • Run a requestAnimationFrame loop (or a timer in non-browser contexts).
 *   • On each simulation tick (controlled by clockHz):
 *       1. Advance all CLOCK components by the elapsed dt.
 *       2. If any CLOCK output flipped, seed the SignalPropagator.
 *       3. Run event-driven propagation to steady state.
 *       4. Notify listeners of the resulting snapshot.
 *
 * The engine itself is completely UI-agnostic. It calls back via the listener
 * pattern defined in types.ts.
 */

import { ENGINE_EVENT_TYPE, SIMULATION_STATUS } from "@/lib/constants";

import { type ComponentLibrary } from "./ComponentLibrary";
import { type GraphManager } from "./GraphManager";
import { type SignalPropagator } from "./SignalPropagator";
import type {
  ComponentInstance,
  EngineEvent,
  EngineListener,
  SimulationStats,
  SimulationStatus,
} from "./types";

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

  constructor(
    private readonly components: Record<string, ComponentInstance>,
    private readonly _: GraphManager,
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

  /**
   * Advance exactly one simulation tick (used by the Step button).
   * Advances all clocks by one tick period then propagates.
   */
  step(): void {
    const dt = 1000 / Math.max(1, this.clockHz);

    this.doTick(dt);
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  reset(): void {
    this.stop();
    this.tick = 0;
    this.eventsProcessed = 0;
    this.oscillationsDetected = 0;
    // Reset every component to its initial state
    const defs = this.library;

    for (const id of Object.keys(this.components)) {
      const comp = this.components[id];

      if (!defs.has(comp.type)) continue;

      const def = defs.get(comp.type);
      const initialState = def.initialState();
      const initialOutputs = def.evaluate(
        new Array<boolean>(def.inputs).fill(false),
        initialState,
      ).outputs;

      this.components[id] = {
        ...comp,
        state: initialState,
        outputs: initialOutputs,
        inputs: new Array<boolean>(def.inputs).fill(false),
      };
    }

    // Full recompute after reset to propagate input states
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
    return {
      tick: this.tick,
      eventsProcessed: this.eventsProcessed,
      oscillationsDetected: this.oscillationsDetected,
      status: this.status,
      clockHz: this.clockHz,
    };
  }

  // ── RAF loop ───────────────────────────────────────────────────────────────

  private loop = (now: number): void => {
    if (this.status !== SIMULATION_STATUS.RUNNING) return;
    if (this.lastTime === null) this.lastTime = now;

    const elapsed = now - this.lastTime;

    this.lastTime = now;

    const interval = 1000 / this.clockHz;

    this.accumulator += elapsed;

    let ticked = false;
    // Allow at most 4 catch-up ticks per frame to avoid spiral-of-death
    let catchUp = 0;

    while (this.accumulator >= interval && catchUp < 4) {
      this.doTick(interval);
      this.accumulator -= interval;

      ticked = true;
      catchUp += 1;
    }

    if (ticked) {
      this.emit({ type: ENGINE_EVENT_TYPE.TICK, payload: this.tick });
      this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
    }

    this.rafHandle = requestAnimationFrame(this.loop);
  };

  // ── Core tick ──────────────────────────────────────────────────────────────

  /**
   * Advance all clock components by dt ms, then propagate any resulting
   * signal changes through the full combinational network.
   */
  private doTick(dt: number): void {
    this.tick += 1;

    const seeds: string[] = [];

    for (const id of Object.keys(this.components)) {
      const comp = this.components[id];

      if (!this.library.has(comp.type)) continue;

      const def = this.library.get(comp.type);

      if (!def.isClock || !def.tick) continue;

      const prevOutput = comp.outputs[0] ?? false;
      const result = def.tick(comp.state, dt);
      const newOutput = result.outputs[0] ?? false;

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
  }

  // ── Triggered propagation (for user inputs) ────────────────────────────────

  /**
   * Call this after directly mutating a component's outputs/state (e.g. user
   * toggled an input). Propagates signals downstream immediately.
   */
  triggerPropagation(changedIds: string[]): void {
    const result = this.propagator.propagate(
      changedIds,
      this.components,
      this.tick,
    );

    this.eventsProcessed += result.evaluations;

    if (result.oscillationDetected) {
      this.oscillationsDetected += 1;
      this.emit({ type: ENGINE_EVENT_TYPE.OSCILLATION });
    }

    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
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
