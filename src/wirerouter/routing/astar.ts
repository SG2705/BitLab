/**
 * A* Pathfinding for orthogonal wire routing.
 *
 * Features:
 * - 4-directional movement only (horizontal/vertical)
 * - Turn penalty to strongly prefer fewer bends
 * - Forced stubs: wire must exit source and enter target straight for N cells
 * - Padded cells have higher traversal cost (avoidance preference)
 * - Source/target component bodies are obstacles
 */

import { CELL_SIZE } from "@/globals";
import { PIN_DIR } from "@/lib/constants";
import type { PinDir } from "@/lib/types";

import { type GridCell, type Point, type RouterConfig } from "../model/types";
import type { ObstacleMap } from "../obstacles/ObstacleMap";

/** Direction indices for 4-directional movement */
const DIR_UP = 0;
const DIR_DOWN = 1;
const DIR_LEFT = 2;
const DIR_RIGHT = 3;

type Dir = typeof DIR_UP | typeof DIR_DOWN | typeof DIR_LEFT | typeof DIR_RIGHT;

/** Deltas indexed by direction */
const DIR_DC = [0, 0, -1, 1]; // UP, DOWN, LEFT, RIGHT
const DIR_DR = [-1, 1, 0, 0];

/** All four directions for iteration */
const ALL_DIRS: Dir[] = [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT];

/** Convert a PinDir to a direction index */
function pinDirToDir(dir: PinDir): Dir {
  switch (dir) {
    case PIN_DIR.UP:
      return DIR_UP;
    case PIN_DIR.DOWN:
      return DIR_DOWN;
    case PIN_DIR.LEFT:
      return DIR_LEFT;
    case PIN_DIR.RIGHT:
      return DIR_RIGHT;
    default:
      return DIR_RIGHT;
  }
}

/** Reverse a direction (for target stub — wire arrives from opposite direction) */
function reverseDir(dir: Dir): Dir {
  switch (dir) {
    case DIR_UP:
      return DIR_DOWN;
    case DIR_DOWN:
      return DIR_UP;
    case DIR_LEFT:
      return DIR_RIGHT;
    case DIR_RIGHT:
      return DIR_LEFT;
    default:
      return DIR_RIGHT;
  }
}

/** Node in the A* open set */
interface AStarNode {
  col: number;
  row: number;
  /** Cost from start to this node */
  g: number;
  /** Estimated total cost (g + heuristic) */
  f: number;
  /** Direction we arrived from */
  dir: Dir;
}

/** Result of A* pathfinding */
export interface RouteResult {
  /** Whether a valid path was found */
  success: boolean;
  /** Waypoints in world coordinates (empty if no path found) */
  waypoints: Point[];
  /** Waypoints in grid coordinates */
  gridPath: GridCell[];
}

/**
 * Min-heap priority queue for A* nodes, keyed by f-cost.
 */
class MinHeap {
  private data: AStarNode[] = [];

  get size(): number {
    return this.data.length;
  }

  push(node: AStarNode): void {
    this.data.push(node);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): AStarNode | undefined {
    if (this.data.length === 0) return undefined;

    const top = this.data[0];
    const last = this.data.pop();

    if (last !== undefined && this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }

    return top;
  }

  private bubbleUp(i: number): void {
    let idx = i;

    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);

      if (this.data[idx].f >= this.data[parent].f) break;
      [this.data[idx], this.data[parent]] = [this.data[parent], this.data[idx]];
      idx = parent;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    let idx = i;

    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < n && this.data[left].f < this.data[smallest].f)
        smallest = left;
      if (right < n && this.data[right].f < this.data[smallest].f)
        smallest = right;
      if (smallest === idx) break;
      [this.data[idx], this.data[smallest]] = [
        this.data[smallest],
        this.data[idx],
      ];
      idx = smallest;
    }
  }
}

/**
 * Manhattan distance heuristic (admissible for 4-directional grid).
 */
function heuristic(
  col: number,
  row: number,
  goalCol: number,
  goalRow: number,
): number {
  return Math.abs(col - goalCol) + Math.abs(row - goalRow);
}

