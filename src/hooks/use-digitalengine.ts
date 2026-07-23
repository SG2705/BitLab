/**
 * useDigitalEngine — React adapter for the BitLab simulation engine.
 *
 * Creates and manages a single engine instance for the lifetime of the
 * component tree. Returns a stable interface that App.tsx can consume without
 * knowing about the engine internals.
 *
 * The hook is the ONLY file in the codebase that has a React dependency.
 * Everything under src/engine/ remains framework-agnostic.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  CircuitSnapshot,
  ComponentInstance,
  SimulationStats,
  SimulationStatus,
  Wire,
} from "@/engine";
import { createEngine } from "@/engine";
import { ENGINE_EVENT_TYPE, SIMULATION_STATUS } from "@/engine/constants";
import { DEFAULT_CLOCK, EMPTY_SNAPSHOT } from "@/lib/constants";

export interface DigitalEngineControls {
  // ── Read-only state ──────────────────────────────────────────────────────
  snapshot: CircuitSnapshot;
  status: SimulationStatus;
  stats: SimulationStats;
  canUndo: boolean;
  canRedo: boolean;

  // ── Simulation controls ──────────────────────────────────────────────────
  start: () => void;
  pause: () => void;
  stop: () => void;
  step: () => void;
  reset: () => void;
  setClockHz: (hz: number) => void;

  // ── Component mutations ──────────────────────────────────────────────────
  addComponent: (type: string, x: number, y: number) => ComponentInstance;
  removeComponent: (id: string) => void;
  removeComponents: (ids: string[]) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  /** Move multiple components by an offset (for group drag) */
  moveComponents: (ids: string[], dx: number, dy: number) => void;
  /** Commit the current positions to undo history (call on mouse-up) */
  commitMove: () => void;
  updateComponent: (id: string, patch: Partial<ComponentInstance>) => void;
  /** Toggle or set a user-input component's state */
  setInput: (id: string, stateUpdate: Record<string, unknown>) => void;
  duplicateComponents: (ids: string[]) => Map<string, string>;

  // ── Wire mutations ───────────────────────────────────────────────────────
  addWire: (
    fromComp: string,
    fromPin: number,
    toComp: string,
    toPin: number,
  ) => Wire | null;
  /** Raw addWire without pushing history — caller manages undo entry */
  addWireRaw: (
    fromComp: string,
    fromPin: number,
    toComp: string,
    toPin: number,
  ) => Wire | null;
  removeWire: (id: string) => void;
  removeWires: (ids: string[]) => void;
  /** Raw removeWires without pushing history — caller manages undo entry */
  removeWiresRaw: (ids: string[]) => void;
  /** Raw removeComponents without pushing history — caller manages undo entry */
  removeComponentsRaw: (ids: string[]) => void;

  // ── Project / history ────────────────────────────────────────────────────
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  newProject: () => void;
  exportJSON: () => void;
  importJSON: () => Promise<boolean>;
  getProjectName: () => string;
  saveProjectToLocal: () => void;
  loadProjectFromLocal: () => void;
}

/**
 * useDigitalEngine
 */
