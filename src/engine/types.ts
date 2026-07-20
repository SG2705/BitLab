/**
 * types.ts — Core type definitions for the BitLab simulation engine.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This module defines the foundational types used throughout the engine.
 * It has zero UI or framework dependencies and can be imported anywhere.
 *
 * Type Categories:
 *   • Signal Model: LogicValue enum and SignalValue type alias
 *   • Circuit Model: ComponentInstance, Wire, CircuitSnapshot
 *   • Component Contract: ComponentDefinition, EvaluateResult
 *   • Simulation State: SimulationStatus, SimulationStats, PropagationStats
 *   • Event System: EngineEvent, EngineListener
 *
 * Design Decisions:
 *   • LogicValue is a numeric enum (0-3) for fast truth-table indexing
 *   • ComponentInstance is a plain object (no class) for easy serialization
 *   • Wire connects one output pin to one input pin (fan-out via multiple wires)
 *   • ComponentDefinition.evaluate() is a pure function — no side effects
 *   • State is an opaque Record<string, unknown> — each component owns its shape
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type ENGINE_EVENT_TYPE, type SIMULATION_STATUS } from "./constants";

// ── Four-state logic ─────────────────────────────────────────────────────────
//
// The simulator uses IEEE 1164-inspired four-state logic:
//   ZERO (0)           — Driven low. Definitive logic 0.
//   ONE (1)            — Driven high. Definitive logic 1.
//   UNKNOWN (2)        — Indeterminate. Result of conflicting drivers or X propagation.
//   HIGH_IMPEDANCE (3) — No driver. Tri-state / floating.
//
// Numeric values are chosen so they can directly index into truth tables.

export enum LogicValue {
  ZERO = 0,
  ONE = 1,
  UNKNOWN = 2,
  HIGH_IMPEDANCE = 3,
}

/**
 * A signal on a wire or pin. Alias for LogicValue for semantic clarity.
 * All signal-carrying fields in the engine use this type.
 */
export type SignalValue = LogicValue;

/** Unique identifier for a component instance in the circuit */
export type ComponentId = string;

/** Unique identifier for a wire connection */
export type WireId = string;

// ── Pin reference ────────────────────────────────────────────────────────────

/**
 * Identifies a specific pin on a specific component.
 * Used by Wire.from and Wire.to to define connections.
 */
export interface PinRef {
  /** Component instance ID */
  comp: ComponentId;
  /** Pin index (0-based, relative to the component's input or output array) */
  pin: number;
}

// ── Circuit data model ────────────────────────────────────────────────────────
//
// The circuit is a directed graph where:
//   • Nodes are ComponentInstances (gates, inputs, outputs)
//   • Edges are Wires connecting one output pin to one input pin
//
// Each input pin may have at most one wire connected (single-driver model).
// Each output pin may connect to multiple input pins (fan-out).

/**
 * A component instance placed on the canvas.
 * Contains position, type reference, and live simulation state.
 */
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

/**
 * A directed connection between two pins.
 * Always flows from an output pin (source) to an input pin (sink).
 * The engine enforces: each input pin has at most one incoming wire.
 */
export interface Wire {
  id: WireId;
  /** Source: the output pin driving this wire */
  from: PinRef;
  /** Sink: the input pin receiving the signal */
  to: PinRef;
}

/**
 * Immutable snapshot of the entire circuit state.
 * Used for rendering, serialization, undo/redo, and worker communication.
 */
export interface CircuitSnapshot {
  components: Record<ComponentId, ComponentInstance>;
  wires: Record<WireId, Wire>;
}

// ── Component definition ──────────────────────────────────────────────────────
//
// A ComponentDefinition is a pure description — no mutable state, no side effects.
// It serves as the "class" for component instances. Multiple instances share
// the same definition but have independent state.
//
// Key contract:
//   • evaluate() is pure: same (inputs, state) → same (outputs, newState)
//   • initialState() returns a fresh state object (not shared across instances)
//   • tick() (clock-only) advances time-dependent state

/**
 * The result of evaluating a component.
 * Contains new output signals and optionally updated internal state.
 */
export interface EvaluateResult {
  /** New output signal values (length must equal definition.outputs) */
  outputs: SignalValue[];
  /** Updated internal state, or null if stateless */
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
//
// The simulation has three states: IDLE → RUNNING ↔ PAUSED → IDLE
// Stats accumulate across the lifetime of the engine instance.

/** Current simulation lifecycle state */
export type SimulationStatus =
  (typeof SIMULATION_STATUS)[keyof typeof SIMULATION_STATUS];

/**
 * Aggregate simulation statistics.
 * Queried by the UI to display performance and health information.
 */
export interface SimulationStats {
  /** Current simulation tick (monotonically increasing) */
  tick: number;
  /** Total component evaluations since engine creation */
  eventsProcessed: number;
  /** Number of times oscillation was detected */
  oscillationsDetected: number;
  /** Current engine state */
  status: SimulationStatus;
  /** Simulation clock frequency in Hz */
  clockHz: number;
  /** Propagation metrics from the most recent pass */
  propagation: PropagationStats | null;
  /** Component IDs that have thrown during evaluation (exception isolation) */
  faultedComponents: string[];
  /** Recent evaluation errors for diagnostic display (last 10) */
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
//
// The engine communicates state changes to the UI via a publish-subscribe
// event bus. The CircuitManager aggregates events from both itself and the
// SimulationEngine, providing a single subscription point for the UI layer.

/** String literal type for all engine event kinds */
export type EngineEventType =
  (typeof ENGINE_EVENT_TYPE)[keyof typeof ENGINE_EVENT_TYPE];

/**
 * An event emitted by the engine or circuit manager.
 * Payload shape depends on event type.
 */
export interface EngineEvent {
  type: EngineEventType;
  payload?: unknown;
}

/** Callback signature for engine event listeners */
export type EngineListener = (event: EngineEvent) => void;