/**
 * Run A* pathfinding between two points on the obstacle map.
 *
 * @param obstacleMap - The obstacle grid
 * @param startWorld - Start point in world coordinates (pin position)
 * @param endWorld - End point in world coordinates (pin position)
 * @param startDir - Direction the start pin faces (wire exits this way)
 * @param endDir - Direction the end pin faces (wire arrives from opposite)
 * @returns RouteResult with waypoints
 */
export function findPath(
  obstacleMap: ObstacleMap,
  startWorld: Point,
  endWorld: Point,
  startDir: PinDir,
  endDir: PinDir,
): RouteResult {
  const config = obstacleMap.getConfig();
  const { cols, rows } = obstacleMap.getGridSize();

  const start = obstacleMap.worldToGrid(startWorld);
  const end = obstacleMap.worldToGrid(endWorld);

  // Direction the wire must initially travel (away from source pin)
  const exitDir = pinDirToDir(startDir);
  // Direction the wire must approach the target (opposite of pin facing)
  const approachDir = reverseDir(pinDirToDir(endDir));

  // Compute forced stub endpoints
  const stubStart = applyStub(start, exitDir, config.stubLength);
  const stubEnd = applyStub(end, approachDir, config.stubLength);

  // Validate stubs are within bounds
  if (
    stubStart.col < 0 ||
    stubStart.col >= cols ||
    stubStart.row < 0 ||
    stubStart.row >= rows ||
    stubEnd.col < 0 ||
    stubEnd.col >= cols ||
    stubEnd.row < 0 ||
    stubEnd.row >= rows
  ) {
    return { success: false, waypoints: [], gridPath: [] };
  }

  // Run A* from stubStart to stubEnd
  // Build exempt cells: stub cells that may be in blocked/padded zones
  // of the source/target components (they must be passable for routing)
  const exemptCells = new Set<string>();
  const startStubCellsForExempt = buildStubCells(
    start,
    exitDir,
    config.stubLength,
  );
  const endStubCellsForExempt = buildStubCells(
    end,
    approachDir,
    config.stubLength,
  );

  for (const cell of startStubCellsForExempt) {
    exemptCells.add(`${cell.col},${cell.row}`);
  }

  for (const cell of endStubCellsForExempt) {
    exemptCells.add(`${cell.col},${cell.row}`);
  }

  const astarResult = runAstar(
    obstacleMap,
    stubStart,
    stubEnd,
    exitDir,
    config,
    exemptCells,
  );

  if (!astarResult) {
    return { success: false, waypoints: [], gridPath: [] };
  }

  // Build full path: start pin → stub → A* path → stub → end pin
  const fullGridPath: GridCell[] = [];

  // Add start stub cells (from pin to stub start, inclusive)
  const startStubCells = buildStubCells(start, exitDir, config.stubLength);

  fullGridPath.push(...startStubCells);

  // Add A* path (skip first cell since it's stubStart, already in startStubCells)
  for (let i = 1; i < astarResult.length; i += 1) {
    fullGridPath.push(astarResult[i]);
  }

  // Add end stub cells walking from stubEnd back to pin
  // buildStubCells goes: end → end+1 → ... → stubEnd
  // We want: stubEnd → ... → end+1 → end (but stubEnd is already the last A* cell)
  const endStubCells = buildStubCells(end, approachDir, config.stubLength);
  // Reverse to get: stubEnd → ... → end
  const reversedEndStub = [...endStubCells].reverse();

  // Skip first (stubEnd already in A* path), keep the rest including end
  for (let i = 1; i < reversedEndStub.length; i += 1) {
    fullGridPath.push(reversedEndStub[i]);
  }

  // Simplify: remove collinear intermediate points
  const simplified = simplifyPath(fullGridPath);

  // Convert to world coordinates
  const waypoints = simplified.map((cell) => obstacleMap.gridToWorld(cell));

  // Replace first and last with exact pin positions (avoid grid quantization offset)
  if (waypoints.length >= 2) {
    waypoints[0] = startWorld;
    waypoints[waypoints.length - 1] = endWorld;

    // Align second waypoint with start pin (stub is horizontal or vertical)
    // and ensure it's on the correct exit side
    if (waypoints.length >= 3) {
      const exitDc = DIR_DC[exitDir];
      const exitDr = DIR_DR[exitDir];

      if (exitDc !== 0) {
        // Horizontal exit: Y must match pin, X must be on the exit side
        let { x } = waypoints[1];

        if (exitDc > 0 && x < startWorld.x) x = startWorld.x + CELL_SIZE;
        if (exitDc < 0 && x > startWorld.x) x = startWorld.x - CELL_SIZE;

        waypoints[1] = { x, y: startWorld.y };
      } else if (exitDr !== 0) {
        // Vertical exit: X must match pin, Y must be on the exit side
        let { y } = waypoints[1];

        if (exitDr > 0 && y < startWorld.y) y = startWorld.y + CELL_SIZE;
        if (exitDr < 0 && y > startWorld.y) y = startWorld.y - CELL_SIZE;

        waypoints[1] = { x: startWorld.x, y };
      }
    }

    // Align second-to-last waypoint with end pin
    // and ensure it's on the correct approach side
    if (waypoints.length >= 3) {
      const approachDc = DIR_DC[approachDir];
      const approachDr = DIR_DR[approachDir];
      const idx = waypoints.length - 2;

      if (idx > 0) {
        if (approachDc !== 0) {
          // Horizontal approach: Y must match pin, X must be on the approach side
          let { x } = waypoints[idx];

          if (approachDc > 0 && x < endWorld.x) x = endWorld.x + CELL_SIZE;
          if (approachDc < 0 && x > endWorld.x) x = endWorld.x - CELL_SIZE;

          waypoints[idx] = { x, y: endWorld.y };
        } else if (approachDr !== 0) {
          // Vertical approach: X must match pin, Y must be on the approach side
          let { y } = waypoints[idx];

          if (approachDr > 0 && y < endWorld.y) y = endWorld.y + CELL_SIZE;
          if (approachDr < 0 && y > endWorld.y) y = endWorld.y - CELL_SIZE;

          waypoints[idx] = { x: endWorld.x, y };
        }
      }
    }
  }

  return { success: true, waypoints, gridPath: simplified };
}

