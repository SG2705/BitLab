/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  Square,
  StepForward,
  RotateCcw,
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Plus,
  Search,
  Zap,
  Cpu,
  Grid3x3,
  Sun,
  Moon,
  Trash2,
  Copy,
  Settings2,
  Terminal,
  AlertTriangle,
  Activity,
  Clock,
  ChevronRight,
  ChevronDown,
  Command,
  MousePointer2,
  Hand,
} from "lucide-react";
import {
  GATES,
  CATEGORIES,
  simulate,
  pinPos,
  type Circuit,
  type CircuitComp,
  type Wire,
} from "@/lib/circuit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Tool = "select" | "pan";
type HistoryEntry = Circuit;

const GRID = 20;
const uid = () => Math.random().toString(36).slice(2, 10);

function snap(v: number) {
  return Math.round(v / GRID) * GRID;
}

export function DigitalGateApp() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const [circuit, setCircuit] = useState<Circuit>({
    components: {},
    wires: {},
  });
  const [history, setHistory] = useState<HistoryEntry[]>([
    { components: {}, wires: {} },
  ]);
  const [histIdx, setHistIdx] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selWires, setSelWires] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [clockSpeed, setClockSpeed] = useState(8); // Hz
  const [tool, setTool] = useState<Tool>("select");
  const [logs, setLogs] = useState<
    { t: number; kind: "log" | "warn" | "err"; msg: string }[]
  >([
    {
      t: 0,
      kind: "log",
      msg: "Digital Gate ready. Drag components from the toolbox to get started.",
    },
  ]);
  const [consoleTab, setConsoleTab] = useState<
    "log" | "err" | "warn" | "timeline" | "perf"
  >("log");
  const [wireStyle, setWireStyle] = useState<"bezier" | "ortho">("bezier");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.name, true])),
  );

  // Viewport (pan/zoom)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pushHistory = useCallback(
    (c: Circuit) => {
      setHistory((h) => {
        const next = h.slice(0, histIdx + 1);
        next.push(c);
        return next.slice(-50);
      });
      setHistIdx((i) => Math.min(i + 1, 49));
    },
    [histIdx],
  );

  const updateCircuit = useCallback(
    (updater: (c: Circuit) => Circuit, record = true) => {
      setCircuit((prev) => {
        const next = updater(prev);
        if (record) pushHistory(next);
        return next;
      });
    },
    [pushHistory],
  );

  const undo = () => {
    if (histIdx > 0) {
      setHistIdx(histIdx - 1);
      setCircuit(history[histIdx - 1]);
    }
  };
  const redo = () => {
    if (histIdx < history.length - 1) {
      setHistIdx(histIdx + 1);
      setCircuit(history[histIdx + 1]);
    }
  };

  // Simulation loop
  useEffect(() => {
    if (!running) return;
    const interval = 1000 / Math.max(1, clockSpeed);
    let last = performance.now();
    let raf = 0;
    const step = () => {
      const now = performance.now();
      if (now - last >= interval) {
        const dt = now - last;
        last = now;
        setCircuit((c) => simulate(c, dt));
        setTick((t) => t + 1);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, clockSpeed]);

  const stepOnce = () => {
    setCircuit((c) => simulate(c, 1000 / Math.max(1, clockSpeed)));
    setTick((t) => t + 1);
  };
  const resetSim = () => {
    setRunning(false);
    setTick(0);
    updateCircuit((c) => {
      const comps = { ...c.components };
      for (const id of Object.keys(comps)) {
        const def = GATES[comps[id].type];
        comps[id] = {
          ...comps[id],
          state: def.initialState ? def.initialState() : comps[id].state,
          outputs: new Array(def.outputs).fill(false),
        };
      }
      return { ...c, components: comps };
    });
    setLogs((l) => [
      ...l,
      { t: Date.now(), kind: "log", msg: "Simulation reset." },
    ]);
  };

  // Screen -> world coords
  const toWorld = useCallback(
    (sx: number, sy: number) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      return {
        x: (sx - rect.left - view.x) / view.k,
        y: (sy - rect.top - view.y) / view.k,
      };
    },
    [view],
  );

  // Drop new component from toolbox
  const [dragType, setDragType] = useState<string | null>(null);
  const onCanvasDrop = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData("text/gate") || dragType;
    if (!type || !GATES[type]) return;
    const { x, y } = toWorld(e.clientX, e.clientY);
    const def = GATES[type];
    const nx = snapEnabled ? snap(x - def.width / 2) : x - def.width / 2;
    const ny = snapEnabled ? snap(y - def.height / 2) : y - def.height / 2;
    const id = uid();
    updateCircuit((c) => ({
      ...c,
      components: {
        ...c.components,
        [id]: {
          id,
          type,
          x: nx,
          y: ny,
          state: def.initialState ? def.initialState() : null,
          outputs: new Array(def.outputs).fill(false),
          label: def.label,
        },
      },
    }));
    setLogs((l) => [
      ...l,
      { t: Date.now(), kind: "log", msg: `Added ${def.label}` },
    ]);
    setDragType(null);
  };

  // Pan / zoom
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);
  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left,
        my = e.clientY - rect.top;
      const k = Math.min(3, Math.max(0.2, view.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      const nx = mx - (mx - view.x) * (k / view.k);
      const ny = my - (my - view.y) * (k / view.k);
      setView({ x: nx, y: ny, k });
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  };

  // Component dragging
  const dragCompRef = useRef<{
    id: string;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  // Wire creation
  const [pendingWire, setPendingWire] = useState<{
    from: { comp: string; pin: number };
    mx: number;
    my: number;
  } | null>(null);
  // Lasso
  const [lasso, setLasso] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);

  const onCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || tool === "pan" || (e.button === 0 && e.altKey)) {
      setPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
      return;
    }
    if (
      e.target === svgRef.current ||
      (e.target as SVGElement).classList?.contains("bg-hit")
    ) {
      // Start lasso
      const p = toWorld(e.clientX, e.clientY);
      setLasso({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      if (!e.shiftKey) {
        setSelection(new Set());
        setSelWires(new Set());
      }
    }
  };
  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (panning && panStart.current) {
      setView((v) => ({
        ...v,
        x: panStart.current!.vx + (e.clientX - panStart.current!.x),
        y: panStart.current!.vy + (e.clientY - panStart.current!.y),
      }));
      return;
    }
    if (dragCompRef.current) {
      const { id, ox, oy } = dragCompRef.current;
      const p = toWorld(e.clientX, e.clientY);
      const nx = snapEnabled ? snap(p.x - ox) : p.x - ox;
      const ny = snapEnabled ? snap(p.y - oy) : p.y - oy;
      dragCompRef.current.moved = true;
      setCircuit((c) => {
        const cur = c.components[id];
        if (!cur) return c;
        const dx = nx - cur.x,
          dy = ny - cur.y;
        const comps = { ...c.components };
        // move all selected
        const ids = selection.has(id) ? Array.from(selection) : [id];
        for (const sid of ids) {
          const s = comps[sid];
          if (!s) continue;
          comps[sid] = { ...s, x: s.x + dx, y: s.y + dy };
        }
        return { ...c, components: comps };
      });
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
    panStart.current = null;
    if (dragCompRef.current?.moved) pushHistory(circuit);
    dragCompRef.current = null;
    if (lasso) {
      const x = Math.min(lasso.x0, lasso.x1),
        y = Math.min(lasso.y0, lasso.y1);
      const w = Math.abs(lasso.x1 - lasso.x0),
        h = Math.abs(lasso.y1 - lasso.y0);
      const sel = new Set<string>();
      for (const c of Object.values(circuit.components)) {
        const def = GATES[c.type];
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
    if (pendingWire) {
      // Cancel if released on empty space
      setPendingWire(null);
    }
  };

  const startCompDrag = (e: React.MouseEvent, c: CircuitComp) => {
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

  const startWire = (e: React.MouseEvent, comp: CircuitComp, pin: number) => {
    e.stopPropagation();
    const p = toWorld(e.clientX, e.clientY);
    setPendingWire({ from: { comp: comp.id, pin }, mx: p.x, my: p.y });
  };
  const finishWire = (e: React.MouseEvent, comp: CircuitComp, pin: number) => {
    e.stopPropagation();
    if (!pendingWire) return;
    if (pendingWire.from.comp === comp.id) {
      setPendingWire(null);
      return;
    }
    const id = uid();
    const w: Wire = { id, from: pendingWire.from, to: { comp: comp.id, pin } };
    updateCircuit((c) => ({ ...c, wires: { ...c.wires, [id]: w } }));
    setPendingWire(null);
    setLogs((l) => [
      ...l,
      { t: Date.now(), kind: "log", msg: `Wire connected` },
    ]);
  };

  const deleteSelected = useCallback(() => {
    updateCircuit((c) => {
      const comps = { ...c.components };
      for (const id of selection) delete comps[id];
      const wires: Record<string, Wire> = {};
      for (const w of Object.values(c.wires)) {
        if (selWires.has(w.id)) continue;
        if (selection.has(w.from.comp) || selection.has(w.to.comp)) continue;
        wires[w.id] = w;
      }
      return { components: comps, wires };
    });
    setSelection(new Set());
    setSelWires(new Set());
  }, [selection, selWires, updateCircuit]);

  const duplicateSelected = () => {
    updateCircuit((c) => {
      const comps = { ...c.components };
      const newIds: Record<string, string> = {};
      for (const id of selection) {
        const s = c.components[id];
        if (!s) continue;
        const nid = uid();
        newIds[id] = nid;
        comps[nid] = { ...s, id: nid, x: s.x + GRID, y: s.y + GRID };
      }
      return { ...c, components: comps };
    });
  };

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        meta &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProject();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          (e.target as HTMLElement).tagName === "INPUT" ||
          (e.target as HTMLElement).tagName === "TEXTAREA"
        )
          return;
        deleteSelected();
      }
      if (e.key === " ") {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteSelected, histIdx, history]);

  const saveProject = () => {
    const data = JSON.stringify(circuit);
    localStorage.setItem("digital-gate-project", data);
    setLogs((l) => [
      ...l,
      { t: Date.now(), kind: "log", msg: "Project saved to browser storage." },
    ]);
  };
  const loadProject = () => {
    const raw = localStorage.getItem("digital-gate-project");
    if (!raw) {
      setLogs((l) => [
        ...l,
        { t: Date.now(), kind: "warn", msg: "No saved project found." },
      ]);
      return;
    }
    try {
      const c = JSON.parse(raw);
      setCircuit(c);
      pushHistory(c);
    } catch {
      setLogs((l) => [
        ...l,
        { t: Date.now(), kind: "err", msg: "Failed to parse saved project." },
      ]);
    }
  };
  const exportProject = () => {
    const blob = new Blob([JSON.stringify(circuit, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "circuit.dgate.json";
    a.click();
  };

  // Toggle input on click
  const handleCompClick = (c: CircuitComp) => {
    if (c.type === "TOGGLE" || c.type === "CONST") {
      updateCircuit((circ) => {
        const comps = { ...circ.components };
        comps[c.id] = { ...c, state: { ...(c.state ?? {}), on: !c.state?.on } };
        return { ...circ, components: comps };
      }, false);
    }
  };

  const fitToScreen = () => {
    const comps = Object.values(circuit.components);
    if (!comps.length) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const c of comps) {
      const d = GATES[c.type];
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + d.width);
      maxY = Math.max(maxY, c.y + d.height);
    }
    const w = maxX - minX + 100,
      h = maxY - minY + 100;
    const k = Math.min(size.w / w, size.h / h, 2);
    setView({ x: -minX * k + 50, y: -minY * k + 50, k });
  };

  const filteredCats = useMemo(() => {
    if (!search) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.map((c) => ({
      ...c,
      gates: c.gates.filter(
        (g) =>
          GATES[g].label.toLowerCase().includes(q) ||
          g.toLowerCase().includes(q),
      ),
    })).filter((c) => c.gates.length);
  }, [search]);

  const selectedComp =
    selection.size === 1 ? circuit.components[Array.from(selection)[0]] : null;

  return (
    <div className="h-full w-full flex flex-col text-foreground bg-background overflow-hidden font-display">
      <TopBar
        running={running}
        setRunning={setRunning}
        stepOnce={stepOnce}
        resetSim={resetSim}
        tick={tick}
        clockSpeed={clockSpeed}
        setClockSpeed={setClockSpeed}
        undo={undo}
        redo={redo}
        canUndo={histIdx > 0}
        canRedo={histIdx < history.length - 1}
        theme={theme}
        setTheme={setTheme}
        saveProject={saveProject}
        loadProject={loadProject}
        exportProject={exportProject}
        newProject={() => {
          setCircuit({ components: {}, wires: {} });
          pushHistory({ components: {}, wires: {} });
        }}
        openCmd={() => setCmdOpen(true)}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left toolbox */}
        <aside className="w-64 shrink-0 border-r border-border bg-panel/60 flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              <Cpu className="h-3.5 w-3.5" /> Components
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
                  {cat.name}
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
          {/* Floating tool switcher */}
          <div className="absolute z-20 top-3 left-3 flex items-center gap-1 glass-panel rounded-lg p-1 shadow-lg">
            <ToolBtn
              active={tool === "select"}
              onClick={() => setTool("select")}
              icon={<MousePointer2 className="h-4 w-4" />}
              label="Select (V)"
            />
            <ToolBtn
              active={tool === "pan"}
              onClick={() => setTool("pan")}
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
              active={wireStyle === "ortho"}
              onClick={() =>
                setWireStyle(wireStyle === "ortho" ? "bezier" : "ortho")
              }
              icon={<Activity className="h-4 w-4" />}
              label={`Wire: ${wireStyle}`}
            />
          </div>

          <div className="absolute z-20 top-3 right-3 flex items-center gap-1 glass-panel rounded-lg p-1 text-xs shadow-lg">
            <button
              onClick={fitToScreen}
              className="px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              Fit
            </button>
            <button
              onClick={() => setView({ x: 0, y: 0, k: 1 })}
              className="px-2 py-1 rounded hover:bg-secondary transition-colors"
            >
              100%
            </button>
            <span className="px-2 text-muted-foreground tabular-nums">
              {Math.round(view.k * 100)}%
            </span>
          </div>

          <div
            ref={canvasRef}
            className={cn(
              "absolute inset-0 overflow-hidden",
              panning || tool === "pan" ? "cursor-grabbing" : "cursor-default",
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
            <svg
              ref={svgRef}
              width={size.w}
              height={size.h}
              className="absolute inset-0 bg-hit"
              style={{ pointerEvents: "auto" }}
            >
              <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
                {/* Wires */}
                {Object.values(circuit.wires).map((w) => {
                  const a = circuit.components[w.from.comp];
                  const b = circuit.components[w.to.comp];
                  if (!a || !b) return null;
                  const p1 = pinPos(a, "out", w.from.pin);
                  const p2 = pinPos(b, "in", w.to.pin);
                  const live = !!a.outputs[w.from.pin];
                  return (
                    <WirePath
                      key={w.id}
                      p1={p1}
                      p2={p2}
                      live={live}
                      running={running}
                      style={wireStyle}
                      selected={selWires.has(w.id)}
                      onClick={(e: any) => {
                        e.stopPropagation();
                        setSelWires((s) => {
                          const n = new Set(s);

                          if (n.has(w.id)) {
                            n.delete(w.id);
                          } else {
                            n.add(w.id);
                          }

                          return n;
                        });
                      }}
                    />
                  );
                })}
                {/* Pending wire */}
                {pendingWire &&
                  (() => {
                    const src = circuit.components[pendingWire.from.comp];
                    if (!src) return null;
                    const p1 = pinPos(src, "out", pendingWire.from.pin);
                    return (
                      <WirePath
                        p1={p1}
                        p2={{ x: pendingWire.mx, y: pendingWire.my }}
                        live={false}
                        running={false}
                        style={wireStyle}
                        preview
                      />
                    );
                  })()}
                {/* Components */}
                {Object.values(circuit.components).map((c) => (
                  <GateNode
                    key={c.id}
                    comp={c}
                    selected={selection.has(c.id)}
                    onMouseDown={(e: React.MouseEvent) => startCompDrag(e, c)}
                    onClickBody={() => handleCompClick(c)}
                    onPinDown={(pin: number, kind: string, e: any) => {
                      if (kind === "out") startWire(e, c, pin);
                    }}
                    onPinUp={(pin: number, kind: string, e: any) => {
                      if (kind === "in") finishWire(e, c, pin);
                    }}
                  />
                ))}
                {/* Lasso */}
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
              <Minimap circuit={circuit} view={view} size={size} />
            )}

            {/* Empty state */}
            {Object.keys(circuit.components).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl glass-panel flex items-center justify-center">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-lg font-semibold">Start designing</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Drag a component from the toolbox onto the canvas.
                  </div>
                  <div className="text-xs text-muted-foreground mt-3">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border">
                      ⌘K
                    </kbd>{" "}
                    for the command palette
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right properties */}
        <aside className="w-72 shrink-0 border-l border-border bg-panel/60 flex flex-col">
          <PropertiesPanel
            comp={selectedComp}
            circuit={circuit}
            onUpdate={(id: string, patch: any) =>
              updateCircuit((c) => ({
                ...c,
                components: {
                  ...c.components,
                  [id]: { ...c.components[id], ...patch },
                },
              }))
            }
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
          />
          <ExplorerPanel
            circuit={circuit}
            selection={selection}
            setSelection={setSelection}
          />
        </aside>
      </div>

      {/* Bottom console */}
      <ConsolePanel
        tab={consoleTab}
        setTab={setConsoleTab}
        logs={logs}
        tick={tick}
        running={running}
        circuit={circuit}
      />

      {/* Status bar */}
      <div className="h-6 shrink-0 border-t border-border bg-panel/80 flex items-center gap-4 px-3 text-[11px] text-muted-foreground font-mono">
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              running ? "bg-signal-on" : "bg-muted-foreground/40",
            )}
          />
          {running ? "Running" : "Idle"}
        </span>
        <span>Tick {tick}</span>
        <span>{Object.keys(circuit.components).length} components</span>
        <span>{Object.keys(circuit.wires).length} wires</span>
        <span className="ml-auto">Digital Gate v1.0</span>
      </div>

      {cmdOpen && (
        <CommandPalette
          onClose={() => setCmdOpen(false)}
          actions={[
            { label: "Run simulation", action: () => setRunning(true) },
            { label: "Pause simulation", action: () => setRunning(false) },
            { label: "Reset simulation", action: resetSim },
            {
              label: "Toggle theme",
              action: () => setTheme(theme === "dark" ? "light" : "dark"),
            },
            { label: "Fit to screen", action: fitToScreen },
            { label: "Save project", action: saveProject },
            { label: "Export JSON", action: exportProject },
            {
              label: "New project",
              action: () => setCircuit({ components: {}, wires: {} }),
            },
            ...CATEGORIES.flatMap((cat) =>
              cat.gates.map((g) => ({
                label: `Add ${GATES[g].label}`,
                action: () => {
                  const def = GATES[g];
                  const id = uid();
                  const cx = (size.w / 2 - view.x) / view.k,
                    cy = (size.h / 2 - view.y) / view.k;
                  updateCircuit((c) => ({
                    ...c,
                    components: {
                      ...c.components,
                      [id]: {
                        id,
                        type: g,
                        x: snap(cx),
                        y: snap(cy),
                        state: def.initialState ? def.initialState() : null,
                        outputs: new Array(def.outputs).fill(false),
                        label: def.label,
                      },
                    },
                  }));
                },
              })),
            ),
          ]}
        />
      )}
    </div>
  );
}

