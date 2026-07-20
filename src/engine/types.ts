// Core types for the BitLab simulation engine.
// No UI or framework dependencies.

import { type ENGINE_EVENT_TYPE, type SIMULATION_STATUS } from "./constants";

// ── Four-state logic (prepared for future migration) ─────────────────────────

export enum LogicValue {
  ZERO = 0,
  ONE = 1,
  UNKNOWN = 2,
  HIGH_IMPEDANCE = 3,
}

/** Signal type — four-state logic value */
export type SignalValue = LogicValue;
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
  /** Clockwise rotation in 90° steps */
  rotation?: 0 | 90 | 180 | 270;
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
  /** Per-pin names rendered next to each pin on the canvas, e.g. ["J","K","CLK"] */
  inputLabels?: string[];
  outputLabels?: string[];
  /** True → only updates on a clock edge; False → updates on any input change */
  isSequential: boolean;
  /**
   * Request pre-propagation pin values in evaluate()'s context while this
   * component itself continues to receive live inputs. Used by composite
   * components that contain edge-triggered storage and combinational logic.
   */
  needsInputSnapshot?: boolean;
  /** True → this component drives the simulation clock (has a tick() method) */
  isClock: boolean;
  /** True → this component is a user-driven input (Toggle, Button, Constant) */
  isInput: boolean;
  /** True → this component is an output sink (LED, Lamp) */
  isOutput: boolean;
  /** True → purely a canvas annotation; no pins, no simulation role */
  isAnnotation?: boolean;
  /** True → evaluate is called every tick to record samples (e.g. Probe) */
  samplesEveryTick?: boolean;
  /** True → all output pins collapse to a single bus port in the UI */
  isBusOutput?: boolean;
  /** True → all input pins collapse to a single bus input port in the UI */
  isBusInput?: boolean;
  /**
   * Describes which input pins are grouped as bus ports.
   * Each entry is [startPin, endPin (exclusive)] — those pins render as one bus port.
   * Pins not covered by any group render as individual pins.
   * Example: [[2,6],[8,12]] means pins 2-5 and 8-11 are bus ports.
   */
  busInputGroups?: [number, number][];
  /**
   * Describes which output pins are grouped as bus ports.
   * Same format as busInputGroups.
   */
  busOutputGroups?: [number, number][];
  initialState: () => Record<string, unknown> | null;
  /**
   * Pure combinational / sequential evaluation.
   * Called by SignalPropagator whenever any input changes.
   */
  evaluate: (
    inputs: SignalValue[],
    state: Record<string, unknown> | null,
    context?: { tick: number; snapshotInputs?: SignalValue[] },
  ) => EvaluateResult;
  /**
   * Time-based advancement for clock/timer components.
   * Called by SimulationEngine on every simulation tick with elapsed ms.
   * Only defined on components where isClock === true.
   */
  tick?: (state: Record<string, unknown> | null, dt: number) => EvaluateResult;
}

// ── Simulation state ──────────────────────────────────────────────────────────

export type SimulationStatus =
  (typeof SIMULATION_STATUS)[keyof typeof SIMULATION_STATUS];

export interface SimulationStats {
  tick: number;
  eventsProcessed: number;
  oscillationsDetected: number;
  status: SimulationStatus;
  clockHz: number;
  /** Propagation metrics from the most recent pass */
  propagation: PropagationStats | null;
  /** Component IDs that have thrown during evaluation */
  faultedComponents: string[];
  /** Recent evaluation errors (last 10) */
  recentErrors: Array<{ compId: string; error: string; tick: number }>;
}

/** Propagation statistics exposed to the UI */
export interface PropagationStats {
  /** Total evaluations in last pass */
  evaluations: number;
  /** Delta cycles in last pass */
  deltaCycles: number;
  /** Max queue/dirty-set depth */
  maxQueueDepth: number;
  /** Events skipped via deduplication */
  skippedEvents: number;
  /** Average propagation depth */
  avgPropagationDepth: number;
  /** Components involved in oscillation */
  oscillatingComponents: string[];
  /** Evaluations per delta cycle */
  evalsPerDelta: number[];
  /** Duration in milliseconds */
  durationMs: number;
}

// ── Engine event bus ──────────────────────────────────────────────────────────

export type EngineEventType =
  (typeof ENGINE_EVENT_TYPE)[keyof typeof ENGINE_EVENT_TYPE];

export interface EngineEvent {
  type: EngineEventType;
  payload?: unknown;
}

export type EngineListener = (event: EngineEvent) => void;
