/**
 * Public API for the BitLab simulation engine.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENGINE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The engine is composed of several cooperating modules:
 *
 *   CircuitManager  — Single source of truth for circuit topology and state.
 *                     All mutations (add/remove/move/wire) go through here.
 *                     Supports transactions for batched edits.
 *
 *   SimulationEngine — Orchestrates the clock loop (RAF-based) and triggers
 *                      signal propagation. Provides start/stop/step/reset.
 *                      Includes re-entrant propagation guard and seed batching.
 *
 *   SignalPropagator — Delta-cycle event-driven propagation engine.
 *                      Evaluates dirty components, detects oscillation,
 *                      handles sequential snapshot isolation.
 *
 *   GraphManager    — Directed graph of circuit topology with Kahn's sort.
 *                     Provides O(1) pin-level wire lookups and adjacency queries.
 *
 *   ComponentLibrary — Registry of all component definitions with validation.
 *                      Supports runtime registration of custom circuits.
 *
 *   EventQueue      — Min-heap priority queue (utility, used internally).
 *
 *   ProjectManager  — Persistence layer: save/load/undo/redo.
 *
 * Data Flow:
 *   User input → CircuitManager.setInput() → SimulationEngine.triggerPropagation()
 *   → SignalPropagator.propagate() → delta cycles → stable state → UI render
 *
 * Import from "@/engine" to access the engine in application code.
 * The engine has zero UI framework dependencies.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type {
  SignalValue,
  ComponentId,
  WireId,
  PinRef,
  ComponentInstance,
  Wire,
  CircuitSnapshot,
  EvaluateResult,
  ComponentDefinition,
  SimulationStatus,
  SimulationStats,
  PropagationStats,
  EngineEventType,
  EngineEvent,
  EngineListener,
} from "./types";

export { LogicValue } from "./types";

export {
  fromBool,
  toBool,
  isHigh,
  isLow,
  evalGateAnd,
  evalGateOr,
  evalGateXor,
  evalGateNand,
  evalGateNor,
  evalGateXnor,
  evalGateNot,
  evalGateBuffer,
  resolveSignal,
  resolveBus,
  migrateSignal,
} from "./logic";

export { EventQueue } from "./EventQueue";
export { GraphManager } from "./GraphManager";
export { ComponentLibrary, library } from "./ComponentLibrary";
export type { CustomGateMeta } from "./ComponentLibrary";
export { SignalPropagator } from "./SignalPropagator";
export type { PropagationMetrics, PropagationResult } from "./SignalPropagator";
export type { SimulationEngineOptions } from "./SimulationEngine";
export { SimulationEngine } from "./SimulationEngine";
export type { AddComponentOptions } from "./CircuitManager";
export { CircuitManager } from "./CircuitManager";
export type { SerializedProject } from "./ProjectManager";
export { ProjectManager } from "./ProjectManager";
export { getBroadcasterChannels } from "./ViaService";

// ── Convenience factory ────────────────────────────────────────────────────────

import { CircuitManager } from "./CircuitManager";
import { ProjectManager } from "./ProjectManager";

export interface DigitalEngineInstance {
  manager: CircuitManager;
  project: ProjectManager;
}

/**
 * Create a ready-to-use engine pair.
 *
 * @example
 * const { manager, project } = createEngine();
 * manager.addComponent("AND", { x: 100, y: 100 });
 * manager.startSimulation();
 */
export function createEngine(): DigitalEngineInstance {
  const manager = new CircuitManager();
  const project = new ProjectManager(manager);

  return { manager, project };
}