/* --- Sub-components --- */

function TopBar(props: any) {
  const {
    running,
    setRunning,
    stepOnce,
    resetSim,
    tick,
    clockSpeed,
    setClockSpeed,
    undo,
    redo,
    canUndo,
    canRedo,
    theme,
    setTheme,
    saveProject,
    loadProject,
    exportProject,
    newProject,
    openCmd,
  } = props;
  return (
    <header className="h-12 shrink-0 border-b border-border bg-panel/80 backdrop-blur flex items-center gap-2 px-3">
      <div className="flex items-center gap-2 mr-2">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="font-bold tracking-tight">Digital Gate</div>
      </div>
      <div className="w-px h-6 bg-border" />
      <TBBtn
        onClick={newProject}
        icon={<Plus className="h-4 w-4" />}
        label="New"
      />
      <TBBtn
        onClick={loadProject}
        icon={<FolderOpen className="h-4 w-4" />}
        label="Open"
      />
      <TBBtn
        onClick={saveProject}
        icon={<Save className="h-4 w-4" />}
        label="Save"
      />
      <TBBtn
        onClick={exportProject}
        icon={<Save className="h-4 w-4 rotate-180" />}
        label="Export"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <TBBtn
        onClick={undo}
        disabled={!canUndo}
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
      />
      <TBBtn
        onClick={redo}
        disabled={!canRedo}
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
      />
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        size="sm"
        variant={running ? "secondary" : "default"}
        onClick={() => setRunning(!running)}
        className="h-8 gap-1.5"
      >
        {running ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
        {running ? "Pause" : "Run"}
      </Button>
      <TBBtn
        onClick={() => setRunning(false)}
        icon={<Square className="h-4 w-4" />}
        label="Stop"
      />
      <TBBtn
        onClick={stepOnce}
        icon={<StepForward className="h-4 w-4" />}
        label="Step"
      />
      <TBBtn
        onClick={resetSim}
        icon={<RotateCcw className="h-4 w-4" />}
        label="Reset"
      />
      <div className="flex items-center gap-2 ml-3 pl-3 border-l border-border">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="range"
          min={1}
          max={30}
          value={clockSpeed}
          onChange={(e) => setClockSpeed(Number(e.target.value))}
          className="w-24 accent-primary"
        />
        <span className="text-xs text-muted-foreground font-mono tabular-nums w-12">
          {clockSpeed} Hz
        </span>
      </div>
      <div className="text-xs text-muted-foreground font-mono ml-3">
        Tick <span className="text-foreground tabular-nums">{tick}</span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={openCmd}
          className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border border-border bg-background/40 hover:bg-secondary transition-colors text-muted-foreground"
        >
          <Command className="h-3 w-3" /> Palette
          <kbd className="ml-1 px-1 py-0.5 text-[10px] rounded bg-secondary border border-border">
            ⌘K
          </kbd>
        </button>
        <TBBtn
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          icon={
            theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          }
          label="Theme"
        />
      </div>
    </header>
  );
}

function TBBtn({ onClick, icon, label, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
    </button>
  );
}

function ToolBtn({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

function GateChip({
  type,
  onDragStart,
}: {
  type: string;
  onDragStart: () => void;
}) {
  const def = GATES[type];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/gate", type);
        onDragStart();
      }}
      className="group cursor-grab active:cursor-grabbing rounded-md border border-border bg-card/60 hover:border-primary/60 hover:bg-card px-2 py-2 text-xs transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col items-center gap-1"
    >
      <div className="h-8 w-full flex items-center justify-center rounded bg-background/60 border border-border/60 font-mono text-[13px] text-primary group-hover:signal-glow">
        {def.symbol ?? def.label.slice(0, 3)}
      </div>
      <div className="text-[10px] text-muted-foreground group-hover:text-foreground truncate w-full text-center">
        {def.label}
      </div>
    </div>
  );
}

