/**
 * ObstacleMap — Manages a 2D grid representing blocked/free cells on the canvas.
 *
 * Responsibilities:
 * - Convert component positions + dimensions into obstacle rects
 * - Maintain a discretized grid where each cell is FREE, BLOCKED, or PADDED
 * - Support incremental updates (add/remove/move a component)
 * - Expose query methods for the routing algorithm
 */

import type { CircuitSnapshot, ComponentInstance } from "@/engine";
import { library } from "@/engine";
import { CELL_SIZE } from "@/globals";

import {
  CellState,
  type GridCell,
  type Obstacle,
  type Point,
  type Rect,
  type RouterConfig,
} from "../model/types";

/** Default router configuration */
export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  cellSize: CELL_SIZE,
  obstaclePadding: 2, // 3 grid cells padding
  stubLength: 2, // 3 grid cells stub
  turnPenalty: 50, // strong preference for fewer bends
  bendRadius: 0, // 4px rounded corners at bends
};

export class ObstacleMap {
  private config: RouterConfig;

  /** Grid dimensions */
  private cols: number = 0;
  private rows: number = 0;

  /** The grid buffer — flat array indexed as [row * cols + col] */
  private grid: Uint8Array = new Uint8Array(0);

  /** Tracked obstacles by component ID */
  private obstacles: Map<string, Obstacle> = new Map();

  /** Canvas bounds (world coordinates) */
  private bounds: Rect = { x: 0, y: 0, width: 0, height: 0 };

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Get current config */
  getConfig(): RouterConfig {
    return { ...this.config };
  }

  /** Update config (triggers full rebuild on next buildFromSnapshot) */
  setConfig(patch: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  /** Get grid dimensions */
  getGridSize(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }

  /** Get the world-coordinate bounds of the grid */
  getBounds(): Rect {
    return { ...this.bounds };
  }

  /** Get all tracked obstacles */
  getObstacles(): Obstacle[] {
    return Array.from(this.obstacles.values());
  }

  /** Get the state of a specific grid cell */
  getCellState(col: number, row: number): number {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return CellState.BLOCKED; // out of bounds = blocked
    }

    return this.grid[row * this.cols + col];
  }

  /** Check if a cell is walkable (FREE only — PADDED cells are avoided) */
  isFree(col: number, row: number): boolean {
    return this.getCellState(col, row) === 0; // CellState.FREE
  }

  /** Check if a cell is walkable for routing (FREE or PADDED are both passable) */
  isPassable(col: number, row: number): boolean {
    const state = this.getCellState(col, row);

    return state === 0 || state === 2; // FREE or PADDED
  }

  /** Convert a world-coordinate point to a grid cell */
  worldToGrid(p: Point): GridCell {
    const col = Math.floor((p.x - this.bounds.x) / this.config.cellSize);
    const row = Math.floor((p.y - this.bounds.y) / this.config.cellSize);

    return { col, row };
  }

  /** Convert a grid cell to a world-coordinate point (center of cell) */
  gridToWorld(cell: GridCell): Point {
    const x = this.bounds.x + cell.col * this.config.cellSize;
    const y = this.bounds.y + cell.row * this.config.cellSize;

    return { x, y };
  }

  /** Get the raw grid data for visualization */
  getRawGrid(): { grid: Uint8Array; cols: number; rows: number } {
    return { grid: this.grid, cols: this.cols, rows: this.rows };
  }

  // ── Build / Rebuild ──────────────────────────────────────────────────────

  /**
   * Build the obstacle map from a circuit snapshot.
   * This is a full rebuild — clears existing data and recomputes.
   */
  buildFromSnapshot(snapshot: CircuitSnapshot): void {
    // 1. Compute world bounds from all components (with margin)
    this.computeBounds(snapshot);

    // 2. Allocate grid
    this.cols = Math.ceil(this.bounds.width / this.config.cellSize) + 1;
    this.rows = Math.ceil(this.bounds.height / this.config.cellSize) + 1;
    this.grid = new Uint8Array(this.cols * this.rows); // all FREE (0)

    // 3. Register each component as an obstacle
    this.obstacles.clear();

    for (const comp of Object.values(snapshot.components)) {
      this.addObstacle(comp);
    }
  }

  /**
   * Add or update a single component's obstacle.
   * Call this when a component is added or moved.
   */
  updateObstacle(comp: ComponentInstance): void {
    // Remove old obstacle cells if it existed
    const existing = this.obstacles.get(comp.id);

    if (existing) {
      this.clearObstacleCells(existing);
    }

    // Re-add
    this.addObstacle(comp);
  }

