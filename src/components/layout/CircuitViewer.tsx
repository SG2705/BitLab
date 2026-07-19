/**
 * CircuitViewer — interactive read-only modal showing a custom gate's internal circuit.
 *
 * Features:
 *   - Renders all components and wires from the stored CircuitSnapshot
 *   - Pan and zoom support
 *   - Input components are clickable (Toggle, Button, Const, Digit→Bin, Bus Input)
 *   - Simulation runs live so outputs update based on inputs
 *   - Reset button to restore all inputs to initial state
 *   - Clock controls (play/pause/step)
 *   - Export as JSON
 *   - Components and wires are NOT editable
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Download,
  Pause,
  Play,
  RotateCcw,
  StepForward,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { BusWirePath, GateNode, WirePath } from "@/components/ui";
import { CircuitManager, library } from "@/engine";
import {
  GATE_TYPE_BUS_INPUT4,
  GATE_TYPE_BUS_INPUT8,
  GATE_TYPE_BUS_INPUT16,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_TOGGLE,
} from "@/engine/constants";
import type { CircuitSnapshot, SignalValue } from "@/engine/types";
import { LogicValue } from "@/engine/types";
import {
  busPortPos,
  computeBusWireGroups,
  pinDirection,
  pinPos,
} from "@/lib/circuit";
import { PIN_KIND, WIRE_TYPE } from "@/lib/constants";

interface CircuitViewerProps {
  name: string;
  circuit: CircuitSnapshot;
  onClose: () => void;
}

/**
 * CircuitViewer
 */
