/**
 * Public API for the BitLab simulation engine.
 *
 * Import from "@/engine" to access the engine in application code.
 * The engine has zero UI framework dependencies.
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
  EngineEventType,
  EngineEvent,
  EngineListener,
} from "./types";

export { EventQueue } from "./EventQueue";
export { GraphManager } from "./GraphManager";
export { ComponentLibrary, library } from "./ComponentLibrary";
export type { CustomGateMeta } from "./ComponentLibrary";
export { SignalPropagator } from "./SignalPropagator";
export type { SimulationEngineOptions } from "./SimulationEngine";
export { SimulationEngine } from "./SimulationEngine";
export type { AddComponentOptions } from "./CircuitManager";
export { CircuitManager } from "./CircuitManager";
export type { SerializedProject } from "./ProjectManager";
export { ProjectManager } from "./ProjectManager";

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