  /**
   * Remove a component's obstacle from the map.
   */
  removeObstacle(compId: string): void {
    const obs = this.obstacles.get(compId);

    if (!obs) return;
    this.clearObstacleCells(obs);
    this.obstacles.delete(compId);
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private computeBounds(snapshot: CircuitSnapshot): void {
    const components = Object.values(snapshot.components);

    if (components.length === 0) {
      this.bounds = { x: 0, y: 0, width: 1200, height: 800 };

      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const comp of components) {
      const size = ObstacleMap.getCompSize(comp);

      minX = Math.min(minX, comp.x);
      minY = Math.min(minY, comp.y);
      maxX = Math.max(maxX, comp.x + size.w);
      maxY = Math.max(maxY, comp.y + size.h);
    }

    // Add margin around the entire canvas (in grid cells)
    const margin = this.config.cellSize * 20; // 20 cells margin

    this.bounds = {
      x: minX - margin,
      y: minY - margin,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2,
    };
  }

  private addObstacle(comp: ComponentInstance): void {
    const size = ObstacleMap.getCompSize(comp);
    const bounds: Rect = {
      x: comp.x,
      y: comp.y,
      width: size.w,
      height: size.h,
    };

    const pad = this.config.obstaclePadding * this.config.cellSize;
    const paddedBounds: Rect = {
      x: bounds.x - pad,
      y: bounds.y - pad,
      width: bounds.width + pad * 2,
      height: bounds.height + pad * 2,
    };

    const obstacle: Obstacle = { compId: comp.id, bounds, paddedBounds };

    this.obstacles.set(comp.id, obstacle);

    // Mark cells
    this.markObstacleCells(obstacle);
  }

  private markObstacleCells(obs: Obstacle): void {
    // Mark padded zone
    const padTopLeft = this.worldToGrid({
      x: obs.paddedBounds.x,
      y: obs.paddedBounds.y,
    });
    const padBottomRight = this.worldToGrid({
      x: obs.paddedBounds.x + obs.paddedBounds.width,
      y: obs.paddedBounds.y + obs.paddedBounds.height,
    });

    for (let r = padTopLeft.row; r < padBottomRight.row; r += 1) {
      for (let c = padTopLeft.col; c < padBottomRight.col; c += 1) {
        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
          const idx = r * this.cols + c;

          // Only upgrade: FREE → PADDED, but don't downgrade BLOCKED → PADDED

          if (this.grid[idx] === 0) {
            // CellState.FREE
            this.grid[idx] = CellState.PADDED;
          }
        }
      }
    }

    // Mark blocked zone (the actual component body)
    const bodyTopLeft = this.worldToGrid({
      x: obs.bounds.x,
      y: obs.bounds.y,
    });
    const bodyBottomRight = this.worldToGrid({
      x: obs.bounds.x + obs.bounds.width,
      y: obs.bounds.y + obs.bounds.height,
    });

    for (let r = bodyTopLeft.row; r < bodyBottomRight.row; r += 1) {
      for (let c = bodyTopLeft.col; c < bodyBottomRight.col; c += 1) {
        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
          this.grid[r * this.cols + c] = CellState.BLOCKED;
        }
      }
    }
  }

  private clearObstacleCells(obs: Obstacle): void {
    // Clear padded zone
    const padTopLeft = this.worldToGrid({
      x: obs.paddedBounds.x,
      y: obs.paddedBounds.y,
    });
    const padBottomRight = this.worldToGrid({
      x: obs.paddedBounds.x + obs.paddedBounds.width,
      y: obs.paddedBounds.y + obs.paddedBounds.height,
    });

    for (let r = padTopLeft.row; r < padBottomRight.row; r += 1) {
      for (let c = padTopLeft.col; c < padBottomRight.col; c += 1) {
        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
          this.grid[r * this.cols + c] = CellState.FREE;
        }
      }
    }

    // After clearing, we need to re-mark overlapping obstacles
    // to avoid holes where two obstacles' padding zones overlapped
    for (const [id, other] of this.obstacles) {
      if (id === obs.compId) continue;

      if (ObstacleMap.rectsOverlap(obs.paddedBounds, other.paddedBounds)) {
        this.markObstacleCells(other);
      }
    }
  }

  private static rectsOverlap(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private static getCompSize(comp: ComponentInstance): {
    w: number;
    h: number;
  } {
    if (!library.has(comp.type)) {
      return { w: 80, h: 80 }; // fallback
    }

    const def = library.get(comp.type);
    const r = comp.rotation ?? 0;

    if (r === 90 || r === 270) {
      return { w: def.height, h: def.width };
    }

    return { w: def.width, h: def.height };
  }
}
