/**
 * useViewportCulling — determines which components and wires are visible
 * within the current viewport, enabling the renderer to skip off-screen elements.
 */

import { useMemo } from "react";

import type { CircuitSnapshot, ComponentInstance } from "@/engine";
import { library } from "@/engine";
import { getRotatedSize } from "@/lib/circuit";

import type { CanvasSize, CanvasView } from "./use-canvas-interaction";

/** Margin in world units to include elements slightly outside the viewport */
const CULL_MARGIN = 100;

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Compute world-coordinate bounds of the current viewport.
 */
function getViewportBounds(view: CanvasView, size: CanvasSize): ViewportBounds {
  const minX = -view.x / view.k - CULL_MARGIN;
  const minY = -view.y / view.k - CULL_MARGIN;
  const maxX = (size.w - view.x) / view.k + CULL_MARGIN;
  const maxY = (size.h - view.y) / view.k + CULL_MARGIN;

  return { minX, minY, maxX, maxY };
}

/**
 * Check if a component is within the viewport bounds.
 */
function isComponentVisible(
  comp: ComponentInstance,
  bounds: ViewportBounds,
): boolean {
  if (!library.has(comp.type)) return false;

  const def = library.get(comp.type);
  const sz = getRotatedSize(comp, def);

  return (
    comp.x + sz.w >= bounds.minX &&
    comp.x <= bounds.maxX &&
    comp.y + sz.h >= bounds.minY &&
    comp.y <= bounds.maxY
  );
}

/**
 * Returns the set of component IDs visible in the current viewport.
 * Components outside the viewport (plus margin) are excluded.
 */
export function useViewportCulling(
  snapshot: CircuitSnapshot,
  view: CanvasView,
  size: CanvasSize,
): Set<string> {
  return useMemo(() => {
    const bounds = getViewportBounds(view, size);
    const visible = new Set<string>();

    for (const comp of Object.values(snapshot.components)) {
      if (isComponentVisible(comp, bounds)) {
        visible.add(comp.id);
      }
    }

    return visible;
  }, [snapshot.components, view, size]);
}