/**
 * Core A* implementation.
 * Returns the grid path from start to goal, or null if no path exists.
 *
 * @param exemptCells - Set of cell keys ("col,row") that are always passable
 *                      (used for start/goal which may be in padded/blocked zones)
 */
function runAstar(
  obstacleMap: ObstacleMap,
  start: GridCell,
  goal: GridCell,
  initialDir: Dir,
  config: RouterConfig,
  exemptCells: Set<string>,
): GridCell[] | null {
  const { cols, rows } = obstacleMap.getGridSize();
  const totalCells = cols * rows;

  // Flat arrays for best g-scores per (cell, direction)
  // 4 directions per cell
  const gScores = new Float32Array(totalCells * 4).fill(Infinity);
  const cameFrom = new Int32Array(totalCells * 4).fill(-1);

  const openSet = new MinHeap();

  const startIdx = (start.row * cols + start.col) * 4 + initialDir;

  gScores[startIdx] = 0;

  openSet.push({
    col: start.col,
    row: start.row,
    g: 0,
    f: heuristic(start.col, start.row, goal.col, goal.row),
    dir: initialDir,
  });

  // Midpoint of the path (used to bias turns toward the center)
  const midCol = (start.col + goal.col) / 2;
  const midRow = (start.row + goal.row) / 2;
  const maxDist =
    Math.max(
      1,
      Math.abs(goal.col - start.col) + Math.abs(goal.row - start.row),
    ) / 2;

  while (openSet.size > 0) {
    const current = openSet.pop();

    if (!current) break;

    // Goal reached
    if (current.col === goal.col && current.row === goal.row) {
      return reconstructPath(cameFrom, current, start, cols);
    }

    const currentDir = current.dir;

    // Explore 4 neighbors
    for (const dir of ALL_DIRS) {
      const dc = DIR_DC[dir];
      const dr = DIR_DR[dir];
      const nc = current.col + dc;
      const nr = current.row + dr;

      // Bounds check
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

      // Cell must be passable (FREE or PADDED), or be an exempt cell
      const cellKey = `${nc},${nr}`;
      const isExempt = exemptCells.has(cellKey);

      if (!isExempt && !obstacleMap.isPassable(nc, nr)) continue;

      // Movement cost
      let moveCost = 1;

      // Padded cells have higher cost (prefer routing through free space)
      // Exempt cells get no extra cost (they're stub cells)
      if (!isExempt && !obstacleMap.isFree(nc, nr)) {
        moveCost += 10;
      }

      // Wire congestion: prefer cells without existing wires
      const wireCongestion = obstacleMap.getWireCost(nc, nr);

      if (wireCongestion > 0) {
        moveCost += wireCongestion * config.wireCost;
      }

      // Turn penalty: changing direction costs extra
      // Bias toward turning near the midpoint (lower penalty at center)
      if (dir !== currentDir) {
        const distFromMid = Math.abs(nc - midCol) + Math.abs(nr - midRow);
        const midBias = distFromMid / maxDist; // 0 at midpoint, ~1 at edges

        moveCost += config.turnPenalty * (0.5 + midBias * 0.5);
      }

      const tentativeG = current.g + moveCost;
      const neighborIdx = (nr * cols + nc) * 4 + dir;

      if (tentativeG < gScores[neighborIdx]) {
        gScores[neighborIdx] = tentativeG;
        cameFrom[neighborIdx] =
          (current.row * cols + current.col) * 4 + currentDir;

        const h = heuristic(nc, nr, goal.col, goal.row);

        openSet.push({
          col: nc,
          row: nr,
          g: tentativeG,
          f: tentativeG + h,
          dir,
        });
      }
    }
  }

  // No path found
  return null;
}

