// Core types for the Digital Gate simulation engine.
// No UI or framework dependencies.

export type SignalValue = boolean;
export type ComponentId = string;
export type WireId = string;

// ── Pin reference ────────────────────────────────────────────────────────────

export interface PinRef {
  comp: ComponentId;
  pin: number;
}

// ── Circuit data model ────────────────────────────────────────────────────────
// Shape is kept compatible with the existing UI render code in App.tsx.

export interface ComponentInstance {
  id: ComponentId;
  type: string;
  x: number;
  y: number;
  label?: string;
  /** Internal component state (flip-flop storage, clock accumulator, etc.) */
  state: Record<string, unknown> | null;
  /** Current output signal values — index matches output pin index */
  outputs: SignalValue[];
  /** Current input signal values — derived from connected wires */
  inputs: SignalValue[];
  color?: string;
  /** Arbitrary user-editable properties (clock period, propagation delay…) */
  properties?: Record<string, unknown>;
}

export interface Wire {
  id: WireId;
  from: PinRef; // output (source) pin
  to: PinRef; // input  (target) pin
}

export interface CircuitSnapshot {
  components: Record<ComponentId, ComponentInstance>;
  wires: Record<WireId, Wire>;
}

// ── Component definition ──────────────────────────────────────────────────────

export interface EvaluateResult {
  outputs: SignalValue[];
  state: Record<string, unknown> | null;
}

export interface ComponentDefinition {
  type: string;
  label: string;
  category: string;
  /** Number of input pins */
  inputs: number;
  /** Number of output pins */
  outputs: number;
  width: number;
  height: number;
  symbol?: string;
  /** True → only updates on a clock edge; False → updates on any input change */
  isSequential: boolean;
  /** True → this component drives the simulation clock (has a tick() method) */
  isClock: boolean;
  /** True → this component is a user-driven input (Toggle, Button, Constant) */
  isInput: boolean;
  /** True → this component is an output sink (LED, Lamp) */
  isOutput: boolean;
  initialState: () => Record<string, unknown> | null;
  /**
   * Pure combinational / sequential evaluation.
   * Called by SignalPropagator whenever any input changes.
   */
  evaluate: (
    inputs: SignalValue[],
    state: Record<string, unknown> | null,
  ) => EvaluateResult;
  /**
   * Time-based advancement for clock/timer components.
   * Called by SimulationEngine on every simulation tick with elapsed ms.
   * Only defined on components where isClock === true.
   */
  tick?: (state: Record<string, unknown> | null, dt: number) => EvaluateResult;
}

// ── Simulation state ──────────────────────────────────────────────────────────

export type SimulationStatus = "idle" | "running" | "paused";

export interface SimulationStats {
  tick: number;
  eventsProcessed: number;
  oscillationsDetected: number;
  status: SimulationStatus;
  clockHz: number;
}

// ── Engine event bus ──────────────────────────────────────────────────────────

export type EngineEventType =
  | "snapshot-changed" // circuit structure or signals changed
  | "signal-changed" // a component's output signals changed
  | "component-added"
  | "component-removed"
  | "wire-added"
  | "wire-removed"
  | "tick" // simulation clock ticked
  | "started"
  | "paused"
  | "reset"
  | "oscillation" // feedback loop detected
  | "error";

export interface EngineEvent {
  type: EngineEventType;
  payload?: unknown;
}

export type EngineListener = (event: EngineEvent) => void;
