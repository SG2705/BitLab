/**
 * types.ts — Core type definitions for the wire routing engine.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * TYPE CATEGORIES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Geometry:
 *   Rect      — Axis-aligned rectangle in world (canvas) coordinates
 *   Point     — 2D position in world coordinates (pixels)
 *   GridCell  — Column/row position in the discretized routing grid
 *
 * Obstacles:
 *   Obstacle  — A component's obstacle footprint (body bounds + padded bounds)
 *
 * Configuration:
 *   RouterConfig — All tunable parameters for the obstacle map and A* search
 *
 * Grid State:
 *   CellState — Enum describing what occupies a grid cell (FREE/BLOCKED/PADDED)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** A rectangle in world (canvas) coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An obstacle on the canvas — a component's routing footprint. */
export interface Obstacle {
  /** Component ID this obstacle belongs to */
  compId: string;
  /**
   * Blocked bounds — the component body expanded to pin tips on pin-bearing edges.
   * Wires cannot cross this region (BLOCKED cells).
   */
  bounds: Rect;
  /**
   * Padded bounds — the blocked region expanded by obstaclePadding on non-pin edges.
   * Wires can cross this region but incur higher traversal cost (PADDED cells).
   */
  paddedBounds: Rect;
}

/** A 2D point in world coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** A cell coordinate in the discretized routing grid. */
export interface GridCell {
  col: number;
  row: number;
}

/**
 * Configuration for the obstacle map and A* router.
 * All values are validated on assignment (negative values rejected).
 */
export interface RouterConfig {
  /** Grid cell size in pixels. Determines routing grid resolution. */
  cellSize: number;
  /**
   * Padding cells around obstacles on non-pin edges.
   * Pin-bearing edges get zero padding (wires approach pins directly).
   */
  obstaclePadding: number;
  /** Forced stub length: cells a wire must travel straight from a pin before turning */
  stubLength: number;
  /** Base turn penalty (scaled by midpoint distance — bell curve) */
  turnPenalty: number;
  /** Corner radius in pixels for SVG path rendering (0 = sharp corners) */
  bendRadius: number;
  /** Cost multiplier per existing wire in a cell (soft obstacle weight) */
  wireCost: number;
  /** Radius in cells for wire congestion marking around each routed path */
  wirePadding: number;
}

/** The state of a single cell in the obstacle grid. */
export enum CellState {
  /** Cell is free for routing */
  FREE = 0,
  /** Cell is blocked by an obstacle */
  BLOCKED = 1,
  /** Cell is within the padding zone of an obstacle */
  PADDED = 2,
}
