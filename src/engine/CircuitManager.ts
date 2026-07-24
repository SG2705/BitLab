/* eslint-disable @typescript-eslint/no-dynamic-delete */
/**
 * CircuitManager — Single source of truth for circuit structure and state.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The CircuitManager is the top-level orchestrator of the simulation engine.
 * All circuit mutations flow through this class to maintain consistency.
 *
 * Responsibilities:
 *   • Component CRUD (add, remove, move, update)
 *   • Wire CRUD (add, remove)
 *   • Input toggling (setInput) with immediate signal propagation
 *   • Simulation lifecycle (start, stop, pause, step, reset)
 *   • Snapshot queries for UI rendering
 *   • Event emission to notify the UI of state changes
 *   • Transaction support for batched edits (paste, multi-delete, etc.)
 *
 * Transaction Model:
 *   beginTransaction() → multiple mutations → commitTransaction()
 *   During a transaction:
 *     • Signal propagation is deferred
 *     • SNAPSHOT_CHANGED events are suppressed
 *     • A single recomputation runs on commit
 *   This prevents expensive intermediate states during large edits.
 *
 * Invariants maintained:
 *   • GraphManager always reflects the current wires collection
 *   • Self-connections (output→input on same component) are rejected
 *   • Each input pin has at most one connected wire
 *   • Propagation is triggered after every structural change (outside transactions)
 *   • The propagator's topology cache is invalidated on wire changes
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { v4 as uuidv4 } from "uuid";

import {
  type ComponentLibrary,
  library as defaultComponentLibrary,
} from "./ComponentLibrary";
import {
  ENGINE_EVENT_TYPE,
  GATE_TYPE_BROADCASTER,
  GATE_TYPE_RECEIVER,
} from "./constants";
import { GraphManager } from "./GraphManager";
import { SignalPropagator } from "./SignalPropagator";
import { SimulationEngine } from "./SimulationEngine";
import type {
  CircuitSnapshot,
  ComponentInstance,
  EngineEvent,
  EngineListener,
  SignalValue,
  SimulationStats,
  SimulationStatus,
  Wire,
} from "./types";
import { LogicValue } from "./types";
import { onBroadcasterAdded, propagateViaSignals } from "./ViaService";

const U = LogicValue.HIGH_IMPEDANCE;

export interface AddComponentOptions {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  rotation?: 0 | 90 | 180 | 270;
  properties?: Record<string, unknown>;
}

export class CircuitManager {
  private components: Record<string, ComponentInstance> = {};
  private wires: Record<string, Wire> = {};

  readonly graph: GraphManager;
  readonly library: ComponentLibrary;
  readonly propagator: SignalPropagator;
  readonly engine: SimulationEngine;

  private listeners: Set<EngineListener> = new Set();

  // ── Transaction support (#4) ──────────────────────────────────────────────
  private transactionDepth = 0;
  private transactionSeeds: string[] = [];
  private transactionDirty = false;

  constructor(lib: ComponentLibrary = defaultComponentLibrary) {
    this.library = lib;
    this.graph = new GraphManager();
    this.propagator = new SignalPropagator(this.graph, this.library);
    this.engine = new SimulationEngine(
      this.components,
      this.graph,
      this.library,
      this.propagator,
    );

    // Forward engine events to our own listeners
    this.engine.on((e) => this.emit(e));
  }

  // ── Transaction API (#4) ───────────────────────────────────────────────────

  /**
   * Begin a transaction. During a transaction:
   * - Propagation is deferred (seeds are collected)
   * - SNAPSHOT_CHANGED events are suppressed
   * - A single recomputation happens on commit
   *
   * Transactions can be nested (counted). Only the outermost commit triggers
   * propagation and events.
   */
  beginTransaction(): void {
    this.transactionDepth += 1;
  }

  /**
   * Commit the current transaction. If this is the outermost transaction,
   * flush all collected seeds and emit a snapshot change.
   */
  commitTransaction(): void {
    if (this.transactionDepth <= 0) return;

    this.transactionDepth -= 1;

    if (this.transactionDepth === 0 && this.transactionDirty) {
      this.transactionDirty = false;

      // Invalidate cache since graph may have changed
      this.propagator.invalidateCache();

      if (this.transactionSeeds.length > 0) {
        const seeds = Array.from(new Set(this.transactionSeeds));

        this.transactionSeeds = [];
        this.engine.triggerPropagation(seeds);
      } else {
        // No specific seeds — do a full recompute
        this.propagator.recomputeAll(this.components);
        this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
      }
    }
  }

  /**
   * Abort the current transaction without propagating.
   * Note: mutations already applied are NOT rolled back.
   */
  abortTransaction(): void {
    if (this.transactionDepth <= 0) return;

    this.transactionDepth -= 1;

    if (this.transactionDepth === 0) {
      this.transactionSeeds = [];
      this.transactionDirty = false;
    }
  }

  /** Whether a transaction is currently active */
  get inTransaction(): boolean {
    return this.transactionDepth > 0;
  }

  // ── Component operations ──────────────────────────────────────────────────

  /**
   * Add a new component instance to the circuit.
   * Evaluates with default inputs to establish initial output state.
   * Triggers propagation if the component is an input source (Toggle, Clock).
   *
   * @param type - Component type key (must exist in the library)
   * @param opts - Position, label, rotation, color, and custom properties
   * @returns The created component instance
   */
  addComponent(
    type: string,
    opts: AddComponentOptions = {},
  ): ComponentInstance {
    const cid = uuidv4();
    const def = this.library.get(type);
    const initialState = def.initialState();
    const defaultInput = def.isInput || def.isClock ? U : LogicValue.ZERO;
    const { outputs } = def.evaluate(
      new Array<SignalValue>(def.inputs).fill(defaultInput),
      initialState,
    );
    const comp: ComponentInstance = {
      id: cid,
      type,
      x: opts.x ?? 0,
      y: opts.y ?? 0,
      label: opts.label ?? def.label,
      rotation: opts.rotation,
      state: initialState,
      outputs,
      inputs: new Array<SignalValue>(def.inputs).fill(defaultInput),
      color: opts.color,
      properties: opts.properties,
    };

    this.components[cid] = comp;
    this.graph.addNode(cid);

    // If it's an input source, immediately propagate its initial output
    if (def.isInput || def.isClock) {
      this.triggerPropagate([cid]);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.COMPONENT_ADDED, payload: comp });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });

    // Via service: auto-assign channel name to new broadcasters
    if (type === GATE_TYPE_BROADCASTER) {
      onBroadcasterAdded(cid, this.components, (id, patch) =>
        this.updateComponent(id, patch),
      );
    }

    return comp;
  }

  /** Remove a component and all its connected wires from the circuit. */
  removeComponent(id: string): void {
    if (!this.components[id]) return;

    const comp = this.components[id];
    const isBroadcaster = comp.type === GATE_TYPE_BROADCASTER;

    // Remove all wires connected to this component
    const connected = Object.values(this.wires).filter(
      (w) => w.from.comp === id || w.to.comp === id,
    );

    for (const w of connected) this.removeWire(w.id);

    this.graph.removeNode(id);

    delete this.components[id];

    this.emit({ type: ENGINE_EVENT_TYPE.COMPONENT_REMOVED, payload: { id } });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });

    // When a broadcaster is removed, update all receivers on that channel
    if (isBroadcaster) {
      const changed = propagateViaSignals(this.components);

      if (changed.length > 0) {
        this.triggerPropagate(changed);
      }
    }
  }

  /** Remove multiple components in one call. Use within a transaction for batching. */
  removeComponents(ids: string[]): void {
    for (const id of ids) this.removeComponent(id);
  }

  /** Move a component to an absolute position. Does not affect signals. */
  moveComponent(id: string, x: number, y: number): void {
    const comp = this.components[id];

    if (!comp) return;

    this.components[id] = { ...comp, x, y };
    // Position change doesn't affect signals; just update snapshot
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  /** Move multiple components by a relative delta. Does not affect signals. */
  moveComponents(ids: string[], dx: number, dy: number): void {
    for (const id of ids) {
      const comp = this.components[id];

      if (!comp) continue;

      this.components[id] = { ...comp, x: comp.x + dx, y: comp.y + dy };
    }

    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  /** Apply a partial update to a component instance (label, color, properties, etc.) */
  updateComponent(id: string, patch: Partial<ComponentInstance>): void {
    const comp = this.components[id];

    if (!comp) return;

    this.components[id] = { ...comp, ...patch };
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });

    // Via service: propagate via signals if channel property changed
    if (
      patch.properties &&
      (comp.type === GATE_TYPE_BROADCASTER || comp.type === GATE_TYPE_RECEIVER)
    ) {
      const changed = propagateViaSignals(this.components);

      if (changed.length > 0) {
        this.triggerPropagate(changed);
      }
    }
  }

  /**
   * Toggle or set the state of an input component (Toggle, Constant, Button).
   * Immediately triggers propagation so downstream components update.
   */
  setInput(id: string, stateUpdate: Record<string, unknown>): void {
    const comp = this.components[id];

    if (!comp) return;
    if (!this.library.has(comp.type)) return;

    const def = this.library.get(comp.type);
    const newState = { ...(comp.state ?? {}), ...stateUpdate };
    const result = def.evaluate(comp.inputs, newState);

    this.components[id] = { ...comp, state: newState, outputs: result.outputs };
    this.triggerPropagate([id]);
  }

  // ── Wire operations ───────────────────────────────────────────────────────

  /**
   * Create a wire connecting an output pin to an input pin.
   *
   * Validation:
   *   • Both components must exist
   *   • Self-connection (same component) is rejected
   *   • Double-wiring the same input pin is rejected
   *
   * After connection, the target's inputs are rebuilt and propagation is triggered.
   * For output sinks (0 outputs), an immediate evaluation ensures visual state updates.
   *
   * @returns The created Wire object, or null if validation failed
   */
  addWire(
    fromComp: string,
    fromPin: number,
    toComp: string,
    toPin: number,
  ): Wire | null {
    if (!this.components[fromComp] || !this.components[toComp]) return null;

    // Prevent self-connection (output → input on the same component)
    if (fromComp === toComp) return null;

    // Prevent double-wiring the same input pin
    const existing = this.graph.getInputWire(toComp, toPin);

    if (existing) return null;

    const id = uuidv4();
    const wire: Wire = {
      id,
      from: { comp: fromComp, pin: fromPin },
      to: { comp: toComp, pin: toPin },
    };

    this.wires[id] = wire;
    this.graph.addWire(wire);
    this.propagator.invalidateCache();
    // Immediately propagate through the newly connected path
    const srcComp = this.components[fromComp];

    if (srcComp) {
      // Update the target's input signal right away
      const targetInputs = this.buildInputs(toComp);

      this.components[toComp] = {
        ...this.components[toComp],
        inputs: targetInputs,
      };

      // For output sinks (LED, Display, Probe — 0 output pins), immediately
      // evaluate so their visual state updates even if propagation doesn't
      // reach them through the normal downstream traversal (e.g. in cycles).
      if (this.library.has(this.components[toComp].type)) {
        const targetDef = this.library.get(this.components[toComp].type);

        if (targetDef.outputs === 0) {
          const result = targetDef.evaluate(
            targetInputs,
            this.components[toComp].state,
          );

          this.components[toComp] = {
            ...this.components[toComp],
            state: result.state ?? this.components[toComp].state,
          };
        }
      }

      this.triggerPropagate([fromComp]);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.WIRE_ADDED, payload: wire });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });

    return wire;
  }

  /**
   * Remove a wire by ID. Disconnects the target's input pin (defaults to ZERO),
   * re-evaluates the target, and triggers downstream propagation.
   */
  removeWire(wireId: string): void {
    const wire = this.wires[wireId];

    if (!wire) return;

    this.graph.removeWire(wireId);
    this.propagator.invalidateCache();

    delete this.wires[wireId];

    // Clear the now-disconnected input pin
    const target = this.components[wire.to.comp];

    if (target) {
      const inputs = [...target.inputs];

      // Disconnected pins default to ZERO (safe logic level).
      inputs[wire.to.pin] = LogicValue.ZERO;

      // Re-evaluate the target with updated inputs so outputs reflect the change
      if (this.library.has(target.type)) {
        const def = this.library.get(target.type);

        // Only re-evaluate components that have outputs to propagate.
        // Output-only sinks (like Probe) are handled by triggerPropagation
        // which passes the correct tick context.
        if (def.outputs > 0) {
          const result = def.evaluate(inputs, target.state);

          this.components[wire.to.comp] = {
            ...target,
            inputs,
            outputs: result.outputs,
            state: result.state ?? target.state,
          };
        } else {
          this.components[wire.to.comp] = { ...target, inputs };
        }
      } else {
        this.components[wire.to.comp] = { ...target, inputs };
      }

      this.triggerPropagate([wire.to.comp]);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.WIRE_REMOVED, payload: { wireId } });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  /** Remove multiple wires. Use within a transaction for batching. */
  removeWires(wireIds: string[]): void {
    for (const id of wireIds) this.removeWire(id);
  }

  // ── Snapshot / queries ────────────────────────────────────────────────────

  /** Returns an immutable snapshot view of the current circuit state. */
  getSnapshot(): CircuitSnapshot {
    return {
      components: { ...this.components },
      wires: { ...this.wires },
    };
  }

  /** Get a single component by ID, or undefined if not found. */
  getComponent(id: string): ComponentInstance | undefined {
    return this.components[id];
  }

  /** Get a single wire by ID, or undefined if not found. */
  getWire(id: string): Wire | undefined {
    return this.wires[id];
  }

  // ── Simulation passthrough ────────────────────────────────────────────────
  // These delegate to SimulationEngine and provide a unified API surface.

  /** Start the simulation clock loop (RAF-based). */
  startSimulation(): void {
    this.engine.start();
  }

  /** Pause the simulation clock (stops ticking, preserves state). */
  pauseSimulation(): void {
    this.engine.pause();
  }

  /** Stop the simulation (pauses and resets status to IDLE). */
  stopSimulation(): void {
    this.engine.stop();
  }

  /** Advance exactly one simulation tick (for step-by-step debugging). */
  stepSimulation(): void {
    this.engine.step();
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  /** Reset all components to initial state and re-propagate. */
  resetSimulation(): void {
    this.engine.reset();
  }

  /** Set the simulation clock frequency in Hz. */
  setClockHz(hz: number): void {
    this.engine.setClockHz(hz);
  }

  /** Get current simulation lifecycle status (IDLE, RUNNING, PAUSED). */
  getSimulationStatus(): SimulationStatus {
    return this.engine.getStatus();
  }

  /** Get aggregate simulation statistics including propagation metrics. */
  getSimulationStats(): SimulationStats {
    return this.engine.getStats();
  }

  // ── Load from a snapshot (used by ProjectManager) ─────────────────────────

  /**
   * Replace the entire circuit with the given snapshot.
   * Stops simulation, clears all state, rebuilds from scratch,
   * invalidates caches, and runs a full recomputation.
   */
  loadSnapshot(snapshot: CircuitSnapshot): void {
    // Stop simulation before replacing state
    this.engine.stop();

    // Clear current state
    for (const id of Object.keys(this.components)) {
      this.graph.removeNode(id);
    }

    for (const id of Object.keys(this.components)) {
      delete this.components[id];
    }

    for (const id of Object.keys(this.wires)) {
      delete this.wires[id];
    }

    // Restore components
    for (const [id, comp] of Object.entries(snapshot.components)) {
      const inputCount = this.library.has(comp.type)
        ? this.library.get(comp.type).inputs
        : (comp.inputs?.length ?? 0);

      this.components[id] = {
        ...comp,
        inputs: comp.inputs ?? new Array(inputCount).fill(U),
      };

      this.graph.addNode(id);
    }

    // Restore wires
    for (const [id, wire] of Object.entries(snapshot.wires)) {
      this.wires[id] = wire;
      this.graph.addWire(wire);
    }

    // Invalidate topology cache after full rebuild
    this.propagator.invalidateCache();

    // Full propagation pass to restore signal state
    this.propagator.recomputeAll(this.components);

    // Propagate via signals (broadcaster → receiver) after full recomputation
    const viaChanged = propagateViaSignals(this.components);

    if (viaChanged.length > 0) {
      this.triggerPropagate(viaChanged);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  // ── Event bus ─────────────────────────────────────────────────────────────

  on(listener: EngineListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    // During transactions, suppress snapshot-changed events
    if (
      this.transactionDepth > 0 &&
      event.type === ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED
    ) {
      this.transactionDirty = true;

      return;
    }

    for (const l of this.listeners) l(event);
  }

  /**
   * Trigger propagation, respecting transaction state.
   * During a transaction, seeds are collected and deferred.
   */
  private triggerPropagate(seeds: string[]): void {
    if (this.transactionDepth > 0) {
      this.transactionSeeds.push(...seeds);
      this.transactionDirty = true;

      return;
    }

    this.engine.triggerPropagation(seeds);

    // After propagation, sync via signals (broadcaster input → receiver output)
    const viaChanged = propagateViaSignals(this.components);

    if (viaChanged.length > 0) {
      this.engine.triggerPropagation(viaChanged);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildInputs(compId: string): SignalValue[] {
    const { type } = this.components[compId];

    if (!this.library.has(type)) return [];

    const def = this.library.get(type);
    // Output components (LED, Probe, Display) default to ZERO when unconnected.
    // Logic gates and other non-input components also default to ZERO for
    // unconnected pins — HIGH_IMPEDANCE would produce UNKNOWN through truth tables.
    // Only input/clock sources use HIGH_IMPEDANCE as their driven default.
    const defaultVal = LogicValue.ZERO;
    const inputs: SignalValue[] = new Array<SignalValue>(def.inputs).fill(
      defaultVal,
    );

    for (let pin = 0; pin < def.inputs; pin += 1) {
      const wire = this.graph.getInputWire(compId, pin);

      if (wire) {
        const src = this.components[wire.from.comp];

        if (src) inputs[pin] = src.outputs[wire.from.pin] ?? U;
      }
    }

    return inputs;
  }
}
