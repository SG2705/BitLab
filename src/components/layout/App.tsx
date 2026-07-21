import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIntl } from "react-intl";

import {
  BusWirePath,
  EmptyCanvas,
  ErrorBoundary,
  GateNode,
  RightClickMenu,
  WirePath,
} from "@/components/ui";
import type { ComponentInstance, SignalValue } from "@/engine";
import { library, LogicValue } from "@/engine";
import {
  GATE_TYPE_BUS_INPUT4,
  GATE_TYPE_BUS_INPUT8,
  GATE_TYPE_BUS_INPUT16,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_TOGGLE,
  SIMULATION_STATUS,
} from "@/engine/constants";
import {
  useCanvasInteraction,
  useClipboard,
  useCustomCircuits,
  useDigitalEngine,
  useKeyboardShortcuts,
  useViewportCulling,
  useWireDrawing,
} from "@/hooks";
import {
  busPortPos,
  computeBusWireGroups,
  pinDirection,
  pinPos,
} from "@/lib/circuit";
import {
  CONSOLE_TAB,
  DEFAULT_CLOCK,
  PIN_KIND,
  SAVE_LOCAL_ON_ACTION,
  TOOL,
  WIRE_TYPE,
} from "@/lib/constants";
import { type PinKind } from "@/lib/types";
import { cn, getGateLabel, snap } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { useUIStore } from "@/stores/ui-store";
import {
  type CachedRoute,
  type ObstacleMap,
  WireRouter,
  WireRouterClient,
} from "@/wirerouter";

import BottomBar from "./BottomBar";
import CanvasToolbar from "./CanvasToolbar";
import CategoryPanel from "./CategoryPanel";
import ConsolePanel from "./ConsolePanel";
import ExplorerPanel from "./ExplorerPanel";
import GateProperties from "./GateProperties";
import GridBackground from "./GridBackground";
import Minimap from "./Minimap";
import ObstacleMapInfo from "./ObstacleMapInfo";
import ObstacleMapOverlay from "./ObstacleMapOverlay";
import TopBar from "./TopBar";
import WireProperties from "./WireProperties";

// Lazy-loaded components (only rendered on-demand behind conditional guards)
const CircuitViewer = lazy(() => import("./CircuitViewer"));
const CommandPalette = lazy(() => import("./CommandPalette"));
const DocsPanel = lazy(() => import("./DocsPanel"));
const SettingsPanel = lazy(() => import("./SettingsPanel"));

/**
 * DigitalGateApp — main application shell.
 *
 * Orchestrates the simulation engine, canvas interaction hooks,
 * wire drawing, keyboard shortcuts, clipboard, and custom circuits.
 */
