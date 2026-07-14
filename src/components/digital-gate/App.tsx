import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Cpu,
  Grid3x3,
  Hand,
  MousePointer2,
  Search,
  Zap,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import type { ComponentInstance } from "@/engine";
import { library } from "@/engine";
import { useDigitalEngine } from "@/hooks/use-digitalengine";
import { pinPos } from "@/lib/circuit";
import {
  BASE_LOG,
  CONSOLE_TAB,
  GATE_CATEGORY_LABELS,
  GATE_TYPE_CONST,
  GATE_TYPE_TOGGLE,
  PIN_KIND,
  SIMULATION_STATUS,
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
import { addLog, cn, fm, snap } from "@/lib/utils";

import BottomBar from "./BottomBar";
import CommandPalette from "./CommandPalette";
import ConsolePanel from "./ConsolePanel";
import ExplorerPanel from "./ExplorerPanel";
import GateChip from "./GateChip";
import GateNode from "./GateNode";
import GridBackground from "./GridBackground";
import Minimap from "./Minimap";
import PropertiesPanel from "./PropertiesPanel";
import ToolBtn from "./ToolBtn";
import TopBar from "./TopBar";
import WirePath from "./WirePath";

const GATE_CATEGORIES = library.getCategories();
const DEFAULT_OPEN_GATE = Object.fromEntries(
  GATE_CATEGORIES.map((c) => [c.name, true]),
);
const GATES: Record<string, ReturnType<typeof library.get>> = {};

for (const cat of GATE_CATEGORIES) {
  for (const g of cat.gates) GATES[g] = library.get(g);
}

/**
 * DigitalGateApp
 */
function DigitalGateApp() {
  // States
  const [theme, setTheme] = useState<Theme>(THEME.LIGHT);
  const [clockSpeed, setClockSpeed] = useState(8);

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
    newProject,
    saveProjectToLocal,
    loadProjectFromLocal,
  } = useDigitalEngine(clockSpeed);

  const running = status === SIMULATION_STATUS.RUNNING;
  const { tick } = stats;

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selWires, setSelWires] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([BASE_LOG]);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>(CONSOLE_TAB.LOG);
  const [wireStyle, setWireStyle] = useState<WireType>(WIRE_TYPE.BEZIER);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showMinimap] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] =
    useState<Record<string, boolean>>(DEFAULT_OPEN_GATE);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [pendingWire, setPendingWire] = useState<{
    from: { comp: string; pin: number };
    mx: number;
    my: number;
  } | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [lasso, setLasso] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [tool, setTool] = useState<Tool>(TOOL.SELECT);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);
  const dragCompRef = useRef<{
    id: string;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = canvasRef.current;

    if (!el) return;

    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );

    ro.observe(el);

    // eslint-disable-next-line consistent-return
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === THEME.LIGHT);
    document.documentElement.classList.toggle("dark", theme === THEME.DARK);
  }, [theme]);

  const toWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();

      if (!rect) return { x: 0, y: 0 };

      return {
        x: (sx - rect.left - view.x) / view.k,
        y: (sy - rect.top - view.y) / view.k,
      };
    },
    [view],
  );

  const onCanvasDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData("text/gate") || dragType;

    if (!type || !GATES[type]) return;

    const def = GATES[type];
    const { x, y } = toWorld(e.clientX, e.clientY);
    const nx = snapEnabled ? snap(x - def.width / 2) : x - def.width / 2;
    const ny = snapEnabled ? snap(y - def.height / 2) : y - def.height / 2;
    const comp = addComponent(type, nx, ny);

    addLog(CONSOLE_TAB.LOG, `Added ${def.label} (${comp.id})`, setLogs);

    setDragType(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const rect = canvasRef.current?.getBoundingClientRect();

      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const k = Math.min(3, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      const nx = mx - (mx - view.x) * (k / view.k);
      const ny = my - (my - view.y) * (k / view.k);

      setView({ x: nx, y: ny, k });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === "pan" || (e.button === 0 && e.altKey)) {
      setPanning(true);

      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        vx: view.x,
        vy: view.y,
      };

      return;
    }

    if (
      e.target === svgRef.current ||
      (e.target as SVGElement).classList?.contains("bg-hit")
    ) {
      const p = toWorld(e.clientX, e.clientY);

      setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });

      if (!e.shiftKey) {
        setSelection(new Set());
        setSelWires(new Set());
      }
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (panning && panStartRef.current) {
      setView((v) => ({
        ...v,
        x: panStartRef.current!.vx + (e.clientX - panStartRef.current!.x),
        y: panStartRef.current!.vy + (e.clientY - panStartRef.current!.y),
      }));

      return;
    }

    if (dragCompRef.current) {
      const { id, ox, oy } = dragCompRef.current;
      const p = toWorld(e.clientX, e.clientY);
      const nx = snapEnabled ? snap(p.x - ox) : p.x - ox;
      const ny = snapEnabled ? snap(p.y - oy) : p.y - oy;

      dragCompRef.current.moved = true;

      const cur = snapshot.components[id];

      if (!cur) return;

      const dx = nx - cur.x;
      const dy = ny - cur.y;
      const ids = selection.has(id) ? Array.from(selection) : [id];

      moveComponents(ids, dx, dy);

      return;
    }

    if (pendingWire) {
      const p = toWorld(e.clientX, e.clientY);

      setPendingWire({ ...pendingWire, mx: p.x, my: p.y });
    }

    if (lasso) {
      const p = toWorld(e.clientX, e.clientY);

      setLasso({ ...lasso, x1: p.x, y1: p.y });
    }
  };

  const onCanvasMouseUp = () => {
    setPanning(false);

    if (dragCompRef.current?.moved) commitMove();

    panStartRef.current = null;
    dragCompRef.current = null;

    if (lasso) {
      const x = Math.min(lasso.x0, lasso.x1);
      const y = Math.min(lasso.y0, lasso.y1);
      const w = Math.abs(lasso.x1 - lasso.x0);
      const h = Math.abs(lasso.y1 - lasso.y0);
      const sel = new Set<string>();

      for (const c of Object.values(snapshot.components)) {
        const def = GATES[c.type];

        if (!def) continue;

        if (
          c.x + def.width >= x &&
          c.x <= x + w &&
          c.y + def.height >= y &&
          c.y <= y + h
        )
          sel.add(c.id);
      }

      setSelection(sel);
      setLasso(null);
    }

    if (pendingWire) setPendingWire(null);
  };

  const startCompDrag = (e: React.MouseEvent, c: ComponentInstance) => {
    e.stopPropagation();

    if (!e.shiftKey && !selection.has(c.id)) setSelection(new Set([c.id]));
    else if (e.shiftKey) setSelection(new Set([...selection, c.id]));

    const p = toWorld(e.clientX, e.clientY);

    dragCompRef.current = {
      id: c.id,
      ox: p.x - c.x,
      oy: p.y - c.y,
      moved: false,
    };
  };

  const startWire = (
    e: React.MouseEvent,
    comp: ComponentInstance,
    pin: number,
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const p = toWorld(e.clientX, e.clientY);

    setPendingWire({ from: { comp: comp.id, pin }, mx: p.x, my: p.y });
  };

  const finishWire = (
    e: React.MouseEvent,
    comp: ComponentInstance,
    pin: number,
  ) => {
    e.stopPropagation();

    if (!pendingWire) return;

    if (pendingWire.from.comp === comp.id) {
      setPendingWire(null);

      return;
    }

    const wire = addWire(
      pendingWire.from.comp,
      pendingWire.from.pin,
      comp.id,
      pin,
    );

    if (wire) addLog("log", `Wire connected (${wire.id})`, setLogs);

    setPendingWire(null);
  };

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

  const duplicateSelected = () => {
    const idMap = duplicateComponents(Array.from(selection));

    setSelection(new Set(idMap.values()));
  };

  const handleCompClick = (c: ComponentInstance) => {
    if (c.type === GATE_TYPE_TOGGLE || c.type === GATE_TYPE_CONST)
      setInput(c.id, { on: !c.state?.on });
  };

  const fitToScreen = () => {
    const comps = Object.values(snapshot.components);

    if (!comps.length) {
      setView({ x: 0, y: 0, k: 1 });

      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const c of comps) {
      const d = GATES[c.type];

      if (!d) continue;

      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + d.width);
      maxY = Math.max(maxY, c.y + d.height);
    }

    const w = maxX - minX + 100;
    const h = maxY - minY + 100;
    const k = Math.min(size.w / w, size.h / h, 2);

    setView({ x: -minX * k + 50, y: -minY * k + 50, k });
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          (e.target as HTMLElement).tagName === "INPUT" ||
          (e.target as HTMLElement).tagName === "TEXTAREA"
        )
          return;

        deleteSelected();

        return;
      }

      e.preventDefault();

      // if (e.key === " " && running) pause();
      // if (e.key === " ") start();
      if (meta && e.key.toLowerCase() === "k") setCmdOpen((v) => !v);
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) undo();
      if (meta && e.key.toLowerCase() === "d") duplicateSelected();
      if (meta && e.key.toLowerCase() === "s") saveProjectToLocal();
      if (
        meta &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      )
        redo();
    };

    window.addEventListener("keydown", h);

    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteSelected, running]);

  const filteredCats = useMemo(() => {
    if (!search) return GATE_CATEGORIES;

    const q = search.toLowerCase();

    return GATE_CATEGORIES.map((c) => ({
      ...c,
      gates: c.gates.filter(
        (g) =>
          GATES[g]?.label.toLowerCase().includes(q) ||
          g.toLowerCase().includes(q),
      ),
    })).filter((c) => c.gates.length);
  }, [search]);

  const selectedComp = useMemo(
    () =>
      selection.size === 1
        ? snapshot.components[Array.from(selection)[0]]
        : null,
    [selection, snapshot.components],
  );

  return (
    <div className="h-full w-full flex flex-col text-foreground bg-background overflow-hidden font-display">
      <TopBar
        running={running}
        setRunning={(r: boolean) => (r ? start() : pause())}
        stepOnce={step}
        resetSim={reset}
        tick={tick}
        clockSpeed={clockSpeed}
        setClockSpeed={setClockSpeed}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        theme={theme}
        setTheme={setTheme}
        saveProjectToLocal={saveProjectToLocal}
        loadProjectFromLocal={loadProjectFromLocal}
        exportProject={exportJSON}
        newProject={newProject}
        openCmd={() => setCmdOpen(true)}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left toolbox */}
        <aside className="w-64 shrink-0 border-r border-border bg-panel/60 flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              <Cpu className="h-3.5 w-3.5" />
              <FormattedMessage id="AcAA5x" defaultMessage="Components" />
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="pl-7 h-8 bg-background/60 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredCats.map((cat) => (
              <div key={cat.name}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenCats((o) => ({ ...o, [cat.name]: !o[cat.name] }))
                  }
                  className="w-full flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {openCats[cat.name] ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {fm(GATE_CATEGORY_LABELS[cat.name]?.messageKey)}
                </button>
                {openCats[cat.name] && (
                  <div className="grid grid-cols-2 gap-1.5 px-1 pb-2">
                    {cat.gates.map((g) => (
                      <GateChip
                        key={g}
                        type={g}
                        onDragStart={() => setDragType(g)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Center canvas */}
        <main className="flex-1 relative min-w-0 bg-background">
          {/* Canvas tool */}
          <div className="absolute z-20 top-3 left-3 flex items-center gap-1 glass-panel rounded-lg p-1 shadow-lg">
            <ToolBtn
              active={tool === TOOL.SELECT}
              onClick={() => setTool(TOOL.SELECT)}
              icon={<MousePointer2 className="h-4 w-4" />}
              label="Select (V)"
            />
            <ToolBtn
              active={tool === TOOL.PAN}
              onClick={() => setTool(TOOL.PAN)}
              icon={<Hand className="h-4 w-4" />}
              label="Pan (Space)"
            />
            <div className="w-px h-5 bg-border mx-1" />
            <ToolBtn
              active={snapEnabled}
              onClick={() => setSnapEnabled(!snapEnabled)}
              icon={<Grid3x3 className="h-4 w-4" />}
              label="Snap to grid"
            />
            <ToolBtn
              active={wireStyle === WIRE_TYPE.ORTHO}
              onClick={() =>
                setWireStyle(
                  wireStyle === WIRE_TYPE.ORTHO
                    ? WIRE_TYPE.BEZIER
                    : WIRE_TYPE.ORTHO,
                )
              }
              icon={<Activity className="h-4 w-4" />}
              label={`Wire: ${wireStyle}`}
            />
          </div>
          {/* Canvas fit */}
          <div className="absolute z-20 top-3 right-3 flex items-center gap-1 glass-panel rounded-lg p-1 text-xs shadow-lg">
            <button
              type="button"
              tabIndex={0}
              onClick={fitToScreen}
              className="px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              <FormattedMessage id="N2HbmZ" defaultMessage="Fit" />
            </button>
            <button
              type="button"
              tabIndex={0}
              onClick={() => setView({ x: 0, y: 0, k: 1 })}
              className="px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              <FormattedMessage id="8ZVfG8" defaultMessage="100%" />
            </button>
            <span className="px-2 text-muted-foreground tabular-nums">
              <FormattedMessage
                id="qnonu0"
                defaultMessage="{percentage}%"
                values={{
                  percentage: Math.round(view.k * 100),
                }}
              />
            </span>
          </div>

          <div
            ref={canvasRef}
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
            {/* Wires and components */}
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

                  const p1 = pinPos(a, PIN_KIND.OUT, w.from.pin);
                  const p2 = pinPos(b, PIN_KIND.IN, w.to.pin);
                  const live = Boolean(a.outputs[w.from.pin]);

                  return (
                    <WirePath
                      key={w.id}
                      p1={p1}
                      p2={p2}
                      live={live}
                      running={running}
                      style={wireStyle}
                      isSelected={selWires.has(w.id)}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();

                        setSelWires((s) => {
                          const n = new Set(s);

                          if (n.has(w.id)) n.delete(w.id);
                          else n.add(w.id);

                          return n;
                        });
                      }}
                    />
                  );
                })}
                {pendingWire &&
                  (() => {
                    const src = snapshot.components[pendingWire.from.comp];

                    if (!src) return null;

                    const p1 = pinPos(src, PIN_KIND.OUT, pendingWire.from.pin);

                    return (
                      <WirePath
                        p1={p1}
                        p2={{ x: pendingWire.mx, y: pendingWire.my }}
                        live={false}
                        running={false}
                        style={wireStyle}
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
                    onMouseDown={(e: React.MouseEvent) => startCompDrag(e, c)}
                    onPinDown={(
                      e: React.MouseEvent,
                      pin: number,
                      kind: PinKind,
                    ) => {
                      if (kind === PIN_KIND.OUT) startWire(e, c, pin);
                    }}
                    onPinUp={(
                      e: React.MouseEvent,
                      pin: number,
                      kind: PinKind,
                    ) => {
                      if (kind === PIN_KIND.IN) finishWire(e, c, pin);
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

            {/* MiniMap */}
            {showMinimap && (
              <Minimap snapshot={snapshot} view={view} size={size} />
            )}
            {/* Empty Canvas */}
            {Object.keys(snapshot.components).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl glass-panel flex items-center justify-center">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-lg font-semibold">
                    <FormattedMessage
                      id="GkBxYy"
                      defaultMessage="Start designing"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <FormattedMessage
                      id="G/iTZ2"
                      defaultMessage="Drag a component from the toolbox onto the canvas."
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    <FormattedMessage id="uizmax" defaultMessage="Press" />
                    <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">
                      <FormattedMessage id="cpOWpz" defaultMessage="⌘K" />
                    </kbd>
                    <FormattedMessage
                      id="0TVISU"
                      defaultMessage="for the command palette"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right properties */}
        <aside className="w-72 shrink-0 border-l border-border bg-panel/60 flex flex-col">
          {selectedComp && (
            <PropertiesPanel
              comp={selectedComp}
              onUpdate={(id: string, patch: Partial<ComponentInstance>) =>
                updateComponent(id, patch)
              }
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
            />
          )}
          <ExplorerPanel
            snapshot={snapshot}
            selection={selection}
            setSelection={setSelection}
          />
        </aside>
      </div>

      <ConsolePanel
        tab={consoleTab}
        setTab={setConsoleTab}
        logs={logs}
        tick={tick}

        snapshot={snapshot}
        stats={stats}
      />

      <BottomBar
        running={running}
        tick={tick}
        compCount={Object.keys(snapshot.components).length}
        wireCount={Object.keys(snapshot.wires).length}
      />

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
            ...GATE_CATEGORIES.flatMap((cat) =>
              cat.gates.map((g) => ({
                label: `Add ${GATES[g]?.label ?? g}`,
                action: () => {
                  const def = GATES[g];

                  if (!def) return;

                  const cx = (size.w / 2 - view.x) / view.k;
                  const cy = (size.h / 2 - view.y) / view.k;

                  addComponent(g, snap(cx), snap(cy));
                },
              })),
            ),
          ]}
        />
      )}
    </div>
  );
}

export default DigitalGateApp;
