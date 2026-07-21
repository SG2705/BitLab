/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * ObstacleMap — 2D grid-based obstacle and clearance map for wire routing.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Converts component positions into a discretized routing grid with multiple
 * layers of information used by the A* pathfinder:
 *
 *   Grid Layer (Uint8Array — CellState enum):
 *     - FREE (0):    Fully clear for routing, zero extra cost
 *     - BLOCKED (1): Component body + pin-offset zone, impassable
 *     - PADDED (2):  Inflation zone on non-pin edges, passable but penalized
 *
 *   Clearance Field (Uint8Array):
 *     - BFS-computed Manhattan distance from nearest BLOCKED cell
 *     - Range: 0 (blocked) to CLEARANCE_FIELD_MAX (8)
 *     - Used by router for gradient-based obstacle repulsion
 *
 *   Wire Cost Layer (Uint8Array):
 *     - Accumulated wire traffic per cell (soft obstacle)
 *     - Configurable cost multiplier (wireCost)
 *     - Does NOT block routing — only increases traversal cost
 *
 * Obstacle Footprint:
 *   The BLOCKED region for each component includes:
 *     - The component body rectangle (comp.x, comp.y, width, height)
 *     - PIN_OFFSET_UNITS cells of expansion on pin-bearing edges
 *       (prevents wires from threading between body and pins)
 *     - No expansion on non-pin edges
 *
 *   The PADDED region adds obstaclePadding cells:
 *     - ONLY on non-pin edges (top/bottom for vertical, left/right for horizontal)
 *     - Zero padding on pin-bearing edges (wires approach pins freely)
 *
 * Incremental Updates:
 *   - updateObstacle(): clears old cells, re-marks with new position, recomputes clearance
 *   - removeObstacle(): clears cells, re-marks overlapping neighbors, recomputes clearance
 *
 * Statistics & Debug:
 *   - getStats(): blocked/padded/free cell counts, percentages, build time
 *   - getRawGrid(): raw Uint8Array for debug overlay rendering
 *   - getClearanceField(): distance field for gradient heatmap overlay
 *
 * ═══════════════════════════════════════════════════════════════════════════════
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

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum clearance distance tracked (in cells) */
const CLEARANCE_FIELD_MAX = 8;

// ── Default Configuration ────────────────────────────────────────────────────

/** Default router configuration */
export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  cellSize: CELL_SIZE,
  obstaclePadding: 5,
  stubLength: 2,
  turnPenalty: 50,
  bendRadius: 1,
  wireCost: 10,
  wirePadding: 0,
};

// ── Map Statistics (#8) ──────────────────────────────────────────────────────

/** Diagnostic statistics about the obstacle map */
export interface ObstacleMapStats {
  /** Total grid cells */
  totalCells: number;
  /** Number of BLOCKED cells */
  blockedCells: number;
  /** Number of PADDED cells */
  paddedCells: number;
  /** Number of FREE cells */
  freeCells: number;
  /** Percentage of grid that is blocked */
  blockedPercent: number;
  /** Percentage of grid that is padded (inflation zone) */
  paddedPercent: number;
  /** Time taken to build the map (ms) */
  buildTimeMs: number;
  /** Number of registered obstacles */
  obstacleCount: number;
  /** Grid dimensions */
  cols: number;
  rows: number;
}

// ── Types ────────────────────────────────────────────────────────────────────

/** Function type for resolving component dimensions */
export type CompSizeResolver = (
  comp: ComponentInstance,
) => { w: number; h: number } | null;

// ── ObstacleMap Class ────────────────────────────────────────────────────────

export class ObstacleMap {
  private config: RouterConfig;
  private sizeResolver: CompSizeResolver | null;

  /** Grid dimensions */
  private cols: number = 0;
  private rows: number = 0;

  /** Cell state grid — flat array indexed as [row * cols + col] */
  private grid: Uint8Array = new Uint8Array(0);

  /** Wire cost layer — tracks how many wires pass through each cell */
  private wireCosts: Uint8Array = new Uint8Array(0);