function DigitalGateApp() {
  const intl = useIntl();

  // ── Store state (no more prop drilling for these) ───────────────────────────
  const {
    selection,
    selWires,
    tool,
    wireStyle,
    snapEnabled,
    cmdOpen,
    settingsOpen,
    docsOpen,
    showObstacleMap,
    showMinimap,
    consoleTab,
    logs,
    viewingCircuit,
    setSelection,
    setSelWires,
    clearSelection,
    selectAll,
    setTool,
    setWireStyle,
    setSnapEnabled,
    setCmdOpen,
    toggleCmdOpen,
    setSettingsOpen,
    setDocsOpen,
    toggleObstacleMap,
    setConsoleTab,
    addLog,
    setViewingCircuit,
  } = useUIStore();

  // ── Core engine state ───────────────────────────────────────────────────────
  const [clockSpeed, setClockSpeed] = useState(DEFAULT_CLOCK);

  const {
    snapshot,
    status,
    stats,
    canUndo,
    canRedo,
    addComponent,
    moveComponents,
    commitMove,
    addWire,
    addWireRaw,
    removeWires,
    removeComponents,
    updateComponent,
    duplicateComponents,
    setInput,
    undo,
    redo,
    pause,
    start,
    step,
    reset,
    pushHistory,
    exportJSON,
    importJSON,
    newProject,
    saveProjectToLocal,
    loadProjectFromLocal,
  } = useDigitalEngine(clockSpeed);
  const {
    view,
    setView,
    size,
    panning,
    lasso,
    canvasRef,
    svgRef,
    toWorld,
    onCanvasMouseDown: canvasMouseDown,
    onCanvasMouseMove: canvasMouseMove,
    onCanvasMouseUp: canvasMouseUp,
    fitToScreen: fitToScreenRaw,
  } = useCanvasInteraction();
  const {
    pendingWire,
    setPendingWire,
    autoConnectPreview,
    startWire,
    finishWire,
  } = useWireDrawing();
  const clipboard = useClipboard();
  const {
    customBump,
    createCircuitFromGates,
    importCustomCircuitFromFile: importCustomRaw,
    removeCustomCircuit: removeCustomRaw,
  } = useCustomCircuits(addLog);
  const visibleComponents = useViewportCulling(snapshot, view, size);

  const isRunning = status === SIMULATION_STATUS.RUNNING;
  const { tick } = stats;

  // ── Local UI state (not shared with children) ───────────────────────────────
  const [obstacleMapVersion, setObstacleMapVersion] = useState(0);
  const [routedWires, setRoutedWires] = useState<Map<string, CachedRoute>>(
    new Map(),
  );
  const [isRouting, setIsRouting] = useState(false);
  const [rerouteTrigger, setRerouteTrigger] = useState(0);
  const [dragType, setDragType] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    compId: string;
  } | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  // Singletons: worker and router are created once at module level
  const wireRouter = WireRouter.getInstance();
  const wireRouterClient = WireRouterClient.getInstance();
  const obstacleMapRef = useRef<ObstacleMap>(wireRouter.getObstacleMap());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCompRef = useRef<{
    id: string;
    ox: number;
    oy: number;
    moved: boolean;
    routesInvalidated: boolean;
  } | null>(null);

  // Utils
  const fitToScreen = useCallback(
    () => fitToScreenRaw(snapshot),
    [fitToScreenRaw, snapshot],
  );

  // No cleanup needed — singletons persist across mounts

  // Rebuild obstacle map on snapshot change (cheap, for visualization)
  useEffect(() => {
    wireRouter.rebuild(snapshot);
    obstacleMapRef.current = wireRouter.getObstacleMap();

    if (showObstacleMap) {
      setObstacleMapVersion((v) => v + 1);
    }
  }, [snapshot, showObstacleMap, wireRouter]);

  // Stable key that only changes when wires are added/removed (not on signal changes)
  const wireKey = useMemo(
    () => Object.keys(snapshot.wires).sort().join(","),
    [snapshot.wires],
  );

  // Handle wire routing for optimized mode
  useEffect(() => {
    if (wireStyle !== WIRE_TYPE.OPTIMIZED) return undefined;

    // Auto-reroute all wires via worker (triggered by rerouteTrigger after drag,
    // or wireStyle change to optimized)
    let cancelled = false;

    setIsRouting(true);

    // Safety timeout: if the worker doesn't respond within 10s, stop waiting
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setIsRouting(false);
      }
    }, 10000);

    wireRouterClient
      .rebuildAndRouteAll(snapshot)
      .then((routes) => {
        if (!cancelled) {
          clearTimeout(timeout);
          setRoutedWires(routes);
          setIsRouting(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeout);
          setIsRouting(false);
        }
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wireStyle, rerouteTrigger, wireKey]);

  // ── Load project ────────────────────────────────────────────────────────────
  const handleLoadProject = useCallback(() => {
    loadProjectFromLocal();

    setTimeout(() => {
      for (const comp of Object.values(snapshot.components)) {
        if (
          library.isCustom(comp.type) &&
          !library.hasValidDependencies(comp.type)
        ) {
          addLog(
            CONSOLE_TAB.ERROR,
            `Component "${comp.label ?? comp.type}" on canvas has missing dependencies and will not simulate correctly.`,
          );
        }
      }
    }, 0);
  }, [loadProjectFromLocal, snapshot, addLog]);

  // ── Selection operations ────────────────────────────────────────────────────
  const deleteSelected = useCallback(() => {
    // Obstacle map mode is view-only
    if (showObstacleMap) return;

    // Filter out pinned components from deletion
    const deletableComps = Array.from(selection).filter(
      (id) => !snapshot.components[id]?.pinned,
    );

    const wireIds = new Set<string>();

    for (const w of Object.values(snapshot.wires)) {
      if (
        selWires.has(w.id) ||
        deletableComps.includes(w.from.comp) ||
        deletableComps.includes(w.to.comp)
      )
        wireIds.add(w.id);
    }

    removeWires(Array.from(wireIds));
    removeComponents(deletableComps);

    clearSelection();
  }, [
    selection,
    selWires,
    snapshot.wires,
    snapshot.components,
    removeComponents,
    removeWires,
    clearSelection,
    showObstacleMap,
  ]);

  const duplicateSelected = useCallback(() => {
    const idMap = duplicateComponents(Array.from(selection));

    setSelection(new Set(idMap.values()));
  }, [duplicateComponents, selection, setSelection]);

  const rotateSelected = useCallback(() => {
    for (const id of selection) {
      const comp = snapshot.components[id];

      if (!comp) continue;

      const current = comp.rotation ?? 0;
      const next = ((current + 90) % 360) as 0 | 90 | 180 | 270;

      updateComponent(id, { rotation: next });
    }

    // Trigger rerouting after rotation
    if (wireStyle === WIRE_TYPE.OPTIMIZED && selection.size > 0) {
      setRerouteTrigger((v) => v + 1);
    }
  }, [selection, snapshot.components, updateComponent, wireStyle]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  const undoWithReroute = useCallback(() => {
    // Clear all routes so wires fall back to ortho while worker reroutes
    if (wireStyle === WIRE_TYPE.OPTIMIZED) setRoutedWires(new Map());
    undo();
    if (wireStyle === WIRE_TYPE.OPTIMIZED) setRerouteTrigger((v) => v + 1);
  }, [undo, wireStyle]);

  const redoWithReroute = useCallback(() => {
    if (wireStyle === WIRE_TYPE.OPTIMIZED) setRoutedWires(new Map());
    redo();
    if (wireStyle === WIRE_TYPE.OPTIMIZED) setRerouteTrigger((v) => v + 1);
  }, [redo, wireStyle]);

  useKeyboardShortcuts({
    deleteSelected,
    undo: undoWithReroute,
    redo: redoWithReroute,
    duplicateSelected,
    saveProjectToLocal,
    toggleCmdOpen,
    clearSelection,
    selectionSize: selection.size,
    selectAll: useCallback(() => {
      selectAll(Object.keys(snapshot.components), Object.keys(snapshot.wires));
    }, [snapshot.components, snapshot.wires, selectAll]),
    copySelection: useCallback(() => {
      clipboard.copySelection(Array.from(selection));
    }, [clipboard, selection]),
    pasteClipboard: useCallback(() => {
      const idMap = clipboard.pasteClipboard(duplicateComponents);

      if (idMap) {
        setSelection(new Set(idMap.values()));
        setSelWires(new Set());
      }
    }, [clipboard, duplicateComponents, setSelection, setSelWires]),
  });

  // ── Component interaction ───────────────────────────────────────────────────
  const handleCompClick = useCallback(
    (c: ComponentInstance) => {
      // Obstacle map mode is view-only
      if (showObstacleMap) return;

      if (c.type === GATE_TYPE_TOGGLE || c.type === GATE_TYPE_CONST)
        setInput(c.id, { on: !c.state?.on });
      if (c.type === GATE_TYPE_DIGIT_BIN)
        setInput(c.id, {
          digit: (((c.state?.digit as number) ?? -1) + 1) % 10,
        });

      if (
        c.type === GATE_TYPE_BUS_INPUT4 ||
        c.type === GATE_TYPE_BUS_INPUT8 ||
        c.type === GATE_TYPE_BUS_INPUT16
      ) {
        const current = (c.state?.signal as number) ?? LogicValue.ZERO;
        const order = [
          LogicValue.ZERO,
          LogicValue.ONE,
          LogicValue.UNKNOWN,
          LogicValue.HIGH_IMPEDANCE,
        ];
        const idx = order.indexOf(current);
        const next = order[(idx + 1) % order.length];

        setInput(c.id, { signal: next });
      }
    },
    [setInput, showObstacleMap],
  );

  const startCompDrag = useCallback(
    (e: React.MouseEvent, c: ComponentInstance) => {
      e.stopPropagation();

      // Obstacle map mode is view-only — no interactions allowed
      if (showObstacleMap) return;

      // If a wire is being drawn, don't initiate component drag
      if (pendingWire) return;

      const multiSelect = e.metaKey || e.ctrlKey;

      if (multiSelect) {
        const n = new Set(selection);

        if (n.has(c.id)) n.delete(c.id);
        else n.add(c.id);

        setSelection(n);
      } else if (!selection.has(c.id)) {
        setSelection(new Set([c.id]));
        setSelWires(new Set());
      }

      const p = toWorld(e.clientX, e.clientY);

      // Pinned components can be selected but not dragged
      if (c.pinned) return;

      dragCompRef.current = {
        id: c.id,
        ox: p.x - c.x,
        oy: p.y - c.y,
        moved: false,
        routesInvalidated: false,
      };
    },
    [
      selection,
      toWorld,
      pendingWire,
      showObstacleMap,
      setSelection,
      setSelWires,
    ],
  );

  // ── Context menu handlers ───────────────────────────────────────────────────
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, compId: string) => {
      e.preventDefault();
      e.stopPropagation();

      if (showObstacleMap) return;

      setCtxMenu({ x: e.clientX, y: e.clientY, compId });
    },
    [showObstacleMap],
  );

  const handleCtxPin = useCallback(() => {
    if (!ctxMenu) return;

    const comp = snapshot.components[ctxMenu.compId];

    if (comp) {
      updateComponent(ctxMenu.compId, { pinned: !comp.pinned });
    }
  }, [ctxMenu, snapshot.components, updateComponent]);

  const handleCtxReplace = useCallback(
    (newType: string) => {
      if (!ctxMenu) return;

      const oldComp = snapshot.components[ctxMenu.compId];

      if (!oldComp || !library.has(newType)) return;

      // 1. Collect all wires connected to this component
      const connectedWires = Object.values(snapshot.wires).filter(
        (w) => w.from.comp === ctxMenu.compId || w.to.comp === ctxMenu.compId,
      );

      // 2. Remove the old component and its wires
      const wireIds = connectedWires.map((w) => w.id);

      removeWires(wireIds);
      removeComponents([ctxMenu.compId]);

      // 3. Add a new component of the replacement type at the same position
      const newComp = addComponent(newType, oldComp.x, oldComp.y);

      // 4. Reconnect all wires, substituting the old comp ID with the new one
      for (const w of connectedWires) {
        const fromComp =
          w.from.comp === ctxMenu.compId ? newComp.id : w.from.comp;
        const fromPin = w.from.pin;
        const toComp = w.to.comp === ctxMenu.compId ? newComp.id : w.to.comp;
        const toPin = w.to.pin;

        addWire(fromComp, fromPin, toComp, toPin);
      }

      // Select the new component
      setSelection(new Set([newComp.id]));
    },
    [
      ctxMenu,
      snapshot.components,
      snapshot.wires,
      removeWires,
      removeComponents,
      addComponent,
      addWire,
      setSelection,
    ],
  );

  const handleCtxDuplicate = useCallback(() => {
    if (!ctxMenu) return;

    const idMap = duplicateComponents([ctxMenu.compId]);

    setSelection(new Set(idMap.values()));
  }, [ctxMenu, duplicateComponents, setSelection]);

  const handleCtxDelete = useCallback(() => {
    if (!ctxMenu) return;

    const wireIds: string[] = [];

    for (const w of Object.values(snapshot.wires)) {
      if (w.from.comp === ctxMenu.compId || w.to.comp === ctxMenu.compId) {
        wireIds.push(w.id);
      }
    }

    removeWires(wireIds);
    removeComponents([ctxMenu.compId]);
    clearSelection();
  }, [ctxMenu, snapshot.wires, removeWires, removeComponents, clearSelection]);

  // ── Canvas drop ─────────────────────────────────────────────────────────────
  const onCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      // Obstacle map mode is view-only — no drops allowed
      if (showObstacleMap) return;

      const type = e.dataTransfer.getData("text/gate") || dragType;

      if (!type || !library.has(type)) return;

      if (library.isCustom(type) && !library.hasValidDependencies(type)) {
        const meta = library.getCustomMeta(type);

        if (meta) {
          library.registerCustomCircuit(meta.name, meta.circuit, type);
        }

        if (!library.hasValidDependencies(type)) {
          addLog(
            CONSOLE_TAB.ERROR,
            `Cannot add "${getGateLabel(type, library.get(type).label)}": missing dependency. Re-import the required sub-circuit first.`,
          );
          setDragType(null);

          return;
        }
      }

      const def = library.get(type);
      const { x, y } = toWorld(e.clientX, e.clientY);
      const nx = snap(x - def.width / 2);
      const ny = snap(y - def.height / 2);
      const comp = addComponent(type, nx, ny);

      // Select the newly dropped component, clear previous selection
      setSelection(new Set([comp.id]));
      setSelWires(new Set());

      addLog(
        CONSOLE_TAB.LOG,
        `Added ${getGateLabel(def.type, def.label)} (${comp.id})`,
      );

      if (SAVE_LOCAL_ON_ACTION) saveProjectToLocal();

      setDragType(null);
    },
    [
      dragType,
      toWorld,
      addComponent,
      addLog,
      saveProjectToLocal,
      showObstacleMap,
      setSelection,
      setSelWires,
    ],
  );

  // ── Canvas mouse handlers (wrappers around the hook) ────────────────────────
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // In obstacle map mode, only allow panning
      if (showObstacleMap) {
        canvasMouseDown(e, TOOL.PAN);

        return;
      }

      canvasMouseDown(e, tool);

      if (
        e.target === svgRef.current ||
        (e.target as SVGElement).classList?.contains("bg-hit")
      ) {
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          clearSelection();
        }
      }
    },
    [canvasMouseDown, tool, svgRef, clearSelection, showObstacleMap],
  );

  const onCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      canvasMouseMove(e, {
        onDragComp: dragCompRef.current
          ? () => {
              const drag = dragCompRef.current;

              if (!drag) return;

              const { id, ox, oy } = drag;
              const p = toWorld(e.clientX, e.clientY);
              const nx = snap(p.x - ox);
              const ny = snap(p.y - oy);

              drag.moved = true;

              const cur = snapshot.components[id];

              if (!cur) return;

              const dx = nx - cur.x;
              const dy = ny - cur.y;
              const ids = selection.has(id) ? Array.from(selection) : [id];

              moveComponents(ids, dx, dy);

              // Invalidate cached routes for affected wires once per drag
              if (
                wireStyle === WIRE_TYPE.OPTIMIZED &&
                !drag.routesInvalidated
              ) {
                drag.routesInvalidated = true;
                const idsSet = new Set(ids);

                setRoutedWires((prev) => {
                  const updated = new Map(prev);

                  for (const wire of Object.values(snapshot.wires)) {
                    if (
                      idsSet.has(wire.from.comp) ||
                      idsSet.has(wire.to.comp)
                    ) {
                      updated.delete(wire.id);
                    }
                  }

                  return updated;
                });
              }
            }
          : undefined,
        onPendingWire: pendingWire
          ? (wx: number, wy: number) => {
              setPendingWire({ ...pendingWire, mx: wx, my: wy });
            }
          : undefined,
      });
    },
    [
      canvasMouseMove,
      toWorld,
      snapshot.components,
      snapshot.wires,
      selection,
      moveComponents,
      pendingWire,
      setPendingWire,
      wireStyle,
    ],
  );

  const onCanvasMouseUp = useCallback(() => {
    const wasDragging = dragCompRef.current?.moved;

    if (wasDragging) commitMove();

    dragCompRef.current = null;

    const lassoSelection = canvasMouseUp(snapshot);

    if (lassoSelection) {
      setSelection(lassoSelection);
    }

    if (pendingWire) setPendingWire(null);

    // After drag ends, bump the reroute trigger so the effect fires
    if (wasDragging && wireStyle === WIRE_TYPE.OPTIMIZED) {
      setRerouteTrigger((v) => v + 1);
    }
  }, [
    canvasMouseUp,
    snapshot,
    commitMove,
    pendingWire,
    setPendingWire,
    setSelection,
    wireStyle,
  ]);

  // ── Custom circuit wrappers ─────────────────────────────────────────────────
  const handleCreateCircuit = useCallback(
    () => createCircuitFromGates(snapshot, addLog),
    [createCircuitFromGates, snapshot, addLog],
  );

  const handleImportCircuit = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => importCustomRaw(e, addLog),
    [importCustomRaw, addLog],
  );

  const handleRemoveCustom = useCallback(
    (type: string) => removeCustomRaw(type, addLog),
    [removeCustomRaw, addLog],
  );

  // ── Memos ───────────────────────────────────────────────────────────────────
  const busWireGroups = useMemo(
    () => computeBusWireGroups(snapshot),
    [snapshot],
  );

  const busWireIdSet = useMemo(() => {
    const s = new Set<string>();

    for (const group of busWireGroups) {
      for (const id of group.wireIds) s.add(id);
    }

    return s;
  }, [busWireGroups]);

  const selectedComp = useMemo(
    () =>
      selection.size === 1
        ? snapshot.components[Array.from(selection)[0]]
        : null,
    [selection, snapshot.components],
  );

  const selectedWireData = useMemo(() => {
    if (selWires.size !== 1 || selection.size > 0) return null;

    const wireId = Array.from(selWires)[0];
    const wire = snapshot.wires[wireId];

    if (!wire) return null;

    const fromComp = snapshot.components[wire.from.comp];
    const toComp = snapshot.components[wire.to.comp];

    if (!fromComp || !toComp) return null;

    return { wire, fromComp, toComp };
  }, [selWires, selection, snapshot.wires, snapshot.components]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col text-foreground bg-background overflow-hidden font-display">
      {/* Hidden file input for importing circuits as gates */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.bitlab.json,.circuit.json,.dgate.json"
        className="hidden"
        onChange={handleImportCircuit}
      />

      {/* Header */}
      <TopBar
        isRunning={isRunning}
        setisRunning={(r: boolean) => (r ? start() : pause())}
        stepOnce={step}
        resetSim={reset}
        tick={tick}
        clockSpeed={clockSpeed}
        setClockSpeed={setClockSpeed}
        undo={undoWithReroute}
        redo={redoWithReroute}
        canUndo={canUndo}
        canRedo={canRedo}
        openSettings={() => setSettingsOpen(true)}
        openDocs={() => setDocsOpen(true)}
        saveProjectToLocal={saveProjectToLocal}
        loadProjectFromLocal={handleLoadProject}
        exportProject={exportJSON}
        importToCanvas={() => {
          importJSON()
            .then((success) => {
              if (success)
                addLog(CONSOLE_TAB.LOG, "Circuit imported to canvas.");
              else
                addLog(
                  CONSOLE_TAB.ERROR,
                  "Failed to import circuit. Check that the file is a valid exported project JSON.",
                );
            })
            .catch(() => {});
        }}
        newProject={newProject}
        openCmd={() => setCmdOpen(true)}
        createCircuitFromGates={handleCreateCircuit}
        // importCircuit={() => fileInputRef.current?.click()}
        hasComponents={Object.keys(snapshot.components).length > 0}
        showObstacleMap={showObstacleMap}
        toggleObstacleMap={toggleObstacleMap}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left toolbox */}
        <CategoryPanel
          onDragStart={setDragType}
          onRemoveCustom={handleRemoveCustom}
          onInspectCustom={(name, circuit) =>
            setViewingCircuit({ name, circuit })
          }
          customBump={customBump}
        />

        {/* Center canvas */}
        <ErrorBoundary>
          <main className="flex-1 relative min-w-0 bg-background">
            <CanvasToolbar
              tool={tool}
              setTool={setTool}
              snapEnabled={snapEnabled}
              setSnapEnabled={setSnapEnabled}
              wireStyle={wireStyle}
              setWireStyle={setWireStyle}
              view={view}
              setView={setView}
              fitToScreen={fitToScreen}
              isRouting={isRouting}
            />
            {showObstacleMap && (
              <ObstacleMapInfo
                obstacleMap={obstacleMapRef.current}
                routingMetrics={wireRouter.getMetrics()}
                version={obstacleMapVersion}
              />
            )}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
            <div
              ref={canvasRef}
              role="application"
              aria-label={intl.formatMessage({
                id: "tSOV46",
                defaultMessage: "Digital Logic Simulator Canvas",
              })}
              className={cn(
                "absolute inset-0 overflow-hidden select-none",
                panning
                  ? "cursor-grabbing"
                  : showObstacleMap || tool === TOOL.PAN
                    ? "cursor-grab"
                    : pendingWire?.isAutoConnect
                      ? "cursor-copy"
                      : "cursor-default",
              )}
              onDragOver={(e) => {
                if (showObstacleMap) {
                  // Don't allow drop when obstacle map is active — shows not-allowed cursor
                  e.dataTransfer.dropEffect = "none";

                  return;
                }

                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={onCanvasDrop}
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
            >
              <GridBackground view={view} size={size} />
              {showObstacleMap && (
                <ObstacleMapOverlay
                  obstacleMap={obstacleMapRef.current}
                  view={view}
                  size={size}
                  version={obstacleMapVersion}
                />
              )}
              <svg
                ref={svgRef}
                width={size.w}
                height={size.h}
                className="absolute inset-0 bg-hit"
                style={{ pointerEvents: "auto" }}
              >
                <g
                  transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}
                >
                  {Object.values(snapshot.wires).map((w) => {
                    const a = snapshot.components[w.from.comp];
                    const b = snapshot.components[w.to.comp];

                    if (!a || !b) return null;
                    if (busWireIdSet.has(w.id)) return null;

                    const p1 = pinPos(a, PIN_KIND.OUT, w.from.pin);
                    const p2 = pinPos(b, PIN_KIND.IN, w.to.pin);
                    const signal = a.outputs[w.from.pin] ?? LogicValue.ZERO;
                    const isSignalUp = signal === LogicValue.ONE;
                    const d1 = pinDirection(a, PIN_KIND.OUT);
                    const d2 = pinDirection(b, PIN_KIND.IN);

                    const cachedRoute = routedWires.get(w.id);
                    const waypoints =
                      wireStyle === WIRE_TYPE.OPTIMIZED && cachedRoute?.valid
                        ? cachedRoute.waypoints
                        : undefined;

                    return (
                      <WirePath
                        key={w.id}
                        p1={p1}
                        p2={p2}
                        isSignalUp={isSignalUp}
                        signal={signal}
                        isRunning={isRunning}
                        wireType={wireStyle}
                        dir1={d1}
                        dir2={d2}
                        isSelected={selWires.has(w.id)}
                        waypoints={waypoints}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();

                          const multi = e.metaKey || e.ctrlKey;

                          if (multi) {
                            const n = new Set(selWires);

                            if (n.has(w.id)) n.delete(w.id);
                            else n.add(w.id);

                            setSelWires(n);
                          } else {
                            setSelection(new Set());
                            setSelWires(new Set([w.id]));
                          }
                        }}
                      />
                    );
                  })}
                  {/* Bus wire groups */}
                  {busWireGroups.map((group) => {
                    const sourceComp = snapshot.components[group.fromComp];
                    const targetComp = snapshot.components[group.toComp];

                    if (!sourceComp || !targetComp) return null;

                    const firstWire = snapshot.wires[group.wireIds[0]];
                    const firstFromPin = firstWire?.from.pin ?? 0;
                    const firstToPin = firstWire?.to.pin ?? 0;
                    const sourceDef = library.has(sourceComp.type)
                      ? library.get(sourceComp.type)
                      : null;
                    const targetDef = library.has(targetComp.type)
                      ? library.get(targetComp.type)
                      : null;
                    const p1 =
                      sourceDef?.busOutputGroups && !sourceDef.isBusOutput
                        ? pinPos(sourceComp, PIN_KIND.OUT, firstFromPin)
                        : busPortPos(sourceComp, PIN_KIND.OUT);
                    const p2 =
                      targetDef?.busInputGroups && !targetDef.isBusInput
                        ? pinPos(targetComp, PIN_KIND.IN, firstToPin)
                        : busPortPos(targetComp, PIN_KIND.IN);
                    const groupSelected = group.wireIds.some((id) =>
                      selWires.has(id),
                    );
                    const bd1 = pinDirection(sourceComp, PIN_KIND.OUT);
                    const bd2 = pinDirection(targetComp, PIN_KIND.IN);

                    return (
                      <BusWirePath
                        key={group.id}
                        p1={p1}
                        p2={p2}
                        width={group.width}
                        signals={group.signals}
                        style={wireStyle}
                        dir1={bd1}
                        dir2={bd2}
                        isSelected={groupSelected}
                        isRunning={isRunning}
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();

                          const multi = e.metaKey || e.ctrlKey;

                          if (multi) {
                            const n = new Set(selWires);

                            for (const id of group.wireIds) {
                              if (n.has(id)) n.delete(id);
                              else n.add(id);
                            }

                            setSelWires(n);
                          } else {
                            setSelection(new Set());
                            setSelWires(new Set(group.wireIds));
                          }
                        }}
                      />
                    );
                  })}
                  {pendingWire &&
                    (() => {
                      const src = snapshot.components[pendingWire.from.comp];

                      if (!src) return null;

                      if (pendingWire.isBus) {
                        const srcDef = library.has(src.type)
                          ? library.get(src.type)
                          : null;
                        const srcGroup = srcDef?.busOutputGroups?.find(
                          ([s]) => s === pendingWire.from.pin,
                        );
                        const p1 =
                          srcDef?.busOutputGroups && !srcDef.isBusOutput
                            ? pinPos(src, PIN_KIND.OUT, pendingWire.from.pin)
                            : busPortPos(src, PIN_KIND.OUT);
                        const width = srcGroup
                          ? srcGroup[1] - srcGroup[0]
                          : srcDef
                            ? srcDef.outputs
                            : 4;
                        const previewSignals: SignalValue[] = [];

                        for (let idx = 0; idx < width; idx += 1)
                          previewSignals.push(LogicValue.UNKNOWN);

                        return (
                          <BusWirePath
                            p1={p1}
                            p2={{ x: pendingWire.mx, y: pendingWire.my }}
                            width={width}
                            signals={previewSignals}
                            style={wireStyle}
                            isSelected={false}
                            isPreview
                          />
                        );
                      }

                      const p1 = pinPos(
                        src,
                        PIN_KIND.OUT,
                        pendingWire.from.pin,
                      );

                      return (
                        <WirePath
                          p1={p1}
                          p2={{ x: pendingWire.mx, y: pendingWire.my }}
                          isSignalUp={false}
                          isRunning={false}
                          wireType={wireStyle}
                          isPreview
                        />
                      );
                    })()}
                  {autoConnectPreview &&
                    (() => {
                      const sourceComp =
                        snapshot.components[autoConnectPreview.sourceComp];
                      const targetComp =
                        snapshot.components[autoConnectPreview.targetComp];

                      if (!sourceComp || !targetComp) return null;

                      return autoConnectPreview.pairs.map((pair, idx) => {
                        const p1 = pinPos(
                          sourceComp,
                          PIN_KIND.OUT,
                          pair.fromPin,
                        );
                        const p2 = pinPos(targetComp, PIN_KIND.IN, pair.toPin);

                        return (
                          <WirePath
                            // eslint-disable-next-line react/no-array-index-key
                            key={`ac-preview-${idx}`}
                            p1={p1}
                            p2={p2}
                            isSignalUp={false}
                            isRunning={false}
                            wireType={wireStyle}
                            isPreview
                          />
                        );
                      });
                    })()}
                  {Object.values(snapshot.components).map((c) => {
                    // Viewport culling: skip components outside the visible area
                    if (!visibleComponents.has(c.id)) return null;

                    return (
                      <GateNode
                        key={c.id}
                        comp={c}
                        isSelected={selection.has(c.id)}
                        onClickBody={() => handleCompClick(c)}
                        onPointerDownBody={
                          c.type === GATE_TYPE_BUTTON
                            ? (e: React.PointerEvent) => {
                                e.stopPropagation();

                                (e.target as Element).setPointerCapture(
                                  e.pointerId,
                                );

                                setInput(c.id, { on: true });
                              }
                            : undefined
                        }
                        onPointerUpBody={
                          c.type === GATE_TYPE_BUTTON
                            ? (e: React.PointerEvent) => {
                                e.stopPropagation();

                                (e.target as Element).releasePointerCapture(
                                  e.pointerId,
                                );

                                setInput(c.id, { on: false });
                              }
                            : undefined
                        }
                        onMouseDown={(e: React.MouseEvent) =>
                          startCompDrag(e, c)
                        }
                        onContextMenu={(e: React.MouseEvent) =>
                          handleContextMenu(e, c.id)
                        }
                        onPinDown={(
                          e: React.MouseEvent,
                          pin: number,
                          kind: PinKind,
                        ) => {
                          if (showObstacleMap) return;

                          // Always stop propagation on pin interactions to
                          // prevent the parent group's onMouseDown (startCompDrag)
                          // from firing.
                          e.stopPropagation();
                          e.preventDefault();

                          if (kind === PIN_KIND.OUT)
                            startWire(e, c, pin, toWorld);
                        }}
                        onPinUp={(
                          e: React.MouseEvent,
                          pin: number,
                          kind: PinKind,
                        ) => {
                          if (showObstacleMap) return;

                          if (kind === PIN_KIND.IN)
                            finishWire(
                              e,
                              c,
                              pin,
                              snapshot,
                              addWireRaw,
                              addLog,
                              pushHistory,
                            );
                        }}
                      />
                    );
                  })}
                  {lasso && (
                    <rect
                      x={Math.min(lasso.x0, lasso.x1)}
                      y={Math.min(lasso.y0, lasso.y1)}
                      width={Math.abs(lasso.x1 - lasso.x0)}
                      height={Math.abs(lasso.y1 - lasso.y0)}
                      fill="var(--color-primary)"
                      fillOpacity={0.08}
                      stroke="var(--color-primary)"
                      strokeDasharray="4 4"
                      strokeWidth={1 / view.k}
                    />
                  )}
                </g>
              </svg>

              {showMinimap && (
                <Minimap snapshot={snapshot} view={view} size={size} />
              )}
              {Object.keys(snapshot.components).length === 0 && <EmptyCanvas />}
            </div>
          </main>
        </ErrorBoundary>

        {/* Right properties */}
        <aside className="w-72 shrink-0 border-l border-border bg-panel/60 flex flex-col">
          {selectedComp && (
            <GateProperties
              comp={selectedComp}
              onUpdate={(id: string, patch: Partial<ComponentInstance>) => {
                updateComponent(id, patch);

                // Trigger rerouting when rotation changes
                if ("rotation" in patch && wireStyle === WIRE_TYPE.OPTIMIZED) {
                  setRerouteTrigger((v) => v + 1);
                }
              }}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
            />
          )}
          {selectedWireData && !selectedComp && (
            <WireProperties
              wire={selectedWireData.wire}
              fromComp={selectedWireData.fromComp}
              toComp={selectedWireData.toComp}
            />
          )}
          <ExplorerPanel
            snapshot={snapshot}
            selection={selection}
            selWires={selWires}
            setSelection={setSelection}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onRotate={rotateSelected}
          />
        </aside>
      </div>

      {/* Bottom console */}
      <ConsolePanel
        tab={consoleTab}
        setTab={setConsoleTab}
        logs={logs}
        tick={tick}
        snapshot={snapshot}
        stats={stats}
      />

      {/* Footer */}
      <BottomBar
        isRunning={isRunning}
        tick={tick}
        compCount={Object.keys(snapshot.components).length}
        wireCount={Object.keys(snapshot.wires).length}
      />

      {/* Global search */}
      {cmdOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            onClose={() => setCmdOpen(false)}
            actions={[
              { label: "Run simulation", action: start },
              { label: "Pause simulation", action: pause },
              { label: "Reset simulation", action: reset },
              {
                label: "Toggle theme",
                action: () => useSettingsStore.getState().toggleTheme(),
              },
              { label: "Fit to screen", action: fitToScreen },
              { label: "Save project to local", action: saveProjectToLocal },
              { label: "Export JSON", action: exportJSON },
              { label: "New project", action: newProject },
              ...library.getCategories().flatMap((cat) =>
                cat.gates.map((g) => ({
                  label: `Add ${library.has(g) ? getGateLabel(g, library.get(g).label) : g}`,
                  action: () => {
                    if (!library.has(g)) return;

                    if (
                      library.isCustom(g) &&
                      !library.hasValidDependencies(g)
                    ) {
                      const meta = library.getCustomMeta(g);

                      if (meta) {
                        library.registerCustomCircuit(
                          meta.name,
                          meta.circuit,
                          g,
                        );
                      }

                      if (!library.hasValidDependencies(g)) {
                        addLog(
                          CONSOLE_TAB.ERROR,
                          `Cannot add "${getGateLabel(g, library.get(g).label)}": missing dependency.`,
                        );

                        return;
                      }
                    }

                    const cx = (size.w / 2 - view.x) / view.k;
                    const cy = (size.h / 2 - view.y) / view.k;

                    addComponent(g, snap(cx), snap(cy));
                  },
                })),
              ),
            ]}
          />
        </Suspense>
      )}

      {/* Circuit Viewer Modal */}
      {viewingCircuit && (
        <Suspense fallback={null}>
          <CircuitViewer
            name={viewingCircuit.name}
            circuit={viewingCircuit.circuit}
            onClose={() => setViewingCircuit(null)}
          />
        </Suspense>
      )}

      {/* Settings Panel */}
      {settingsOpen && (
        <Suspense fallback={null}>
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}

      {/* Docs Panel */}
      {docsOpen && (
        <Suspense fallback={null}>
          <DocsPanel onClose={() => setDocsOpen(false)} />
        </Suspense>
      )}

      {/* Component Context Menu */}
      {ctxMenu && snapshot.components[ctxMenu.compId] && (
        <RightClickMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          comp={snapshot.components[ctxMenu.compId]}
          onClose={() => setCtxMenu(null)}
          onPin={handleCtxPin}
          onReplace={handleCtxReplace}
          onDuplicate={handleCtxDuplicate}
          onDelete={handleCtxDelete}
        />
      )}
    </div>
  );
}

export default DigitalGateApp;