export function useDigitalEngine(
  clockHz = DEFAULT_CLOCK,
): DigitalEngineControls {
  const engineRef = useRef(createEngine());
  const { manager, project } = engineRef.current;

  const [snapshot, setSnapshot] = useState<CircuitSnapshot>(EMPTY_SNAPSHOT);
  const [status, setStatus] = useState<SimulationStatus>(
    SIMULATION_STATUS.IDLE,
  );
  const [stats, setStats] = useState<SimulationStats>(() =>
    manager.getSimulationStats(),
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ── Subscribe to engine events ────────────────────────────────────────────

  useEffect(() => {
    const unsub = manager.on((event) => {
      if (event.type === ENGINE_EVENT_TYPE.SNAPSHOT_CHANGED) {
        setSnapshot(manager.getSnapshot());
        setStats(manager.getSimulationStats());
        setStatus(manager.getSimulationStatus());
        setCanUndo(project.canUndo());
        setCanRedo(project.canRedo());
      } else if (
        event.type === ENGINE_EVENT_TYPE.STARTED ||
        event.type === ENGINE_EVENT_TYPE.PAUSED
      ) {
        setStatus(manager.getSimulationStatus());
      }
    });

    return unsub;
  }, [manager, project]);

  // ── Sync clock speed ──────────────────────────────────────────────────────

  useEffect(() => {
    manager.setClockHz(clockHz);
  }, [clockHz, manager]);

  // ── History helper ────────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    project.push();

    setCanUndo(project.canUndo());
    setCanRedo(project.canRedo());
  }, [project]);

  // ── Controls ──────────────────────────────────────────────────────────────

  const start = useCallback(() => manager.startSimulation(), [manager]);
  const pause = useCallback(() => manager.pauseSimulation(), [manager]);
  const stop = useCallback(() => manager.stopSimulation(), [manager]);

  const step = useCallback(() => {
    manager.stepSimulation();

    setSnapshot(manager.getSnapshot());
    setStats(manager.getSimulationStats());
  }, [manager]);

  const reset = useCallback(() => {
    manager.resetSimulation();

    pushHistory();
  }, [manager, pushHistory]);

  const setClockHz = useCallback(
    (hz: number) => manager.setClockHz(hz),
    [manager],
  );

  // ── Component ops ─────────────────────────────────────────────────────────

  const addComponent = useCallback(
    (type: string, x: number, y: number): ComponentInstance => {
      const comp = manager.addComponent(type, { x, y });

      pushHistory();

      return comp;
    },
    [manager, pushHistory],
  );

  const removeComponent = useCallback(
    (id: string) => {
      manager.removeComponent(id);

      pushHistory();
    },
    [manager, pushHistory],
  );

  const removeComponents = useCallback(
    (ids: string[]) => {
      manager.removeComponents(ids);

      pushHistory();
    },
    [manager, pushHistory],
  );

  const moveComponent = useCallback(
    (id: string, x: number, y: number) => {
      manager.moveComponent(id, x, y);
      // No history push — caller should call commitMove() on mouse-up
    },
    [manager],
  );

  const moveComponents = useCallback(
    (ids: string[], dx: number, dy: number) => {
      manager.moveComponents(ids, dx, dy);
    },
    [manager],
  );

  const commitMove = useCallback(() => pushHistory(), [pushHistory]);

  const updateComponent = useCallback(
    (id: string, patch: Partial<ComponentInstance>) => {
      manager.updateComponent(id, patch);

      pushHistory();
    },
    [manager, pushHistory],
  );

  const setInput = useCallback(
    (id: string, stateUpdate: Record<string, unknown>) => {
      manager.setInput(id, stateUpdate);
      // Input changes are not added to undo history (frequent, expected)
    },
    [manager],
  );

  const duplicateComponents = useCallback(
    (ids: string[]): Map<string, string> => {
      const idMap = new Map<string, string>();

      for (const id of ids) {
        const src = manager.getComponent(id);

        if (!src) continue;

        const comp = manager.addComponent(src.type, {
          x: src.x + 20,
          y: src.y + 20,
          label: src.label,
          color: src.color,
          rotation: src.rotation,
          properties: src.properties,
        });

        idMap.set(id, comp.id);
      }

      pushHistory();

      return idMap;
    },
    [manager, pushHistory],
  );

  // ── Wire ops ──────────────────────────────────────────────────────────────

  const addWire = useCallback(
    (fromComp: string, fromPin: number, toComp: string, toPin: number) => {
      const wire = manager.addWire(fromComp, fromPin, toComp, toPin);

      if (wire) pushHistory();

      return wire;
    },
    [manager, pushHistory],
  );

  const addWireRaw = useCallback(
    (fromComp: string, fromPin: number, toComp: string, toPin: number) => {
      return manager.addWire(fromComp, fromPin, toComp, toPin);
    },
    [manager],
  );

  const removeWire = useCallback(
    (id: string) => {
      manager.removeWire(id);

      pushHistory();
    },
    [manager, pushHistory],
  );

  const removeWires = useCallback(
    (ids: string[]) => {
      manager.removeWires(ids);

      pushHistory();
    },
    [manager, pushHistory],
  );

  /** Raw removeWires without pushing history — caller manages undo entry */
  const removeWiresRaw = useCallback(
    (ids: string[]) => {
      manager.removeWires(ids);
    },
    [manager],
  );

  /** Raw removeComponents without pushing history — caller manages undo entry */
  const removeComponentsRaw = useCallback(
    (ids: string[]) => {
      manager.removeComponents(ids);
    },
    [manager],
  );

  // ── Project ops ───────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    project.undo();

    setCanUndo(project.canUndo());
    setCanRedo(project.canRedo());
  }, [project]);

  const redo = useCallback(() => {
    project.redo();

    setCanUndo(project.canUndo());
    setCanRedo(project.canRedo());
  }, [project]);

  const newProject = useCallback(() => {
    project.newProject();

    setCanUndo(false);
    setCanRedo(false);
  }, [project]);

  const saveProjectToLocal = useCallback(() => {
    project.saveToLocalStorage();
  }, [project]);

  const loadProjectFromLocal = useCallback(() => {
    project.loadFromLocalStorage();

    setCanUndo(project.canUndo());
    setCanRedo(project.canRedo());
  }, [project]);

  const exportJSON = useCallback(() => {
    project.downloadJSON();
  }, [project]);

  const importJSON = useCallback(
    async () => project.importFromFile(),
    [project],
  );

  const getProjectName = useCallback(() => project.getProjectName(), [project]);

  return {
    snapshot,
    status,
    stats,
    canUndo,
    canRedo,
    start,
    pause,
    stop,
    step,
    reset,
    setClockHz,
    addComponent,
    removeComponent,
    removeComponents,
    moveComponent,
    moveComponents,
    commitMove,
    updateComponent,
    setInput,
    duplicateComponents,
    addWire,
    addWireRaw,
    removeWire,
    removeWires,
    removeWiresRaw,
    removeComponentsRaw,
    pushHistory,
    undo,
    redo,
    newProject,
    exportJSON,
    importJSON,
    getProjectName,
    saveProjectToLocal,
    loadProjectFromLocal,
  };
}

export default useDigitalEngine;