/**
 * Reconstruct the path from A* cameFrom array.
 */
function reconstructPath(
  cameFrom: Int32Array,
  endNode: AStarNode,
  start: GridCell,
  cols: number,
): GridCell[] {
  const path: GridCell[] = [];
  let currentIdx = (endNode.row * cols + endNode.col) * 4 + endNode.dir;

  // Walk backwards through cameFrom
  path.push({ col: endNode.col, row: endNode.row });

  while (cameFrom[currentIdx] !== -1) {
    currentIdx = cameFrom[currentIdx];
    const cellIdx = Math.floor(currentIdx / 4);
    const col = cellIdx % cols;
    const row = Math.floor(cellIdx / cols);

    path.push({ col, row });
  }

  path.reverse();

  // Ensure start is included
  if (
    path.length === 0 ||
    path[0].col !== start.col ||
    path[0].row !== start.row
  ) {
    path.unshift(start);
  }

  return path;
}

/**
 * Apply a stub offset: move N cells in the given direction from a starting cell.
 */
function applyStub(cell: GridCell, dir: Dir, length: number): GridCell {
  return {
    col: cell.col + DIR_DC[dir] * length,
    row: cell.row + DIR_DR[dir] * length,
  };
}

/**
 * Build an array of cells from a pin position outward in the given direction.
 * Includes the starting cell and all intermediate cells up to and including the stub end.
 */
function buildStubCells(
  pinCell: GridCell,
  dir: Dir,
  length: number,
): GridCell[] {
  const cells: GridCell[] = [];
  const dc = DIR_DC[dir];
  const dr = DIR_DR[dir];

  for (let i = 0; i <= length; i += 1) {
    cells.push({
      col: pinCell.col + dc * i,
      row: pinCell.row + dr * i,
    });
  }

  return cells;
}

/**
 * Remove collinear intermediate points from a grid path.
 * Keeps only the waypoints where direction changes (turn points).
 */
function simplifyPath(path: GridCell[]): GridCell[] {
  if (path.length <= 2) return path;

  const result: GridCell[] = [path[0]];

  for (let i = 1; i < path.length - 1; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Keep point if direction changes
    const dx1 = curr.col - prev.col;
    const dy1 = curr.row - prev.row;
    const dx2 = next.col - curr.col;
    const dy2 = next.row - curr.row;

    if (dx1 !== dx2 || dy1 !== dy2) {
      result.push(curr);
    }
  }

  result.push(path[path.length - 1]);

  return result;
}