function GridBackground({
  view,
  size,
}: {
  view: { x: number; y: number; k: number };
  size: { w: number; h: number };
}) {
  const step = GRID * view.k;
  const offX = view.x % step;
  const offY = view.y % step;
  return (
    <svg
      width={size.w}
      height={size.h}
      className="absolute inset-0 pointer-events-none"
    >
      <defs>
        <pattern
          id="grid-sm"
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
          x={offX}
          y={offY}
        >
          <circle cx={0} cy={0} r={1} fill="var(--color-grid)" />
        </pattern>
        <pattern
          id="grid-lg"
          width={step * 5}
          height={step * 5}
          patternUnits="userSpaceOnUse"
          x={offX}
          y={offY}
        >
          <path
            d={`M ${step * 5} 0 L 0 0 0 ${step * 5}`}
            stroke="var(--color-grid)"
            strokeWidth={0.6}
            fill="none"
            opacity={0.6}
          />
        </pattern>
      </defs>
      <rect width={size.w} height={size.h} fill="url(#grid-sm)" />
      <rect width={size.w} height={size.h} fill="url(#grid-lg)" />
    </svg>
  );
}

function WirePath({
  p1,
  p2,
  live,
  running,
  style,
  selected,
  preview,
  onClick,
}: any) {
  const d = style === "ortho" ? orthoPath(p1, p2) : bezierPath(p1, p2);
  const color = live ? "var(--color-signal-on)" : "var(--color-wire)";
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
      <path
        d={d}
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        fill="none"
        strokeDasharray={preview ? "5 5" : undefined}
        className={cn(live && running && "wire-flow", live && "signal-glow")}
        style={{ opacity: preview ? 0.7 : 1 }}
      />
    </g>
  );
}

function bezierPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
) {
  const dx = Math.max(40, Math.abs(p2.x - p1.x) / 2);
  return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
}
function orthoPath(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const mx = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`;
}

function GateNode({
  comp,
  selected,
  onMouseDown,
  onClickBody,
  onPinDown,
  onPinUp,
}: any) {
  const def = GATES[comp.type];
  const active = comp.outputs.some(Boolean) || comp.state?.on;
  const isIO = ["TOGGLE", "BUTTON", "CONST", "LED", "LAMP"].includes(comp.type);

  return (
    <g transform={`translate(${comp.x}, ${comp.y})`} onMouseDown={onMouseDown}>
      {/* selection glow */}
      {selected && (
        <rect
          x={-4}
          y={-4}
          width={def.width + 8}
          height={def.height + 8}
          rx={8}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      {/* body */}
      <rect
        x={0}
        y={0}
        width={def.width}
        height={def.height}
        rx={6}
        fill="var(--color-card)"
        stroke={active ? "var(--color-signal-on)" : "var(--color-border)"}
        strokeWidth={1.5}
        onClick={onClickBody}
        style={{ cursor: isIO ? "pointer" : "grab" }}
        className={cn(active && "signal-glow")}
      />
      {/* label */}
      <text
        x={def.width / 2}
        y={def.height / 2 + 5}
        textAnchor="middle"
        fill={active ? "var(--color-signal-on)" : "var(--color-foreground)"}
        fontSize={14}
        fontWeight={600}
        fontFamily="var(--font-mono)"
        pointerEvents="none"
      >
        {def.symbol ?? def.label}
      </text>
      <text
        x={def.width / 2}
        y={def.height + 14}
        textAnchor="middle"
        fill="var(--color-muted-foreground)"
        fontSize={9}
        pointerEvents="none"
      >
        {comp.label ?? def.label}
      </text>
      {/* LED/Lamp visual */}
      {(comp.type === "LED" || comp.type === "LAMP") && (
        <circle
          cx={def.width / 2}
          cy={def.height / 2 - 4}
          r={8}
          fill={
            comp.state?.on
              ? "var(--color-signal-on)"
              : "var(--color-signal-off)"
          }
          className={cn(comp.state?.on && "signal-glow")}
        />
      )}
      {/* pins */}
      {Array.from({ length: def.inputs }).map((_, i) => {
        const y = (def.height / (def.inputs + 1)) * (i + 1);
        return (
          <g key={`in-${i}`}>
            <line
              x1={-8}
              y1={y}
              x2={0}
              y2={y}
              stroke="var(--color-wire)"
              strokeWidth={1.5}
            />
            <circle
              cx={-8}
              cy={y}
              r={5}
              fill="var(--color-background)"
              stroke="var(--color-wire)"
              strokeWidth={1.5}
              onMouseDown={(e: any) => onPinDown(i, "in", e)}
              onMouseUp={(e: any) => onPinUp(i, "in", e)}
              style={{ cursor: "crosshair" }}
              className="hover:stroke-primary"
            />
          </g>
        );
      })}
      {Array.from({ length: def.outputs }).map((_, i) => {
        const y = (def.height / (def.outputs + 1)) * (i + 1);
        const on = !!comp.outputs[i];
        return (
          <g key={`out-${i}`}>
            <line
              x1={def.width}
              y1={y}
              x2={def.width + 8}
              y2={y}
              stroke={on ? "var(--color-signal-on)" : "var(--color-wire)"}
              strokeWidth={1.5}
            />
            <circle
              cx={def.width + 8}
              cy={y}
              r={5}
              fill={on ? "var(--color-signal-on)" : "var(--color-background)"}
              stroke={on ? "var(--color-signal-on)" : "var(--color-wire)"}
              strokeWidth={1.5}
              onMouseDown={(e: any) => onPinDown(i, "out", e)}
              onMouseUp={(e: any) => onPinUp(i, "out", e)}
              style={{ cursor: "crosshair" }}
              className={cn("hover:stroke-primary", on && "signal-glow")}
            />
          </g>
        );
      })}
    </g>
  );
}

function PropertiesPanel({ comp, onUpdate, onDelete, onDuplicate }: any) {
  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        <Settings2 className="h-3.5 w-3.5" /> Properties
      </div>
      {!comp ? (
        <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
          Select a component to edit its properties.
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">
              Type
            </div>
            <div className="text-sm font-mono text-primary">
              {GATES[comp.type].label}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">
              Label
            </label>
            <Input
              value={comp.label ?? ""}
              onChange={(e) => onUpdate(comp.id, { label: e.target.value })}
              className="h-8 mt-1 bg-background/60"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">
                X
              </label>
              <Input
                type="number"
                value={comp.x}
                onChange={(e) =>
                  onUpdate(comp.id, { x: Number(e.target.value) })
                }
                className="h-8 mt-1 bg-background/60"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">
                Y
              </label>
              <Input
                type="number"
                value={comp.y}
                onChange={(e) =>
                  onUpdate(comp.id, { y: Number(e.target.value) })
                }
                className="h-8 mt-1 bg-background/60"
              />
            </div>
          </div>
          {(comp.type === "TOGGLE" || comp.type === "CONST") && (
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">
                State
              </label>
              <button
                onClick={() =>
                  onUpdate(comp.id, {
                    state: { ...(comp.state ?? {}), on: !comp.state?.on },
                  })
                }
                className={cn(
                  "mt-1 w-full h-8 rounded-md border text-xs font-mono transition-colors",
                  comp.state?.on
                    ? "bg-signal-on/20 border-signal-on text-signal-on signal-glow"
                    : "bg-background/60 border-border text-muted-foreground",
                )}
              >
                {comp.state?.on ? "HIGH (1)" : "LOW (0)"}
              </button>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase text-muted-foreground mb-1">
              Live Outputs
            </div>
            <div className="flex gap-1 flex-wrap">
              {comp.outputs.length === 0 ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                comp.outputs.map((o: boolean, i: number) => (
                  <span
                    key={i}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-mono border",
                      o
                        ? "bg-signal-on/20 border-signal-on text-signal-on"
                        : "bg-secondary border-border text-muted-foreground",
                    )}
                  >
                    {i}: {o ? "1" : "0"}
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              onClick={onDuplicate}
              className="flex-1 h-8 gap-1"
            >
              <Copy className="h-3 w-3" /> Duplicate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="flex-1 h-8 gap-1 hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExplorerPanel({ circuit, selection, setSelection }: any) {
  const groups: Record<string, CircuitComp[]> = {};
  for (const c of Object.values(circuit.components) as CircuitComp[]) {
    const cat = GATES[c.type].category;
    (groups[cat] ||= []).push(c);
  }
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
        <Cpu className="h-3.5 w-3.5" /> Circuit Explorer
      </div>
      {Object.keys(groups).length === 0 && (
        <div className="text-xs text-muted-foreground py-4 text-center">
          Empty circuit.
        </div>
      )}
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat} className="mb-2">
          <div className="text-[10px] uppercase text-muted-foreground py-1">
            {cat} · {list.length}
          </div>
          <div className="space-y-0.5">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelection(new Set([c.id]))}
                className={cn(
                  "w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 hover:bg-secondary transition-colors",
                  selection.has(c.id) && "bg-primary/20 text-primary",
                )}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {GATES[c.type].symbol}
                </span>
                <span className="truncate">
                  {c.label ?? GATES[c.type].label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsolePanel({ tab, setTab, logs, tick, running, circuit }: any) {
  const [open, setOpen] = useState(true);
  const tabs = [
    { id: "log", label: "Simulation Log", icon: Terminal },
    { id: "err", label: "Errors", icon: AlertTriangle },
    { id: "warn", label: "Warnings", icon: AlertTriangle },
    { id: "timeline", label: "Event Timeline", icon: Activity },
    { id: "perf", label: "Performance", icon: Cpu },
  ];
  const filtered =
    tab === "err"
      ? logs.filter((l: any) => l.kind === "err")
      : tab === "warn"
        ? logs.filter((l: any) => l.kind === "warn")
        : logs;
  return (
    <div
      className={cn(
        "shrink-0 border-t border-border bg-panel/80 transition-all",
        open ? "h-48" : "h-8",
      )}
    >
      <div className="h-8 flex items-center gap-1 px-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setOpen(true);
            }}
            className={cn(
              "h-7 px-2.5 text-xs rounded flex items-center gap-1.5 transition-colors",
              tab === t.id && open
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-3 w-3" /> {t.label}
          </button>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground px-2"
        >
          {open ? "▼" : "▲"}
        </button>
      </div>
      {open && (
        <div className="h-40 overflow-y-auto p-2 font-mono text-[11px]">
          {tab === "perf" ? (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <PerfCard
                label="Components"
                value={Object.keys(circuit.components).length}
              />
              <PerfCard
                label="Wires"
                value={Object.keys(circuit.wires).length}
              />
              <PerfCard label="Tick" value={tick} />
              <PerfCard label="Status" value={running ? "Running" : "Idle"} />
            </div>
          ) : tab === "timeline" ? (
            <div className="space-y-1">
              {logs.slice(-20).map((l: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {new Date(l.t).toLocaleTimeString()}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground text-center py-6">
              No entries.
            </div>
          ) : (
            filtered.map((l: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "py-0.5",
                  l.kind === "err" && "text-destructive",
                  l.kind === "warn" && "text-accent",
                )}
              >
                <span className="text-muted-foreground">
                  [{new Date(l.t).toLocaleTimeString()}]
                </span>{" "}
                {l.msg}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
function PerfCard({ label, value }: any) {
  return (
    <div className="rounded-md border border-border bg-card/60 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function Minimap({
  circuit,
  view,
  size,
}: {
  circuit: Circuit;
  view: any;
  size: any;
}) {
  const w = 180,
    h = 120;
  const comps = Object.values(circuit.components);
  if (!comps.length) return null;
  let minX = 0,
    minY = 0,
    maxX = 400,
    maxY = 300;
  for (const c of comps) {
    const d = GATES[c.type];
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + d.width);
    maxY = Math.max(maxY, c.y + d.height);
  }
  const pad = 40;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const sx = w / (maxX - minX),
    sy = h / (maxY - minY);
  const s = Math.min(sx, sy);
  const vx = (-view.x / view.k - minX) * s,
    vy = (-view.y / view.k - minY) * s;
  const vw = (size.w / view.k) * s,
    vh = (size.h / view.k) * s;
  return (
    <div className="absolute bottom-3 right-3 glass-panel rounded-md p-1 shadow-lg pointer-events-none">
      <svg width={w} height={h}>
        {comps.map((c) => {
          const d = GATES[c.type];
          return (
            <rect
              key={c.id}
              x={(c.x - minX) * s}
              y={(c.y - minY) * s}
              width={d.width * s}
              height={d.height * s}
              fill="var(--color-primary)"
              opacity={0.6}
            />
          );
        })}
        <rect
          x={vx}
          y={vy}
          width={vw}
          height={vh}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

function CommandPalette({
  actions,
  onClose,
}: {
  actions: { label: string; action: () => void }[];
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const filtered = actions
    .filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);
  return (
    <div
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="w-[520px] glass-panel rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown")
                setI((v) => Math.min(v + 1, filtered.length - 1));
              if (e.key === "ArrowUp") setI((v) => Math.max(v - 1, 0));
              if (e.key === "Enter" && filtered[i]) {
                filtered[i].action();
                onClose();
              }
              if (e.key === "Escape") onClose();
            }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent h-12 text-sm outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {filtered.map((a, idx) => (
            <button
              key={a.label}
              onClick={() => {
                a.action();
                onClose();
              }}
              onMouseEnter={() => setI(idx)}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                idx === i
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary",
              )}
            >
              {a.label}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No commands found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
