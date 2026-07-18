/**
 * CircuitViewer — read-only modal showing a custom gate's internal circuit.
 *
 * Features:
 *   - Renders all components and wires from the stored CircuitSnapshot
 *   - Pan and zoom support
 *   - Export as JSON
 *   - No editing, no simulation, no clock
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";

import { GateNode, WirePath } from "@/components/ui";
import { library } from "@/engine";
import type { CircuitSnapshot } from "@/engine/types";
import { PIN_KIND } from "@/lib/constants";
import { pinDirection, pinPos } from "@/lib/circuit";
import { type PinKind } from "@/lib/types";

interface CircuitViewerProps {
  name: string;
  circuit: CircuitSnapshot;
  onClose: () => void;
}

const NOOP = () => {};
const NOOP_MOUSE = (_e: React.MouseEvent) => {};
const NOOP_PIN = (_e: React.MouseEvent, _pin: number, _kind: PinKind) => {};

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

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;

    if (!el) return;

    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight }),
    );

    ro.observe(el);

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

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-label={intl.formatMessage(
        { id: "circuitViewer.title", defaultMessage: "Circuit: {name}" },
        { name },
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel/90">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">
            <FormattedMessage
              id="circuitViewer.heading"
              defaultMessage="Circuit Viewer: {name}"
              values={{ name }}
            />
          </h2>
          <span className="text-xs text-muted-foreground">
            <FormattedMessage
              id="circuitViewer.readOnly"
              defaultMessage="Read-only"
            />
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setView((v) => ({ ...v, k: Math.min(4, v.k * 1.3) }))
            }
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setView((v) => ({ ...v, k: Math.max(0.2, v.k * 0.7) }))
            }
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border"
          >
            <Download className="h-3.5 w-3.5" />
            <FormattedMessage
              id="circuitViewer.export"
              defaultMessage="Export JSON"
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title={intl.formatMessage({
              id: "circuitViewer.close",
              defaultMessage: "Close",
            })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
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
            {Object.values(circuit.wires).map((w) => {
              const a = circuit.components[w.from.comp];
              const b = circuit.components[w.to.comp];

              if (!a || !b) return null;
              if (!library.has(a.type) || !library.has(b.type)) return null;

              const p1 = pinPos(a, PIN_KIND.OUT, w.from.pin);
              const p2 = pinPos(b, PIN_KIND.IN, w.to.pin);
              const d1 = pinDirection(a, PIN_KIND.OUT);
              const d2 = pinDirection(b, PIN_KIND.IN);

              return (
                <WirePath
                  key={w.id}
                  p1={p1}
                  p2={p2}
                  live={false}
                  isRunning={false}
                  style="bezier"
                  dir1={d1}
                  dir2={d2}
                />
              );
            })}
            {/* Components */}
            {Object.values(circuit.components).map((c) => {
              if (!library.has(c.type)) return null;

              return (
                <GateNode
                  key={c.id}
                  comp={c}
                  isSelected={false}
                  onMouseDown={NOOP_MOUSE}
                  onClickBody={NOOP}
                  onPinDown={NOOP_PIN}
                  onPinUp={NOOP_PIN}
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