function CircuitViewer({ name, circuit, onClose }: CircuitViewerProps) {
  const intl = useIntl();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 50, y: 50, k: 1 });
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [panning, setPanning] = useState(false);
  const panStartRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);

  // Create a standalone simulation engine for this circuit
  const managerRef = useRef<CircuitManager | null>(null);
  const [snapshot, setSnapshot] = useState<CircuitSnapshot>(circuit);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const mgr = new CircuitManager();

    mgr.loadSnapshot(structuredClone(circuit));
    managerRef.current = mgr;
    setSnapshot(mgr.getSnapshot());

    // Listen for state changes
    const unsub = mgr.on((event) => {
      if (event.type === "snapshot-changed") {
        setSnapshot(mgr.getSnapshot());
      }

      if (event.type === "started") setIsRunning(true);
      if (event.type === "paused") setIsRunning(false);
    });

    return () => {
      unsub();
      mgr.stopSimulation();
    };
  }, [circuit]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );

    ro.observe(el);

    // eslint-disable-next-line consistent-return
    return () => ro.disconnect();
  }, []);

  // Fit to content on mount
  useEffect(() => {
    const comps = Object.values(circuit.components);

    if (comps.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const c of comps) {
      if (!library.has(c.type)) continue;

      const def = library.get(c.type);

      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + def.width);
      maxY = Math.max(maxY, c.y + def.height);
    }

    const w = maxX - minX + 100;
    const h = maxY - minY + 100;
    const k = Math.min(size.w / w, size.h / h, 1.5);

    setView({
      x: -minX * k + (size.w - w * k) / 2 + 50,
      y: -minY * k + (size.h - h * k) / 2 + 50,
      k,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const k = Math.min(
        4,
        Math.max(0.2, view.k * (e.deltaY < 0 ? 1.08 : 0.92)),
      );
      const nx = mx - (mx - view.x) * (k / view.k);
      const ny = my - (my - view.y) * (k / view.k);

      setView({ x: nx, y: ny, k });
    },
    [view],
  );

  const onMouseDown = (e: React.MouseEvent) => {
    setPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vx: view.x,
      vy: view.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!panning || !panStartRef.current) return;

    const pan = panStartRef.current;

    setView((v) => ({
      ...v,
      x: pan.vx + (e.clientX - pan.x),
      y: pan.vy + (e.clientY - pan.y),
    }));
  };

  const onMouseUp = () => {
    setPanning(false);
    panStartRef.current = null;
  };

  // Input interaction handlers
  const handleCompClick = useCallback((compId: string) => {
    const mgr = managerRef.current;

    if (!mgr) return;

    const comp = mgr.getComponent(compId);

    if (!comp) return;

    if (comp.type === GATE_TYPE_TOGGLE || comp.type === GATE_TYPE_CONST) {
      mgr.setInput(compId, { on: !comp.state?.on });
    } else if (comp.type === GATE_TYPE_DIGIT_BIN) {
      mgr.setInput(compId, {
        digit: (((comp.state?.digit as number) ?? -1) + 1) % 10,
      });
    } else if (
      comp.type === GATE_TYPE_BUS_INPUT4 ||
      comp.type === GATE_TYPE_BUS_INPUT8 ||
      comp.type === GATE_TYPE_BUS_INPUT16
    ) {
      const current = (comp.state?.signal as number) ?? LogicValue.ZERO;
      const order = [
        LogicValue.ZERO,
        LogicValue.ONE,
        LogicValue.UNKNOWN,
        LogicValue.HIGH_IMPEDANCE,
      ];
      const idx = order.indexOf(current);
      const next = order[(idx + 1) % order.length];

      mgr.setInput(compId, { signal: next });
    }

    setSnapshot(mgr.getSnapshot());
  }, []);

  const handleButtonDown = useCallback((compId: string) => {
    const mgr = managerRef.current;

    if (!mgr) return;

    mgr.setInput(compId, { on: true });
    setSnapshot(mgr.getSnapshot());
  }, []);

  const handleButtonUp = useCallback((compId: string) => {
    const mgr = managerRef.current;

    if (!mgr) return;

    mgr.setInput(compId, { on: false });
    setSnapshot(mgr.getSnapshot());
  }, []);

  // Simulation controls
  const handleStart = () => {
    managerRef.current?.startSimulation();
  };

  const handlePause = () => {
    managerRef.current?.pauseSimulation();
  };

  const handleStep = () => {
    managerRef.current?.stepSimulation();
    setSnapshot(managerRef.current?.getSnapshot() ?? snapshot);
  };

  const handleReset = () => {
    const mgr = managerRef.current;

    if (!mgr) return;

    mgr.stopSimulation();
    mgr.loadSnapshot(structuredClone(circuit));
    setIsRunning(false);
    setSnapshot(mgr.getSnapshot());
  };

  const exportJSON = () => {
    const json = JSON.stringify(circuit, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.circuit.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // Determine if a component is an interactive input
  const isInputComp = (type: string): boolean =>
    type === GATE_TYPE_TOGGLE ||
    type === GATE_TYPE_CONST ||
    type === GATE_TYPE_BUTTON ||
    type === GATE_TYPE_DIGIT_BIN ||
    type === GATE_TYPE_BUS_INPUT4 ||
    type === GATE_TYPE_BUS_INPUT8 ||
    type === GATE_TYPE_BUS_INPUT16;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-label={intl.formatMessage(
        { id: "kCQ84U", defaultMessage: "Circuit: {name}" },
        { name },
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel/90">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">
            <FormattedMessage
              id="KgwdBM"
              defaultMessage="Circuit Viewer: {name}"
              values={{ name }}
            />
          </h2>
          <span className="text-xs text-muted-foreground">
            <FormattedMessage id="djNL6D" defaultMessage="Read-only" />
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Simulation controls */}
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={intl.formatMessage({
              id: "jm/spn",
              defaultMessage: "Reset",
            })}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {isRunning ? (
            <button
              type="button"
              onClick={handlePause}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title={intl.formatMessage({
                id: "tFFMkF",
                defaultMessage: "Pause",
              })}
            >
              <Pause className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title={intl.formatMessage({
                id: "KiXNvz",
                defaultMessage: "Run",
              })}
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleStep}
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={intl.formatMessage({
              id: "p7+Jxw",
              defaultMessage: "Tick",
            })}
          >
            <StepForward className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          {/* Zoom & export */}
          <button
            type="button"
            onClick={() =>
              setView((v) => ({ ...v, k: Math.min(4, v.k * 1.3) }))
            }
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={intl.formatMessage({
              id: "xbi38c",
              defaultMessage: "Zoom in",
            })}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setView((v) => ({ ...v, k: Math.max(0.2, v.k * 0.7) }))
            }
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title={intl.formatMessage({
              id: "/UnJ3S",
              defaultMessage: "Zoom out",
            })}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <Download className="h-3.5 w-3.5" />
            <FormattedMessage id="aXB7Wg" defaultMessage="Export JSON" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title={intl.formatMessage({
              id: "rbrahO",
              defaultMessage: "Close",
            })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={containerRef}
        role="application"
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg width={size.w} height={size.h} className="w-full h-full">
          <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
            {/* Wires */}
            {(() => {
              const busGroups = computeBusWireGroups(snapshot);
              const busWireIds = new Set(busGroups.flatMap((g) => g.wireIds));

              return (
                <>
                  {/* Regular wires (not part of bus groups) */}
                  {Object.values(snapshot.wires).map((w) => {
                    if (busWireIds.has(w.id)) return null;

                    const a = snapshot.components[w.from.comp];
                    const b = snapshot.components[w.to.comp];

                    if (!a || !b) return null;
                    if (!library.has(a.type) || !library.has(b.type))
                      return null;

                    const p1 = pinPos(a, PIN_KIND.OUT, w.from.pin);
                    const p2 = pinPos(b, PIN_KIND.IN, w.to.pin);
                    const signal: SignalValue =
                      a.outputs[w.from.pin] ?? LogicValue.ZERO;
                    const d1 = pinDirection(a, PIN_KIND.OUT);
                    const d2 = pinDirection(b, PIN_KIND.IN);

                    return (
                      <WirePath
                        key={w.id}
                        p1={p1}
                        p2={p2}
                        isSignalUp={signal === LogicValue.ONE}
                        isRunning={isRunning}
                        wireType="bezier"
                        dir1={d1}
                        dir2={d2}
                      />
                    );
                  })}
                  {/* Bus wires */}
                  {busGroups.map((group) => {
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
                    const bd1 = pinDirection(sourceComp, PIN_KIND.OUT);
                    const bd2 = pinDirection(targetComp, PIN_KIND.IN);

                    return (
                      <BusWirePath
                        key={group.id}
                        p1={p1}
                        p2={p2}
                        width={group.width}
                        signals={group.signals}
                        style={WIRE_TYPE.BEZIER}
                        dir1={bd1}
                        dir2={bd2}
                        isSelected={false}
                        isRunning={isRunning}
                      />
                    );
                  })}
                </>
              );
            })()}
            {/* Components */}
            {Object.values(snapshot.components).map((c) => {
              if (!library.has(c.type)) return null;

              const isInput = isInputComp(c.type);

              return (
                <GateNode
                  key={c.id}
                  comp={c}
                  isSelected={false}
                  onMouseDown={() => {}}
                  onClickBody={isInput ? () => handleCompClick(c.id) : () => {}}
                  onPointerDownBody={
                    c.type === GATE_TYPE_BUTTON
                      ? () => handleButtonDown(c.id)
                      : undefined
                  }
                  onPointerUpBody={
                    c.type === GATE_TYPE_BUTTON
                      ? () => handleButtonUp(c.id)
                      : undefined
                  }
                  onPinDown={() => {}}
                  onPinUp={() => {}}
                />
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default CircuitViewer;