  /**
   * Clearance field (#5) — minimum Manhattan distance from nearest BLOCKED cell.
   * Capped at CLEARANCE_FIELD_MAX. BFS-computed after obstacle placement.
   * Used by the router for gradient-based obstacle repulsion.
   */
  private clearanceField: Uint8Array = new Uint8Array(0);

  /** Tracked obstacles by component ID */
  private obstacles: Map<string, Obstacle> = new Map();

  /** Canvas bounds (world coordinates) */
  private bounds: Rect = { x: 0, y: 0, width: 0, height: 0 };

  /** Last build time in ms (#8) */
  private lastBuildTimeMs: number = 0;

  constructor(
    config: Partial<RouterConfig> = {},
    sizeResolver?: CompSizeResolver,
  ) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    this.sizeResolver = sizeResolver ?? null;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Get current config */
  getConfig(): RouterConfig {
    return { ...this.config };
  }

  /**
   * Update config with validation (#9).
   * Throws on invalid values. Triggers full rebuild on next buildFromSnapshot.
   */
  setConfig(patch: Partial<RouterConfig>): void {
    if (patch.cellSize !== undefined && patch.cellSize <= 0) {
      throw new Error("[ObstacleMap] cellSize must be > 0");
    }

    if (patch.obstaclePadding !== undefined && patch.obstaclePadding < 0) {
      throw new Error("[ObstacleMap] obstaclePadding must be >= 0");
    }

    if (patch.stubLength !== undefined && patch.stubLength < 0) {
      throw new Error("[ObstacleMap] stubLength must be >= 0");
    }

    if (patch.turnPenalty !== undefined && patch.turnPenalty < 0) {
      throw new Error("[ObstacleMap] turnPenalty must be >= 0");
    }

    if (patch.bendRadius !== undefined && patch.bendRadius < 0) {
      throw new Error("[ObstacleMap] bendRadius must be >= 0");
    }

    if (patch.wireCost !== undefined && patch.wireCost < 0) {
      throw new Error("[ObstacleMap] wireCost must be >= 0");
    }

    if (patch.wirePadding !== undefined && patch.wirePadding < 0) {
      throw new Error("[ObstacleMap] wirePadding must be >= 0");
    }

    // Validate combinations (#9)
    const merged = { ...this.config, ...patch };

    if (merged.stubLength > merged.obstaclePadding) {
      // Warn but don't reject — stub may protrude into padding which is handled by exempt cells
    }

    this.config = merged;
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
  getCellState(col: number, row: number): CellState {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return CellState.BLOCKED;
    }

    return this.grid[row * this.cols + col] as CellState;
  }

  /** Check if a cell is FREE (no obstacle or padding) */
  isFree(col: number, row: number): boolean {
    return this.getCellState(col, row) === CellState.FREE;
  }

  /** Check if a cell is passable for routing (FREE or PADDED) */
  isPassable(col: number, row: number): boolean {
    const state: CellState = this.getCellState(col, row);

    return state === CellState.FREE || state === CellState.PADDED;
  }

  /** Get the wire congestion cost for a cell (#3: soft cost, not hard obstacle) */
  getWireCost(col: number, row: number): number {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;

    return this.wireCosts[row * this.cols + col];
  }

  /**
   * Get the clearance distance for a cell (#5).
   * Returns 0 for BLOCKED cells, up to CLEARANCE_FIELD_MAX for distant cells.
   * Used by the router for gradient-based obstacle repulsion.
   */
  getObstacleDistance(col: number, row: number): number {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;

    return this.clearanceField[row * this.cols + col];
  }

