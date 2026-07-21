/**
 * UI Store — centralizes UI state that was previously prop-drilled from App.tsx.
 *
 * Components can subscribe to individual slices instead of receiving 20+ props
 * from the parent. This eliminates re-renders in siblings when unrelated state changes.
 */

import { create } from "zustand";

import type { CircuitSnapshot } from "@/engine";
import { CONSOLE_TAB, TOOL, WIRE_TYPE } from "@/lib/constants";
import type { ConsoleTab, LogEntry, Tool, WireType } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface UIState {
  // ── Selection ────────────────────────────────────────────────────────────
  selection: Set<string>;
  selWires: Set<string>;

  // ── UI panels ────────────────────────────────────────────────────────────
  tool: Tool;
  wireStyle: WireType;
  snapEnabled: boolean;
  cmdOpen: boolean;
  settingsOpen: boolean;
  docsOpen: boolean;
  showObstacleMap: boolean;
  showMinimap: boolean;

  // ── Logs ─────────────────────────────────────────────────────────────────
  consoleTab: ConsoleTab;
  logs: LogEntry[];

  // ── Circuit viewer ───────────────────────────────────────────────────────
  viewingCircuit: { name: string; circuit: CircuitSnapshot } | null;
}

export interface UIActions {
  // ── Selection actions ────────────────────────────────────────────────────
  setSelection: (sel: Set<string>) => void;
  setSelWires: (sel: Set<string>) => void;
  toggleSelection: (id: string) => void;
  toggleWireSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (compIds: string[], wireIds: string[]) => void;

  // ── UI panel actions ─────────────────────────────────────────────────────
  setTool: (tool: Tool) => void;
  setWireStyle: (style: WireType) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setCmdOpen: (open: boolean) => void;
  toggleCmdOpen: () => void;
  setSettingsOpen: (open: boolean) => void;
  setDocsOpen: (open: boolean) => void;
  setShowObstacleMap: (show: boolean) => void;
  toggleObstacleMap: () => void;

  // ── Log actions ──────────────────────────────────────────────────────────
  setConsoleTab: (tab: ConsoleTab) => void;
  addLog: (kind: ConsoleTab, msg: string) => void;

  // ── Circuit viewer ───────────────────────────────────────────────────────
  setViewingCircuit: (
    circuit: { name: string; circuit: CircuitSnapshot } | null,
  ) => void;
}

export type UIStore = UIState & UIActions;

// ── Store ────────────────────────────────────────────────────────────────────

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  selection: new Set(),
  selWires: new Set(),
  tool: TOOL.SELECT,
  wireStyle: WIRE_TYPE.BEZIER,
  snapEnabled: true,
  cmdOpen: false,
  settingsOpen: false,
  docsOpen: false,
  showObstacleMap: false,
  showMinimap: true,
  consoleTab: CONSOLE_TAB.LOG,
  logs: [
    {
      t: Date.now(),
      kind: CONSOLE_TAB.LOG,
      msg: "BitLab ready. Drag components from the toolbox to get started.",
    },
  ],
  viewingCircuit: null,

  // Selection actions
  setSelection: (sel) => set({ selection: sel }),
  setSelWires: (sel) => set({ selWires: sel }),
  toggleSelection: (id) =>
    set((s) => {
      const n = new Set(s.selection);

      if (n.has(id)) n.delete(id);
      else n.add(id);

      return { selection: n };
    }),
  toggleWireSelection: (id) =>
    set((s) => {
      const n = new Set(s.selWires);

      if (n.has(id)) n.delete(id);
      else n.add(id);

      return { selWires: n };
    }),
  clearSelection: () => set({ selection: new Set(), selWires: new Set() }),
  selectAll: (compIds, wireIds) =>
    set({ selection: new Set(compIds), selWires: new Set(wireIds) }),

  // UI panel actions
  setTool: (tool) => set({ tool }),
  setWireStyle: (wireStyle) => set({ wireStyle }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setCmdOpen: (cmdOpen) => set({ cmdOpen }),
  toggleCmdOpen: () => set((s) => ({ cmdOpen: !s.cmdOpen })),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setDocsOpen: (docsOpen) => set({ docsOpen }),
  setShowObstacleMap: (showObstacleMap) => set({ showObstacleMap }),
  toggleObstacleMap: () =>
    set((s) => ({ showObstacleMap: !s.showObstacleMap })),

  // Log actions
  setConsoleTab: (consoleTab) => set({ consoleTab }),
  addLog: (kind, msg) =>
    set((s) => ({ logs: [...s.logs, { t: Date.now(), kind, msg }] })),

  // Circuit viewer
  setViewingCircuit: (viewingCircuit) => set({ viewingCircuit }),
}));

// ── Selector hooks for common patterns ───────────────────────────────────────

/** Subscribe to selection state only */
export const useSelection = () =>
  useUIStore((s) => ({
    selection: s.selection,
    selWires: s.selWires,
  }));

/** Subscribe to tool/canvas settings only */
export const useCanvasSettings = () =>
  useUIStore((s) => ({
    tool: s.tool,
    wireStyle: s.wireStyle,
    snapEnabled: s.snapEnabled,
  }));
