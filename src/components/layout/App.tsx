import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  Cpu,
  Grid3x3,
  Hand,
  MousePointer2,
  Package,
  Search,
  Upload,
} from "lucide-react";

import {
  BitLabLogo,
  BusWirePath,
  EmptyCanvas,
  GateChip,
  GateNode,
  Input,
  ToolBtn,
  WirePath,
} from "@/components/ui";
import type { CircuitSnapshot, ComponentInstance, SignalValue } from "@/engine";
import { library, LogicValue } from "@/engine";
import {
  GATE_CATEGORY_CUSTOM,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_TOGGLE,
  SIMULATION_STATUS,
} from "@/engine/constants";
import { useDigitalEngine } from "@/hooks";
import {
  busPortPos,
  computeBusWireGroups,
  getRotatedSize,
  pinDirection,
  pinPos,
} from "@/lib/circuit";
import {
  BASE_LOG,
  CONSOLE_TAB,
  CUSTOM_CIR_KEYS,
  DEFAULT_CLOCK,
  GATE_CATEGORY_LABELS,
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
import { cn, fm, getGateLabel, initializeLogger, snap } from "@/lib/utils";

import BottomBar from "./BottomBar";
import CircuitViewer from "./CircuitViewer";
import CommandPalette from "./CommandPalette";
import ConsolePanel from "./ConsolePanel";
import ExplorerPanel from "./ExplorerPanel";
import GateProperties from "./GateProperties";
import GridBackground from "./GridBackground";
import Minimap from "./Minimap";
import TopBar from "./TopBar";
import WireProperties from "./WireProperties";
import CategoryPanel from "./CategoryPanel";

const BUILT_IN_OPEN = Object.fromEntries(
  library.getCategories().map((c) => [c.name, true]),
);

/**
 * DigitalGateApp
 */
function DigitalGateApp() {
  const intl = useIntl();

  // States
  const [theme, setTheme] = useState<Theme>(THEME.LIGHT);
  const [clockSpeed, setClockSpeed] = useState(DEFAULT_CLOCK);
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
  const isRunning = status === SIMULATION_STATUS.RUNNING;
  const { tick } = stats;

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selWires, setSelWires] = useState<Set<string>>(new Set());
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>(CONSOLE_TAB.LOG);
  const [wireStyle, setWireStyle] = useState<WireType>(WIRE_TYPE.BEZIER);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showMinimap] = useState(true);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({
    ...BUILT_IN_OPEN,
    [GATE_CATEGORY_CUSTOM]: true,
  });
  const [customBump, setCustomBump] = useState(0);
  const [viewingCircuit, setViewingCircuit] = useState<{
    name: string;
    circuit: CircuitSnapshot;
  } | null>(null);

  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [pendingWire, setPendingWire] = useState<{
    from: { comp: string; pin: number };
    mx: number;
    my: number;
    isBus?: boolean;
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

  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const clipboardRef = useRef<string[]>([]);

  const handleLoadProject = useCallback(() => {
    loadProjectFromLocal();

    // After loading, check if any canvas components have broken custom gate types
    setTimeout(() => {
      const current = snapshot;

      for (const comp of Object.values(current.components)) {
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
    try {
      const raw = localStorage.getItem(CUSTOM_CIR_KEYS);

      if (!raw) return;

      const saved = JSON.parse(raw) as {
        type?: string;
        name: string;
        circuit: CircuitSnapshot;
      }[];

      let anyRegistered = false;

      // First pass: register all gates, tracking name → assigned type for
      // backward-compat migration when stored data lacks a stable type field.
      const nameToType = new Map<string, string>();

      for (const entry of saved) {
        const assigned = library.registerCustomCircuit(
          entry.name,
          entry.circuit,
          entry.type,
        );

        if (assigned) {
          anyRegistered = true;
          nameToType.set(entry.name, assigned);
        }
      }

      // After all gates are loaded, check for broken dependencies.
      // If any are found, attempt to remap stale type references from older
      // sessions (where type IDs were not persisted) by matching the name
      // prefix (CUSTOM_{NAME}_*).
      if (anyRegistered) {
        // Build a lookup: normalized name prefix → current registered type
        const prefixToType = new Map<string, string>();

        for (const [name, assignedType] of nameToType) {
          const prefix = `CUSTOM_${name.replace(/\W+/g, "_").toUpperCase()}_`;

          prefixToType.set(prefix, assignedType);
        }

        let remapped = false;

        for (const meta of library.getCustomGates()) {
          if (library.hasValidDependencies(meta.type)) continue;

          // Try to remap broken references in this gate's circuit
          const remappedCircuit = {
            ...meta.circuit,
            components: { ...meta.circuit.components },
          };
          let fixed = false;

          for (const [id, comp] of Object.entries(remappedCircuit.components)) {
            if (library.has(comp.type)) continue;
            if (!comp.type.startsWith("CUSTOM_")) continue;

            // Find matching prefix
            for (const [prefix, newType] of prefixToType) {
              if (comp.type.startsWith(prefix) || comp.type === newType) {
                remappedCircuit.components[id] = { ...comp, type: newType };
                fixed = true;

                break;
              }
            }
          }

          if (fixed) {
            // Re-register with the corrected circuit
            library.unregister(meta.type, true);
            library.registerCustomCircuit(
              meta.name,
              remappedCircuit,
              meta.type,
            );
            remapped = true;
          }
        }

        // Final validation pass
        for (const def of library.getAll()) {
          if (
            library.isCustom(def.type) &&
            !library.hasValidDependencies(def.type)
          ) {
            addLog(
              CONSOLE_TAB.ERROR,
              `Custom gate "${getGateLabel(def.type, def.label)}" has missing dependencies. Re-import the required sub-circuit.`,
            );
          }
        }

        // If we remapped any references, persist the corrected data
        if (remapped) {
          const gates = library.getCustomGates();

          localStorage.setItem(
            CUSTOM_CIR_KEYS,
            JSON.stringify(
              gates.map((m) => ({
                type: m.type,
                name: m.name,
                circuit: m.circuit,
              })),
            ),
          );
        }

        setCustomBump((v) => v + 1);
      }
    } catch {
      // corrupt or missing storage — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (!type || !library.has(type)) return;

    // Block dropping custom gates with missing dependencies
    if (library.isCustom(type) && !library.hasValidDependencies(type)) {
      addLog(
        CONSOLE_TAB.ERROR,
        `Cannot add "${getGateLabel(type, library.get(type).label)}": missing dependency. Re-import the required sub-circuit first.`,
      );

      setDragType(null);

      return;
    }

    const def = library.get(type);
    const { x, y } = toWorld(e.clientX, e.clientY);
    const nx = snapEnabled ? snap(x - def.width / 2) : x - def.width / 2;
    const ny = snapEnabled ? snap(y - def.height / 2) : y - def.height / 2;
    const comp = addComponent(type, nx, ny);

    addLog(
      CONSOLE_TAB.LOG,
      `Added ${getGateLabel(def.type, def.label)} (${comp.id})`,
    );

    if (SAVE_LOCAL_ON_ACTION) saveProjectToLocal();

    setDragType(null);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();

      const rect = canvasRef.current?.getBoundingClientRect();

      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const k = Math.min(
        3,
        Math.max(0.2, view.k * (e.deltaY < 0 ? 1.05 : 0.95)),
      );
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

      if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
        setSelection(new Set());
        setSelWires(new Set());
      }
    }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (panning && panStartRef.current) {
      const pan = panStartRef.current;

      setView((v) => ({
        ...v,
        x: pan.vx + (e.clientX - pan.x),
        y: pan.vy + (e.clientY - pan.y),
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
        if (!library.has(c.type)) continue;

        const def = library.get(c.type);
        const sz = getRotatedSize(c, def);

        if (c.x + sz.w >= x && c.x <= x + w && c.y + sz.h >= y && c.y <= y + h)
          sel.add(c.id);
      }

      setSelection(sel);
      setLasso(null);
    }

    if (pendingWire) setPendingWire(null);
  };

  const startCompDrag = (e: React.MouseEvent, c: ComponentInstance) => {
    e.stopPropagation();

    const multiSelect = e.metaKey || e.ctrlKey;

    // Deselect all wires
    setSelWires(new Set());

    if (multiSelect) {
      // Toggle this component in the selection
      setSelection((s) => {
        const n = new Set(s);

        if (n.has(c.id)) n.delete(c.id);
        else n.add(c.id);

        return n;
      });
    } else if (!selection.has(c.id)) {
      setSelection(new Set([c.id]));
    }

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
    const isBus =
      pin === -1 &&
      library.has(comp.type) &&
      library.get(comp.type).isBusOutput === true;

    setPendingWire({ from: { comp: comp.id, pin }, mx: p.x, my: p.y, isBus });
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

    // ── Bus wire variant ────────────────────────────────────────────────────
    if (pendingWire.isBus) {
      // Bus wire must connect to a bus input port
      if (!library.has(comp.type)) {
        setPendingWire(null);

        return;
      }

      const targetDef = library.get(comp.type);

      if (!targetDef.isBusInput) {
        addLog(
          CONSOLE_TAB.WARN,
          "Bus wire can only connect to a bus input port",
        );
        setPendingWire(null);

        return;
      }

      // Get source component def for output count
      const srcComp = snapshot.components[pendingWire.from.comp];

      if (!srcComp || !library.has(srcComp.type)) {
        setPendingWire(null);

        return;
      }

      let created = 0;
      const sourceDef = library.get(srcComp.type);
      const wireCount = Math.min(sourceDef.outputs, targetDef.inputs);

      for (let i = 0; i < wireCount; i += 1) {
        const wire = addWire(pendingWire.from.comp, i, comp.id, i);

        if (wire) created += 1;
      }

      if (created > 0) addLog("log", `Bus connected: ${created} wires created`);
      if (SAVE_LOCAL_ON_ACTION) saveProjectToLocal();

      setPendingWire(null);

      return;
    }

    // ── Non-bus wire attempting to connect to bus input port ─────────────────
    if (pin === -1) {
      if (library.has(comp.type) && library.get(comp.type).isBusInput)
        addLog(CONSOLE_TAB.WARN, "Use a bus wire to connect to this port");

      setPendingWire(null);

      return;
    }

    // ── Regular wire ────────────────────────────────────────────────────────
    const wire = addWire(
      pendingWire.from.comp,
      pendingWire.from.pin,
      comp.id,
      pin,
    );

    if (wire) addLog("log", `Wire connected (${wire.id})`);
    if (SAVE_LOCAL_ON_ACTION) saveProjectToLocal();

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
    if (c.type === GATE_TYPE_DIGIT_BIN)
      setInput(c.id, { digit: (((c.state?.digit as number) ?? -1) + 1) % 10 });
  };

  const saveCustomCircuitToLocal = useCallback(() => {
    try {
      const gates = library.getCustomGates();

      localStorage.setItem(
        CUSTOM_CIR_KEYS,
        JSON.stringify(
          gates.map((m) => ({
            type: m.type,
            name: m.name,
            circuit: m.circuit,
          })),
        ),
      );
    } catch {
      // localStorage unavailable
    }
  }, []);

  const createCircuitFromGates = () => {
    if (Object.keys(snapshot.components).length === 0) {
      addLog(CONSOLE_TAB.WARN, "Cannot create a gate from an empty circuit.");

      return;
    }

    // eslint-disable-next-line no-alert
    const name = window.prompt('Name your circuit (e.g. "4-bit Adder")');

    if (!name) return;

    // Deep-copy the snapshot so the stored circuit is immune to later canvas edits
    const type = library.registerCustomCircuit(
      name.trim(),
      structuredClone(snapshot),
    );

    if (!type) {
      addLog(
        CONSOLE_TAB.ERROR,
        "Gate needs at least one input (Toggle/Button/Const/Clock) or output (LED).",
      );

      return;
    }

    setOpenCats((o) => ({ ...o, [GATE_CATEGORY_CUSTOM]: true }));
    setCustomBump((v) => v + 1);

    saveCustomCircuitToLocal();
    addLog(
      CONSOLE_TAB.LOG,
      `Registered custom gate "${name}". Drag it from the Custom category.`,
    );
  };

  const importCustomCircuitFromFile = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    const suggested = file.name
      .replace(/\.(bitlab|circuit|dgate|json)$/g, "")
      .replace(/\./g, "")
      .replace(/\s+/g, "-");

    file
      .text()
      .then((text) => {
        try {
          const parsed = JSON.parse(text);

          // Detect format: full project vs raw circuit snapshot
          let circuitData: CircuitSnapshot;

          if (parsed.circuit && parsed.version !== undefined) {
            // Full project format — extract the circuit
            circuitData = parsed.circuit as CircuitSnapshot;
          } else if (parsed.components) {
            // Raw CircuitSnapshot
            circuitData = parsed as CircuitSnapshot;
          } else {
            throw new Error("Unrecognized JSON format");
          }

          if (
            !circuitData.components ||
            typeof circuitData.components !== "object"
          )
            throw new Error("Invalid circuit file");

          // eslint-disable-next-line no-alert
          const name = window.prompt("Circuit name", suggested) || suggested;

          const type = library.registerCustomCircuit(name.trim(), circuitData);

          if (!type) {
            addLog(
              CONSOLE_TAB.ERROR,
              "Imported circuit has no I/O components (add Toggles / LEDs to define pins).",
            );

            return;
          }

          // Warn if the imported gate has unresolved dependencies
          if (!library.hasValidDependencies(type)) {
            addLog(
              CONSOLE_TAB.WARN,
              `"${name}" references sub-circuits not yet imported. Import those first or it will not function correctly.`,
            );
          }

          setOpenCats((o) => ({ ...o, [GATE_CATEGORY_CUSTOM]: true }));
          setCustomBump((v) => v + 1);

          saveCustomCircuitToLocal();

          addLog(CONSOLE_TAB.LOG, `Imported "${name}" as custom gate.`);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);

          addLog(CONSOLE_TAB.ERROR, `Import failed: ${msg}`);
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);

        addLog(CONSOLE_TAB.ERROR, `File read failed: ${msg}`);
      });
  };

  const removeCustomCircuit = (type: string) => {
    const error = library.unregister(type);

    if (error) {
      addLog(CONSOLE_TAB.ERROR, error);

      return;
    }

    setCustomBump((v) => v + 1);
    saveCustomCircuitToLocal();
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
      if (!library.has(c.type)) continue;

      const d = library.get(c.type);

      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      const sz = getRotatedSize(c, d);

      maxX = Math.max(maxX, c.x + sz.w);
      maxY = Math.max(maxY, c.y + sz.h);
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

      const inInput =
        (e.target as HTMLElement).tagName === "INPUT" ||
        (e.target as HTMLElement).tagName === "TEXTAREA";

      if (e.key === "Delete" || e.key === "Backspace") {
        if (inInput) return;

        deleteSelected();

        return;
      }

      if (inInput) return;

      e.preventDefault();

      // if (e.key === " " && isRunning) pause();
      // if (e.key === " ") start();
      if (meta && e.key.toLowerCase() === "k") setCmdOpen((v) => !v);
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) undo();
      if (meta && e.key.toLowerCase() === "d") duplicateSelected();
      if (meta && e.key.toLowerCase() === "s") saveProjectToLocal();
      if (meta && e.key.toLowerCase() === "c" && selection.size > 0) {
        clipboardRef.current = Array.from(selection);
      }
      if (
        meta &&
        e.key.toLowerCase() === "v" &&
        clipboardRef.current.length > 0
      ) {
        const idMap = duplicateComponents(clipboardRef.current);
        // Update clipboard to point to the new copies so next paste offsets from these
        clipboardRef.current = Array.from(idMap.values());

        setSelection(new Set(idMap.values()));
        setSelWires(new Set());
      }
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
  }, [deleteSelected, isRunning]);

  // Always include the Custom category so the empty-state hint is always shown.
  const liveGateCategories = useMemo(() => {
    const cats = library.getCategories();

    if (!cats.some((c) => c.name === GATE_CATEGORY_CUSTOM)) {
      cats.push({ name: GATE_CATEGORY_CUSTOM, gates: [] });
    }

    return cats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customBump]);

  const filteredCats = useMemo(() => {
    if (!search) return liveGateCategories;

    const q = search.toLowerCase();

    return liveGateCategories
      .map((c) => ({
        ...c,
        gates: c.gates.filter(
          (g) =>
            (library.has(g) &&
              getGateLabel(g, library.get(g).label)
                .toLowerCase()
                .includes(q)) ||
            g.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.gates.length);
  }, [search, liveGateCategories]);

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

  return (
    <div className="h-full w-full flex flex-col text-foreground bg-background overflow-hidden font-display">
      {/* Hidden file input for importing circuits as gates */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json,.bitlab.json,.circuit.json,.dgate.json"
        className="hidden"
        onChange={importCustomCircuitFromFile}
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
        theme={theme}
        setTheme={setTheme}
        saveProjectToLocal={saveProjectToLocal}
        loadProjectFromLocal={handleLoadProject}
        exportProject={exportJSON}
        importToCanvas={() => {
          importJSON().then((success) => {
            if (success) {
              addLog(CONSOLE_TAB.LOG, "Circuit imported to canvas.");
            } else {
              addLog(
                CONSOLE_TAB.ERROR,
                "Failed to import circuit. Check that the file is a valid exported project JSON.",
              );
            }
          });
        }}
        newProject={newProject}
        openCmd={() => setCmdOpen(true)}
        createCircuitFromGates={createCircuitFromGates}
        importCircuit={() => fileInputRef.current?.click()}
        hasComponents={Object.keys(snapshot.components).length > 0}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left toolbox */}
        <CategoryPanel
          onDragStart={setDragType}
          onRemoveCustom={removeCustomCircuit}
          onInspectCustom={(name, circuit) => setViewingCircuit({ name, circuit })}
          customBump={customBump}
        />

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
                  if (busWireIdSet.has(w.id)) return null;

                  const p1 = pinPos(a, PIN_KIND.OUT, w.from.pin);
                  const p2 = pinPos(b, PIN_KIND.IN, w.to.pin);
                  const signal = a.outputs[w.from.pin] ?? LogicValue.ZERO;
                  const isLive = signal === LogicValue.ONE;
                  const d1 = pinDirection(a, PIN_KIND.OUT);
                  const d2 = pinDirection(b, PIN_KIND.IN);

                  return (
                    <WirePath
                      key={w.id}
                      p1={p1}
                      p2={p2}
                      isLive={isLive}
                      signal={signal}
                      isRunning={isRunning}
                      style={wireStyle}
                      dir1={d1}
                      dir2={d2}
                      isSelected={selWires.has(w.id)}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();

                        const multi = e.metaKey || e.ctrlKey;

                        setSelection(new Set());

                        if (multi) {
                          setSelWires((s) => {
                            const n = new Set(s);

                            if (n.has(w.id)) n.delete(w.id);
                            else n.add(w.id);

                            return n;
                          });
                        } else {
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

                  const p1 = busPortPos(sourceComp, PIN_KIND.OUT);
                  const p2 = busPortPos(targetComp, PIN_KIND.IN);
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

                        setSelection(new Set());

                        if (multi) {
                          setSelWires((s) => {
                            const n = new Set(s);

                            for (const id of group.wireIds) n.add(id);

                            return n;
                          });
                        } else {
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
                      const p1 = busPortPos(src, PIN_KIND.OUT);
                      const def = library.has(src.type)
                        ? library.get(src.type)
                        : null;
                      const width = def ? def.outputs : 4;
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
                        isLive={false}
                        isRunning={false}
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
            {Object.keys(snapshot.components).length === 0 && <EmptyCanvas />}
          </div>
        </main>

        {/* Right properties */}
        <aside className="w-72 shrink-0 border-l border-border bg-panel/60 flex flex-col">
          {/* Properties */}
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
          {/* Circuit configs */}
          <ExplorerPanel
            snapshot={snapshot}
            selection={selection}
            selWires={selWires}
            setSelection={setSelection}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
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
            ...liveGateCategories.flatMap((cat) =>
              cat.gates.map((g) => ({
                label: `Add ${library.has(g) ? getGateLabel(g, library.get(g).label) : g}`,
                action: () => {
                  if (!library.has(g)) return;

                  if (library.isCustom(g) && !library.hasValidDependencies(g)) {
                    addLog(
                      CONSOLE_TAB.ERROR,
                      `Cannot add "${getGateLabel(g, library.get(g).label)}": missing dependency.`,
                    );

                    return;
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
    </div>
  );
}

export default DigitalGateApp;