  /**
   * Mark a wire path as a soft obstacle (#3).
   * Adds configurable traversal cost around the wire path.
   * Does NOT block cells — only increases routing cost for future wires.
   */
  markWirePath(path: GridCell[]): void {
    const padding = this.config.wirePadding;

    for (const cell of path) {
      for (let dr = -padding; dr <= padding; dr += 1) {
        for (let dc = -padding; dc <= padding; dc += 1) {
          const c = cell.col + dc;
          const r = cell.row + dr;

          if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            const idx = r * this.cols + c;

            if (this.wireCosts[idx] < 255) {
              this.wireCosts[idx] += 1;
            }
          }
        }
      }
    }
  }

  /** Clear all wire costs (call before full re-route) */
  clearWireCosts(): void {
    this.wireCosts.fill(0);
  }

  /** Convert a world-coordinate point to a grid cell */
  worldToGrid(p: Point): GridCell {
    const col = Math.floor((p.x - this.bounds.x) / this.config.cellSize);
    const row = Math.floor((p.y - this.bounds.y) / this.config.cellSize);

    return { col, row };
  }

  /** Convert a grid cell to a world-coordinate point */
  gridToWorld(cell: GridCell): Point {
    const x = this.bounds.x + cell.col * this.config.cellSize;
    const y = this.bounds.y + cell.row * this.config.cellSize;

    return { x, y };
  }

  /** Get the raw grid data for visualization/debug (#10) */
  getRawGrid(): { grid: Uint8Array; cols: number; rows: number } {
    return { grid: this.grid, cols: this.cols, rows: this.rows };
  }

  /** Get the clearance field for debug overlay (#10) */
  getClearanceField(): {
    field: Uint8Array;
    cols: number;
    rows: number;
    max: number;
  } {
    return {
      field: this.clearanceField,
      cols: this.cols,
      rows: this.rows,
      max: CLEARANCE_FIELD_MAX,
    };
  }

  /** Get diagnostic statistics about the map (#8) */
  getStats(): ObstacleMapStats {
    const total = this.cols * this.rows;
    let blocked = 0;
    let padded = 0;

    for (let i = 0; i < total; i += 1) {
      if ((this.grid[i] as CellState) === CellState.BLOCKED) blocked += 1;
      else if ((this.grid[i] as CellState) === CellState.PADDED) padded += 1;
    }

    return {
      totalCells: total,
      blockedCells: blocked,
      paddedCells: padded,
      freeCells: total - blocked - padded,
      blockedPercent: total > 0 ? (blocked / total) * 100 : 0,
      paddedPercent: total > 0 ? (padded / total) * 100 : 0,
      buildTimeMs: this.lastBuildTimeMs,
      obstacleCount: this.obstacles.size,
      cols: this.cols,
      rows: this.rows,
    };
  }

  // ── Build / Rebuild ──────────────────────────────────────────────────────

  /**
   * Build the obstacle map from a circuit snapshot.
   * Full rebuild: clears existing data, places all obstacles, computes clearance field.
   */
  buildFromSnapshot(snapshot: CircuitSnapshot): void {
    const startTime =
      typeof performance !== "undefined" ? performance.now() : 0;

    // 1. Compute world bounds
    this.computeBounds(snapshot);

    // 2. Allocate grids
    this.cols = Math.ceil(this.bounds.width / this.config.cellSize) + 1;
    this.rows = Math.ceil(this.bounds.height / this.config.cellSize) + 1;
    const totalCells = this.cols * this.rows;

    this.grid = new Uint8Array(totalCells);
    this.wireCosts = new Uint8Array(totalCells);
    this.clearanceField = new Uint8Array(totalCells);

    // 3. Register obstacles with size-adaptive padding (#1)
    this.obstacles.clear();

    for (const comp of Object.values(snapshot.components)) {
      this.addObstacle(comp);
    }

    // 4. Compute clearance field via BFS (#5)
    this.computeClearanceField();

    this.lastBuildTimeMs =
      typeof performance !== "undefined" ? performance.now() - startTime : 0;
  }

  /**
   * Incremental update: add or move a single component's obstacle (#4).
   * Only rebuilds the affected region rather than the entire grid.
   */
  updateObstacle(comp: ComponentInstance): void {
    const existing = this.obstacles.get(comp.id);

    if (existing) {
      this.clearObstacleCells(existing, comp);
    }

    this.addObstacle(comp);

    // Recompute clearance field (incremental BFS would be ideal but
    // full recompute is fast enough for typical circuit sizes)
    this.computeClearanceField();
  }

  /** Remove a component's obstacle from the map */
  removeObstacle(compId: string, comp: ComponentInstance): void {
    const obs = this.obstacles.get(compId);

    if (!obs) return;

    this.clearObstacleCells(obs, comp);
    this.obstacles.delete(compId);
    this.computeClearanceField();
  }

  // ── Private: Clearance Field (#5) ────────────────────────────────────────

  /**
   * Compute clearance field using BFS from all BLOCKED cells.
   * Each cell gets the Manhattan distance to the nearest blocked cell,
   * capped at CLEARANCE_FIELD_MAX. Higher = farther from obstacles.
   */
  private computeClearanceField(): void {
    const total = this.cols * this.rows;

    this.clearanceField.fill(CLEARANCE_FIELD_MAX);

    // Seed BFS from all BLOCKED cells
    const queue: number[] = [];

    for (let i = 0; i < total; i += 1) {
      if ((this.grid[i] as CellState) === CellState.BLOCKED) {
        this.clearanceField[i] = 0;
        queue.push(i);
      }
    }

    // BFS expansion (4-connected)
    let head = 0;

    while (head < queue.length) {
      const idx = queue[head];

      head += 1;

      const dist = this.clearanceField[idx];

      if (dist >= CLEARANCE_FIELD_MAX) continue;

      const col = idx % this.cols;
      const row = (idx - col) / this.cols;
      const nextDist = dist + 1;

      // 4 neighbors
      if (col > 0 && this.clearanceField[idx - 1] > nextDist) {
        this.clearanceField[idx - 1] = nextDist;
        queue.push(idx - 1);
      }

      if (col < this.cols - 1 && this.clearanceField[idx + 1] > nextDist) {
        this.clearanceField[idx + 1] = nextDist;
        queue.push(idx + 1);
      }

      if (row > 0 && this.clearanceField[idx - this.cols] > nextDist) {
        this.clearanceField[idx - this.cols] = nextDist;
        queue.push(idx - this.cols);
      }

      if (
        row < this.rows - 1 &&
        this.clearanceField[idx + this.cols] > nextDist
      ) {
        this.clearanceField[idx + this.cols] = nextDist;
        queue.push(idx + this.cols);
      }
    }
  }

  // ── Private: Bounds ────────────────────────────────────────────────────────

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
      const size = this.getCompSize(comp);

      minX = Math.min(minX, comp.x);
      minY = Math.min(minY, comp.y);
      maxX = Math.max(maxX, comp.x + size.w);
      maxY = Math.max(maxY, comp.y + size.h);
    }

    const margin = this.config.cellSize * 20;

    this.bounds = {
      x: minX - margin,
      y: minY - margin,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2,
    };
  }

  // ── Private: Obstacle Placement (#1, #2) ───────────────────────────────────

  /**
   * Add a component as an obstacle.
   *
   * BLOCKED region extends to pin tips on pin-bearing edges.
   * PADDED region (avoidance zone) is applied ONLY on non-pin edges.
   * Pin-bearing edges have NO padding — wires approach pins directly.
   */
  private addObstacle(comp: ComponentInstance): void {
    const size = this.getCompSize(comp);
    const r = comp.rotation ?? 0;
    const isVertical = r === 0 || r === 180;

    const bounds: Rect = {
      x: comp.x,
      y: comp.y,
      width: size.w,
      height: size.h,
    };

    // Padded region: uniform padding on NON-PIN edges only.
    // Pin-bearing edges get zero padding (wires approach freely).

    const pad = this.config.obstaclePadding * this.config.cellSize;

    const paddedBounds = {
      x: isVertical ? bounds.x : bounds.x - pad,
      y: isVertical ? bounds.y - pad : bounds.y,
      width: isVertical ? bounds.width : bounds.width + pad * 2,
      height: isVertical ? bounds.height + pad * 2 : bounds.height,
    };

    const obstacle: Obstacle = { compId: comp.id, bounds, paddedBounds };

    this.obstacles.set(comp.id, obstacle);

    // Mark cells
    this.markObstacleCells(obstacle, comp);
  }

  // ── Private: Cell marking ──────────────────────────────────────────────────

  private markBlockedRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const topLeft = this.worldToGrid({ x, y });
    const bottomRight = this.worldToGrid({
      x: x + width,
      y: y + height,
    });

    for (let r = topLeft.row; r < bottomRight.row; r += 1) {
      for (let c = topLeft.col; c < bottomRight.col; c += 1) {
        if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
          this.grid[r * this.cols + c] = CellState.BLOCKED;
        }
      }
    }
  }

  private markObstacleCells(obs: Obstacle, comp: ComponentInstance): void {
    // ----------------------------
    // Mark padded region
    // ----------------------------
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

          if ((this.grid[idx] as CellState) === CellState.FREE) {
            this.grid[idx] = CellState.PADDED;
          }
        }
      }
    }

    // ----------------------------
    // Mark component body
    // ----------------------------
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

    // ----------------------------
    // Add blocked "tongs"
    // ----------------------------
    const pad = this.config.obstaclePadding * this.config.cellSize;

    // Opening left for pins
    const tongUnits = 2;
    const tongHeight = tongUnits * this.config.cellSize;
    const tongWidth = tongUnits * this.config.cellSize;

    const opening = Math.max(0, obs.bounds.height - 2 * tongHeight);

    const rotation = comp.rotation ?? 0;
    const pinOnLeftRight = rotation === 0 || rotation === 180;

    if (pinOnLeftRight) {
      const lowerTongY = obs.bounds.y + tongHeight + opening;

      // LEFT upper
      this.markBlockedRect(obs.bounds.x - pad, obs.bounds.y, pad, tongHeight);

      // LEFT lower
      this.markBlockedRect(obs.bounds.x - pad, lowerTongY, pad, tongHeight);

      // RIGHT upper
      this.markBlockedRect(
        obs.bounds.x + obs.bounds.width,
        obs.bounds.y,
        pad,
        tongHeight,
      );

      // RIGHT lower
      this.markBlockedRect(
        obs.bounds.x + obs.bounds.width,
        lowerTongY,
        pad,
        tongHeight,
      );
    } else {
      const rightTongX = obs.bounds.x + tongWidth + opening;

      // TOP left
      this.markBlockedRect(obs.bounds.x, obs.bounds.y - pad, tongWidth, pad);

      // TOP right
      this.markBlockedRect(rightTongX, obs.bounds.y - pad, tongWidth, pad);

      // BOTTOM left
      this.markBlockedRect(
        obs.bounds.x,
        obs.bounds.y + obs.bounds.height,
        tongWidth,
        pad,
      );

      // BOTTOM right
      this.markBlockedRect(
        rightTongX,
        obs.bounds.y + obs.bounds.height,
        tongWidth,
        pad,
      );
    }
  }

  private clearObstacleCells(obs: Obstacle, comp: ComponentInstance): void {
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

    // Re-mark overlapping obstacles to avoid holes
    for (const [id, other] of this.obstacles) {
      if (id === obs.compId) continue;

      if (ObstacleMap.rectsOverlap(obs.paddedBounds, other.paddedBounds)) {
        this.markObstacleCells(other, comp);
      }
    }
  }

  // ── Private: Utilities ─────────────────────────────────────────────────────

  private static rectsOverlap(a: Rect, b: Rect): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private getCompSize(comp: ComponentInstance): { w: number; h: number } {
    if (this.sizeResolver) {
      const resolved = this.sizeResolver(comp);

      if (resolved) return resolved;
    }

    if (!library.has(comp.type)) {
      return { w: 80, h: 80 };
    }

    const def = library.get(comp.type);
    const r = comp.rotation ?? 0;

    if (r === 90 || r === 270) {
      return { w: def.height, h: def.width };
    }

    return { w: def.width, h: def.height };
  }
}
