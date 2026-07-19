import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";

import { BusWirePath, EmptyCanvas, GateNode, WirePath } from "@/components/ui";
import { settingsStore, useSettings } from "@/context/SettingsContext";
import type { CircuitSnapshot, ComponentInstance, SignalValue } from "@/engine";
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
  useWireDrawing,
} from "@/hooks";
import {
  busPortPos,
  computeBusWireGroups,
  pinDirection,
  pinPos,
} from "@/lib/circuit";
import {
  BASE_LOG,
  CONSOLE_TAB,
  DEFAULT_CLOCK,
  PIN_KIND,
  SAVE_LOCAL_ON_ACTION,
  THEME,
  TOOL,
  WIRE_TYPE,
} from "@/lib/constants";
import {
  type ConsoleTab,
  type LogEntry,
  type PinKind,
  type Theme,
  type Tool,
  type WireType,
} from "@/lib/types";
import { cn, getGateLabel, initializeLogger, snap } from "@/lib/utils";
import { type CachedRoute, type ObstacleMap, WireRouter } from "@/wirerouter";

import BottomBar from "./BottomBar";
import CanvasToolbar from "./CanvasToolbar";
import CategoryPanel from "./CategoryPanel";
import CircuitViewer from "./CircuitViewer";
import CommandPalette from "./CommandPalette";
import ConsolePanel from "./ConsolePanel";
import ExplorerPanel from "./ExplorerPanel";
import GateProperties from "./GateProperties";
import GridBackground from "./GridBackground";
import Minimap from "./Minimap";
import ObstacleMapInfo from "./ObstacleMapInfo";
import ObstacleMapOverlay from "./ObstacleMapOverlay";
import SettingsPanel from "./SettingsPanel";
import TopBar from "./TopBar";
import WireProperties from "./WireProperties";

/**
 * DigitalGateApp — main application shell.
 *
 * Orchestrates the simulation engine, canvas interaction hooks,
 * wire drawing, keyboard shortcuts, clipboard, and custom circuits.
 */
