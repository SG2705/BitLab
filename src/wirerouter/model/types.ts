/**
 * Wire Router — Core types for the obstacle map and routing engine.
 */

/** A rectangle in world (canvas) coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An obstacle on the canvas — a component's bounding box inflated by padding. */
export interface Obstacle {
  /** Component ID this obstacle belongs to */
  compId: string;
  /** Original bounding box (unpadded) */
  bounds: Rect;
  /** Padded bounding box used for routing avoidance */
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

/** Configuration for the obstacle map and router. */
export interface RouterConfig {
  /** Grid cell size in pixels (derived from app CELL_SIZE constant) */
  cellSize: number;
  /** Padding around obstacles in grid units */
  obstaclePadding: number;
  /** How many grid cells the wire must travel straight from a pin before turning */
  stubLength: number;
  /** Cost multiplier for changing direction (higher = fewer bends) */
  turnPenalty: number;
  /** Corner radius in pixels for rounded bends (0 = sharp corners) */
  bendRadius: number;
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
