/**
 * CircuitManager — single source of truth for circuit structure and state.
 *
 * Manages:
 *   • Component instances (position, internal state, current signals)
 *   • Wires (connections between component pins)
 *   • Graph topology (via GraphManager)
 *   • The SimulationEngine (starts/stops the simulation loop)
 *
 * All mutating operations go through this class so that:
 *   1. The graph stays consistent with the component/wire collections.
 *   2. The engine is notified of topology changes.
 *   3. Listeners receive a snapshot after every mutation.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ComponentInstance,
  Wire,
  CircuitSnapshot,
  EngineEvent,
  EngineListener,
  SimulationStats,
  SimulationStatus,
} from "./types";
import { GraphManager } from "./GraphManager";
import {
  ComponentLibrary,
  library as defaultComponentLibrary,
} from "./ComponentLibrary";
import { SignalPropagator } from "./SignalPropagator";
import { SimulationEngine } from "./SimulationEngine";
import { ENGINE_EVENT_TYPE } from "@/lib/constants";

function uid(): string {
  return uuidv4();
}

export interface AddComponentOptions {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
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

  // ── Component operations ──────────────────────────────────────────────────

  addComponent(
    type: string,
    opts: AddComponentOptions = {},
  ): ComponentInstance {
    const cid = uid();
    const def = this.library.get(type);
    const initialState = def.initialState();
    const { outputs } = def.evaluate(
      new Array(def.inputs).fill(false),
      initialState,
    );
    const comp: ComponentInstance = {
      id: cid,
      type,
      x: opts.x ?? 0,
      y: opts.y ?? 0,
      label: opts.label ?? def.label,
      state: initialState,
      outputs,
      inputs: new Array(def.inputs).fill(false),
      color: opts.color,
      properties: opts.properties,
    };

    this.components[cid] = comp;
    this.graph.addNode(cid);

    // If it's an input source, immediately propagate its initial output
    if (def.isInput || def.isClock) {
      this.engine.triggerPropagation([cid]);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.COMPONENT_ADDED, payload: comp });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });

    return comp;
  }

  removeComponent(id: string): void {
    if (!this.components[id]) return;

    // Remove all wires connected to this component
    const connected = Object.values(this.wires).filter(
      (w) => w.from.comp === id || w.to.comp === id,
    );

    for (const w of connected) this.removeWire(w.id);

    this.graph.removeNode(id);

    delete this.components[id];

    this.emit({ type: ENGINE_EVENT_TYPE.COMPONENT_REMOVED, payload: { id } });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  removeComponents(ids: string[]): void {
    for (const id of ids) this.removeComponent(id);
  }

  moveComponent(id: string, x: number, y: number): void {
    const comp = this.components[id];

    if (!comp) return;

    this.components[id] = { ...comp, x, y };
    // Position change doesn't affect signals; just update snapshot
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  moveComponents(ids: string[], dx: number, dy: number): void {
    for (const id of ids) {
      const comp = this.components[id];

      if (!comp) continue;

      this.components[id] = { ...comp, x: comp.x + dx, y: comp.y + dy };
    }

    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  updateComponent(id: string, patch: Partial<ComponentInstance>): void {
    const comp = this.components[id];

    if (!comp) return;

    this.components[id] = { ...comp, ...patch };
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  /**
   * Toggle or set the state of an input component (Toggle, Constant, Button).
   * Immediately triggers propagation so downstream components update.
   */
  setInput(id: string, stateUpdate: Record<string, unknown>): void {
    const comp = this.components[id];

    if (!comp) return;

    const def = this.library.get(comp.type);
    const newState = { ...(comp.state ?? {}), ...stateUpdate };
    const result = def.evaluate(comp.inputs, newState);

    this.components[id] = { ...comp, state: newState, outputs: result.outputs };
    this.engine.triggerPropagation([id]);
  }

  // ── Wire operations ───────────────────────────────────────────────────────

  addWire(
    fromComp: string,
    fromPin: number,
    toComp: string,
    toPin: number,
  ): Wire | null {
    if (!this.components[fromComp] || !this.components[toComp]) return null;

    // Prevent double-wiring the same input pin
    const existing = this.graph.getInputWire(toComp, toPin);

    if (existing) return null;

    const id = uid();
    const wire: Wire = {
      id,
      from: { comp: fromComp, pin: fromPin },
      to: { comp: toComp, pin: toPin },
    };

    this.wires[id] = wire;
    this.graph.addWire(wire);
    // Immediately propagate through the newly connected path
    const srcComp = this.components[fromComp];

    if (srcComp) {
      // Update the target's input signal right away
      this.components[toComp] = {
        ...this.components[toComp],
        inputs: this.buildInputs(toComp),
      };

      this.engine.triggerPropagation([fromComp]);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.WIRE_ADDED, payload: wire });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });

    return wire;
  }

  removeWire(wireId: string): void {
    const wire = this.wires[wireId];

    if (!wire) return;

    this.graph.removeWire(wireId);

    delete this.wires[wireId];

    // Clear the now-disconnected input pin
    const target = this.components[wire.to.comp];

    if (target) {
      const inputs = [...target.inputs];
      inputs[wire.to.pin] = false;

      this.components[wire.to.comp] = { ...target, inputs };
      this.engine.triggerPropagation([wire.to.comp]);
    }

    this.emit({ type: ENGINE_EVENT_TYPE.WIRE_REMOVED, payload: { wireId } });
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

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

  getComponent(id: string): ComponentInstance | undefined {
    return this.components[id];
  }

  getWire(id: string): Wire | undefined {
    return this.wires[id];
  }

  // ── Simulation passthrough ────────────────────────────────────────────────

  startSimulation(): void {
    this.engine.start();
  }

  pauseSimulation(): void {
    this.engine.pause();
  }

  stopSimulation(): void {
    this.engine.stop();
  }

  stepSimulation(): void {
    this.engine.step();
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  resetSimulation(): void {
    this.engine.reset();
  }

  setClockHz(hz: number): void {
    this.engine.setClockHz(hz);
  }

  getSimulationStatus(): SimulationStatus {
    return this.engine.getStatus();
  }

  getSimulationStats(): SimulationStats {
    return this.engine.getStats();
  }

  // ── Load from a snapshot (used by ProjectManager) ─────────────────────────

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
      this.components[id] = {
        ...comp,
        inputs:
          comp.inputs ??
          new Array(this.library.get(comp.type).inputs).fill(false),
      };

      this.graph.addNode(id);
    }

    // Restore wires
    for (const [id, wire] of Object.entries(snapshot.wires)) {
      this.wires[id] = wire;
      this.graph.addWire(wire);
    }

    // Full propagation pass to restore signal state
    this.propagator.recomputeAll(this.components);
    this.emit({ type: ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED });
  }

  // ── Event bus ─────────────────────────────────────────────────────────────

  on(listener: EngineListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private emit(event: EngineEvent): void {
    for (const l of this.listeners) l(event);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildInputs(compId: string): boolean[] {
    const def = this.library.get(this.components[compId].type);
    const inputs: boolean[] = new Array(def.inputs).fill(false);

    for (let pin = 0; pin < def.inputs; pin++) {
      const wire = this.graph.getInputWire(compId, pin);

      if (wire) {
        const src = this.components[wire.from.comp];

        if (src) inputs[pin] = src.outputs[wire.from.pin] ?? false;
      }
    }

    return inputs;
  }
}
