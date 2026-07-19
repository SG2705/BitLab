/**
 * useCanvasInteraction — handles pan, zoom, resize, lasso selection, and
 * coordinate transforms for the circuit canvas.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { CircuitSnapshot } from "@/engine";
import { library } from "@/engine";
import { getRotatedSize } from "@/lib/circuit";
import { TOOL } from "@/lib/constants";
import type { Tool } from "@/lib/types";

export interface CanvasView {
  x: number;
  y: number;
  k: number;
}

export interface CanvasSize {
  w: number;
  h: number;
}

export interface LassoRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CanvasInteractionState {
  view: CanvasView;
  setView: React.Dispatch<React.SetStateAction<CanvasView>>;
  size: CanvasSize;
  panning: boolean;
  lasso: LassoRect | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  toWorld: (sx: number, sy: number) => { x: number; y: number };
  onWheel: (e: React.WheelEvent) => void;
  onCanvasMouseDown: (e: React.MouseEvent, tool: Tool) => void;
  onCanvasMouseMove: (
    e: React.MouseEvent,
    handlers: {
      onDragComp?: () => void;
      onPendingWire?: (wx: number, wy: number) => void;
    },
  ) => void;
  onCanvasMouseUp: (snapshot: CircuitSnapshot) => Set<string> | null;
  fitToScreen: (snapshot: CircuitSnapshot) => void;
}

/**
 * UseCanvasInteraction
 */
export function useCanvasInteraction(): CanvasInteractionState {
  const [view, setView] = useState<CanvasView>({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState<CanvasSize>({ w: 1200, h: 800 });
  const [panning, setPanning] = useState(false);
  const [lasso, setLasso] = useState<LassoRect | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panStartRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
  } | null>(null);

  // Resize observer
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

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
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
    },
    [view],
  );

  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent, tool: Tool) => {
      if (e.button === 1 || tool === TOOL.PAN || (e.button === 0 && e.altKey)) {
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
      }
    },
    [view, toWorld],
  );

  const onCanvasMouseMove = useCallback(
    (
      e: React.MouseEvent,
      handlers: {
        onDragComp?: () => void;
        onPendingWire?: (wx: number, wy: number) => void;
      },
    ) => {
      if (panning && panStartRef.current) {
        const pan = panStartRef.current;

        setView((v) => ({
          ...v,
          x: pan.vx + (e.clientX - pan.x),
          y: pan.vy + (e.clientY - pan.y),
        }));

        return;
      }

      if (handlers.onDragComp) {
        handlers.onDragComp();

        return;
      }

      if (handlers.onPendingWire) {
        const p = toWorld(e.clientX, e.clientY);

        handlers.onPendingWire(p.x, p.y);
      }

      if (lasso) {
        const p = toWorld(e.clientX, e.clientY);

        setLasso({ ...lasso, x1: p.x, y1: p.y });
      }
    },
    [panning, lasso, toWorld],
  );

  const onCanvasMouseUp = useCallback(
    (snapshot: CircuitSnapshot): Set<string> | null => {
      setPanning(false);
      panStartRef.current = null;

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

          if (
            c.x + sz.w >= x &&
            c.x <= x + w &&
            c.y + sz.h >= y &&
            c.y <= y + h
          )
            sel.add(c.id);
        }

        setLasso(null);

        return sel;
      }

      return null;
    },
    [lasso],
  );

  const fitToScreen = useCallback(
    (snapshot: CircuitSnapshot) => {
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
    },
    [size],
  );

  return {
    view,
    setView,
    size,
    panning,
    lasso,
    canvasRef,
    svgRef,
    toWorld,
    onWheel,
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    fitToScreen,
  };
}