function DigitalGateApp() {
  const intl = useIntl();

  // ── Core state ──────────────────────────────────────────────────────────────
  const [clockSpeed, setClockSpeed] = useState(DEFAULT_CLOCK);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([BASE_LOG]);
  const addLog = initializeLogger(setLogs);

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
    onWheel,
    onCanvasMouseDown: canvasMouseDown,
    onCanvasMouseMove: canvasMouseMove,
    onCanvasMouseUp: canvasMouseUp,
    fitToScreen: fitToScreenRaw,
  } = useCanvasInteraction();
  const { pendingWire, setPendingWire, startWire, finishWire } =
    useWireDrawing();
  const clipboard = useClipboard();
  const {
    customBump,
    createCircuitFromGates,
    importCustomCircuitFromFile: importCustomRaw,
    removeCustomCircuit: removeCustomRaw,
  } = useCustomCircuits(addLog);
  const { theme } = useSettings();

  const isRunning = status === SIMULATION_STATUS.RUNNING;
  const { tick } = stats;

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selWires, setSelWires] = useState<Set<string>>(new Set());

  // ── UI state ────────────────────────────────────────────────────────────────
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>(CONSOLE_TAB.LOG);
  const [wireStyle, setWireStyle] = useState<WireType>(WIRE_TYPE.BEZIER);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showMinimap] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tool, setTool] = useState<Tool>(TOOL.SELECT);
  const [showObstacleMap, setShowObstacleMap] = useState(false);
  const [obstacleMapVersion, setObstacleMapVersion] = useState(0);
  const [routedWires, setRoutedWires] = useState<Map<string, CachedRoute>>(
    new Map(),
  );
  const [dragType, setDragType] = useState<string | null>(null);
  const [viewingCircuit, setViewingCircuit] = useState<{
    name: string;
    circuit: CircuitSnapshot;
  } | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const wireRouterRef = useRef<WireRouter>(new WireRouter());
  const obstacleMapRef = useRef<ObstacleMap>(
    wireRouterRef.current.getObstacleMap(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCompRef = useRef<{
    id: string;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);

  // Utils
  const setTheme = (t: Theme) => settingsStore.set({ theme: t });

  const fitToScreen = useCallback(
    () => fitToScreenRaw(snapshot),
    [fitToScreenRaw, snapshot],
  );

  // Effects
  useEffect(() => {
    wireRouterRef.current.rebuild(snapshot);
    obstacleMapRef.current = wireRouterRef.current.getObstacleMap();
    setObstacleMapVersion((v) => v + 1);

    if (wireStyle === WIRE_TYPE.OPTIMIZED) {
      const routes = wireRouterRef.current.routeAll(snapshot);

      setRoutedWires(routes);
    }
  }, [snapshot, wireStyle]);

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
    const wireIds = new Set<string>();

    for (const w of Object.values(snapshot.wires)) {
      if (
        selWires.has(w.id) ||
        selection.has(w.from.comp) ||
        selection.has(w.to.comp)
      )
        wireIds.add(w.id);
    }

    removeWires(Array.from(wireIds));
    removeComponents(Array.from(selection));

    setSelection(new Set());
    setSelWires(new Set());
  }, [selection, selWires, snapshot.wires, removeComponents, removeWires]);

  const duplicateSelected = useCallback(() => {
    const idMap = duplicateComponents(Array.from(selection));

    setSelection(new Set(idMap.values()));
  }, [duplicateComponents, selection]);

  const rotateSelected = useCallback(() => {
    for (const id of selection) {
      const comp = snapshot.components[id];

      if (!comp) continue;

      const current = comp.rotation ?? 0;
      const next = ((current + 90) % 360) as 0 | 90 | 180 | 270;

      updateComponent(id, { rotation: next });
    }
  }, [selection, snapshot.components, updateComponent]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useKeyboardShortcuts({
    deleteSelected,
    undo,
    redo,
    duplicateSelected,
    saveProjectToLocal,
    setCmdOpen,
    selectionSize: selection.size,
    selectAll: useCallback(() => {
      setSelection(new Set(Object.keys(snapshot.components)));
      setSelWires(new Set(Object.keys(snapshot.wires)));
    }, [snapshot.components, snapshot.wires]),
    copySelection: useCallback(() => {
      clipboard.copySelection(Array.from(selection));
    }, [clipboard, selection]),
    pasteClipboard: useCallback(() => {
      const idMap = clipboard.pasteClipboard(duplicateComponents);

      if (idMap) {
        setSelection(new Set(idMap.values()));
        setSelWires(new Set());
      }
    }, [clipboard, duplicateComponents]),
  });

  // ── Component interaction ───────────────────────────────────────────────────
  const handleCompClick = useCallback(
    (c: ComponentInstance) => {
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
    [setInput],
  );

  const startCompDrag = useCallback(
    (e: React.MouseEvent, c: ComponentInstance) => {
      e.stopPropagation();

      const multiSelect = e.metaKey || e.ctrlKey;

      if (multiSelect) {
        setSelection((s) => {
          const n = new Set(s);

          if (n.has(c.id)) n.delete(c.id);
          else n.add(c.id);

          return n;
        });
      } else if (!selection.has(c.id)) {
        setSelection(new Set([c.id]));
        setSelWires(new Set());
      }

      const p = toWorld(e.clientX, e.clientY);

      dragCompRef.current = {
        id: c.id,
        ox: p.x - c.x,
        oy: p.y - c.y,
        moved: false,
      };
    },
    [selection, toWorld],
  );

  // ── Canvas drop ─────────────────────────────────────────────────────────────
  const onCanvasDrop = useCallback(
    (e: React.DragEvent) => {
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

      addLog(
        CONSOLE_TAB.LOG,
        `Added ${getGateLabel(def.type, def.label)} (${comp.id})`,
      );

      if (SAVE_LOCAL_ON_ACTION) saveProjectToLocal();

      setDragType(null);
    },
    [dragType, toWorld, addComponent, addLog, saveProjectToLocal],
  );

  // ── Canvas mouse handlers (wrappers around the hook) ────────────────────────
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      canvasMouseDown(e, tool);

      if (
        e.target === svgRef.current ||
        (e.target as SVGElement).classList?.contains("bg-hit")
      ) {
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          setSelection(new Set());
          setSelWires(new Set());
        }
      }
    },
    [canvasMouseDown, tool, svgRef],
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
      selection,
      moveComponents,
      pendingWire,
      setPendingWire,
    ],
  );

  const onCanvasMouseUp = useCallback(() => {
    if (dragCompRef.current?.moved) commitMove();

    dragCompRef.current = null;

    const lassoSelection = canvasMouseUp(snapshot);

    if (lassoSelection) {
      setSelection(lassoSelection);
    }

    if (pendingWire) setPendingWire(null);
  }, [canvasMouseUp, snapshot, commitMove, pendingWire, setPendingWire]);

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
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        openSettings={() => setSettingsOpen(true)}
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
        importCircuit={() => fileInputRef.current?.click()}
        hasComponents={Object.keys(snapshot.components).length > 0}
        showObstacleMap={showObstacleMap}
        toggleObstacleMap={() => setShowObstacleMap((v) => !v)}
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
          />
          {showObstacleMap && (
            <ObstacleMapInfo
              obstacleMap={obstacleMapRef.current}
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
              panning || tool === TOOL.PAN
                ? "cursor-grabbing"
                : "cursor-default",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onCanvasDrop}
            onWheel={onWheel}
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
              <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
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
                          setSelWires((s) => {
                            const n = new Set(s);

                            if (n.has(w.id)) n.delete(w.id);
                            else n.add(w.id);

                            return n;
                          });
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
                          setSelWires((s) => {
                            const n = new Set(s);

                            for (const id of group.wireIds) {
                              if (n.has(id)) n.delete(id);
                              else n.add(id);
                            }

                            return n;
                          });
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

                    const p1 = pinPos(src, PIN_KIND.OUT, pendingWire.from.pin);

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
                {Object.values(snapshot.components).map((c) => (
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
                    onMouseDown={(e: React.MouseEvent) => startCompDrag(e, c)}
                    onPinDown={(
                      e: React.MouseEvent,
                      pin: number,
                      kind: PinKind,
                    ) => {
                      if (kind === PIN_KIND.OUT) startWire(e, c, pin, toWorld);
                    }}
                    onPinUp={(
                      e: React.MouseEvent,
                      pin: number,
                      kind: PinKind,
                    ) => {
                      if (kind === PIN_KIND.IN)
                        finishWire(
                          e,
                          c,
                          pin,
                          snapshot,
                          addWire,
                          addLog,
                          saveProjectToLocal,
                        );
                    }}
                  />
                ))}
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

        {/* Right properties */}
        <aside className="w-72 shrink-0 border-l border-border bg-panel/60 flex flex-col">
          {selectedComp && (
            <GateProperties
              comp={selectedComp}
              onUpdate={(id: string, patch: Partial<ComponentInstance>) =>
                updateComponent(id, patch)
              }
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
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          actions={[
            { label: "Run simulation", action: start },
            { label: "Pause simulation", action: pause },
            { label: "Reset simulation", action: reset },
            {
              label: "Toggle theme",
              action: () =>
                setTheme(theme === THEME.DARK ? THEME.LIGHT : THEME.DARK),
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

                  if (library.isCustom(g) && !library.hasValidDependencies(g)) {
                    const meta = library.getCustomMeta(g);

                    if (meta) {
                      library.registerCustomCircuit(meta.name, meta.circuit, g);
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
      )}

      {/* Circuit Viewer Modal */}
      {viewingCircuit && (
        <CircuitViewer
          name={viewingCircuit.name}
          circuit={viewingCircuit.circuit}
          onClose={() => setViewingCircuit(null)}
        />
      )}

      {/* Settings Panel */}
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          theme={theme}
          setTheme={setTheme}
        />
      )}
    </div>
  );
}

export default DigitalGateApp;
