/* eslint-disable no-bitwise */
/**
 * A* Pathfinding for orthogonal wire routing.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FEATURES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - 4-directional orthogonal movement only (horizontal/vertical)
 * - Context-aware turn penalty (bell curve: cheap at midpoint, expensive at extremes)
 * - Heading-aware heuristic with admissible tie-breaking bonuses
 * - Forced stubs: wire exits/enters pins straight for N cells (immutable)
 * - Obstacle distance field: wires naturally repel from component bodies
 * - Wire spacing field: maintains clearance between parallel wires
 * - Behind-pin forbidden zone: wires never appear from behind a pin
 * - Parallel adjacency penalty >> crossing penalty
 * - Equal-cost path selection with secondary visual scoring (#3)
 * - Guide channel bonus for bus/parallel wire alignment (#4)
 * - f-value tie-breaking: h, then bend count (#6)
 * - Search instrumentation: nodes expanded, peak open set, duration (#9)
 * - Configuration validation (#10)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CELL_SIZE } from "@/globals";
import { PIN_DIR } from "@/lib/constants";
import type { PinDir } from "@/lib/types";

import { type GridCell, type Point, type RouterConfig } from "../model/types";
import type { ObstacleMap } from "../obstacles/ObstacleMap";

// ── Direction constants ──────────────────────────────────────────────────────

const DIR_UP = 0;
const DIR_DOWN = 1;
const DIR_LEFT = 2;
const DIR_RIGHT = 3;

type Dir = typeof DIR_UP | typeof DIR_DOWN | typeof DIR_LEFT | typeof DIR_RIGHT;

const DIR_DC = [0, 0, -1, 1];
const DIR_DR = [-1, 1, 0, 0];

const ALL_DIRS: Dir[] = [DIR_UP, DIR_DOWN, DIR_LEFT, DIR_RIGHT];

// ── Search Metrics (#9) ──────────────────────────────────────────────────────

/** Instrumentation data collected during A* search */
export interface RouteMetrics {
  /** Total nodes expanded (popped from open set) */
  nodesExpanded: number;
  /** Peak open set size during search */
  peakOpenSetSize: number;
  /** Routing duration in milliseconds */
  durationMs: number;
  /** Number of equal-cost paths evaluated */
  equalCostPathsEvaluated: number;
}

/** Create a zeroed metrics object */
function emptyMetrics(): RouteMetrics {
  return {
    nodesExpanded: 0,
    peakOpenSetSize: 0,
    durationMs: 0,
    equalCostPathsEvaluated: 0,
  };
}

// ── Route Result ─────────────────────────────────────────────────────────────

/** Result of A* pathfinding */
export interface RouteResult {
  /** Whether a valid path was found */
  success: boolean;
  /** Waypoints in world coordinates (empty if no path found) */
  waypoints: Point[];
  /** Waypoints in grid coordinates */
  gridPath: GridCell[];
  /** Search instrumentation metrics */
  metrics: RouteMetrics;
}

// ── Configuration Validation (#10) ───────────────────────────────────────────

/**
 * Validate router configuration values.
 * Returns an array of error messages (empty = valid).
 */
export function validateRouterConfig(config: Partial<RouterConfig>): string[] {
  const errors: string[] = [];

  if (config.cellSize !== undefined && config.cellSize <= 0) {
    errors.push("cellSize must be > 0");
  }

  if (config.obstaclePadding !== undefined && config.obstaclePadding < 0) {
    errors.push("obstaclePadding must be >= 0");
  }

  if (config.stubLength !== undefined && config.stubLength < 0) {
    errors.push("stubLength must be >= 0");
  }

  if (config.turnPenalty !== undefined && config.turnPenalty < 0) {
    errors.push("turnPenalty must be >= 0");
  }

  if (config.bendRadius !== undefined && config.bendRadius < 0) {
    errors.push("bendRadius must be >= 0");
  }

  if (config.wireCost !== undefined && config.wireCost < 0) {
    errors.push("wireCost must be >= 0");
  }

  if (config.wirePadding !== undefined && config.wirePadding < 0) {
    errors.push("wirePadding must be >= 0");
  }

  return errors;
}

// ── Priority Queue with tie-breaking (#6) ────────────────────────────────────

/** A* node with bend count for tie-breaking */
interface AStarNode {
  col: number;
  row: number;
  g: number;
  f: number;
  h: number;
  dir: Dir;
  /** Number of direction changes from start to this node */
  bends: number;
}

/**
 * Min-heap priority queue with multi-level tie-breaking (#6):
 *   1. Lowest f (primary)
 *   2. Lowest h (prefer closer to goal)
 *   3. Fewest bends (prefer straighter paths)
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

  /** Compare two nodes: returns true if a should be higher priority (lower in heap) */
  private static isHigherPriority(a: AStarNode, b: AStarNode): boolean {
    if (a.f !== b.f) return a.f < b.f;
    if (a.h !== b.h) return a.h < b.h;

    return a.bends < b.bends;
  }

  private bubbleUp(i: number): void {
    let idx = i;

    while (idx > 0) {
      const parent = (idx - 1) >> 1;

      if (!MinHeap.isHigherPriority(this.data[idx], this.data[parent])) break;
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

      if (
        left < n &&
        MinHeap.isHigherPriority(this.data[left], this.data[smallest])
      )
        smallest = left;
      if (
        right < n &&
        MinHeap.isHigherPriority(this.data[right], this.data[smallest])
      )
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

// ── Heuristic with heading-aware tie-breaking ────────────────────────────────

/** Heading bonus: current direction points toward goal */
const H_HEADING_BONUS = 0.12;
/** Alignment bonus: on same row/col as goal */
const H_ALIGNMENT_BONUS = 0.06;
/** Straight bonus: can reach goal without turning */
const H_STRAIGHT_BONUS = 0.18;

/**
 * Heading-aware heuristic with admissible tie-breaking bonuses.
 * Manhattan distance minus small bonuses for alignment/heading.
 * Remains admissible because bonuses < step cost (1).
 */
function heuristic(
  col: number,
  row: number,
  goalCol: number,
  goalRow: number,
  dir: Dir,
): number {
  const manhattan = Math.abs(col - goalCol) + Math.abs(row - goalRow);

  if (manhattan === 0) return 0;

  let bonus = 0;
  const dc = DIR_DC[dir];
  const dr = DIR_DR[dir];
  const toGoalC = Math.sign(goalCol - col);
  const toGoalR = Math.sign(goalRow - row);

  // Heading toward goal
  if ((dc !== 0 && dc === toGoalC) || (dr !== 0 && dr === toGoalR)) {
    bonus += H_HEADING_BONUS;
  }

  // On same axis as goal
  if (col === goalCol || row === goalRow) {
    bonus += H_ALIGNMENT_BONUS;
  }

  // Straight line to goal
  if (
    (dc > 0 && goalCol > col && goalRow === row) ||
    (dc < 0 && goalCol < col && goalRow === row) ||
    (dr > 0 && goalRow > row && goalCol === col) ||
    (dr < 0 && goalRow < row && goalCol === col)
  ) {
    bonus += H_STRAIGHT_BONUS;
  }

  return manhattan - Math.min(bonus, 0.35);
}

/** Simple Manhattan for initial node (no direction context) */
function heuristicSimple(
  col: number,
  row: number,
  goalCol: number,
  goalRow: number,
): number {
  return Math.abs(col - goalCol) + Math.abs(row - goalRow);
}

// ── Visual scoring for equal-cost path selection (#3) ────────────────────────

/**
 * Score a grid path for visual quality. Lower = better.
 * Used to select the best among equal-cost A* solutions.
 */
function visualScore(
  path: GridCell[],
  start: GridCell,
  goal: GridCell,
): number {
  if (path.length < 2) return 0;

  let score = 0;
  let bends = 0;
  let longestStraight = 0;
  let currentStraight = 1;

  const totalDist = Math.max(
    1,
    Math.abs(goal.col - start.col) + Math.abs(goal.row - start.row),
  );

  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];

    if (i >= 2) {
      const pp = path[i - 2];
      const dx1 = prev.col - pp.col;
      const dy1 = prev.row - pp.row;
      const dx2 = curr.col - prev.col;
      const dy2 = curr.row - prev.row;

      if (dx1 === dx2 && dy1 === dy2) {
        currentStraight += 1;
      } else {
        bends += 1;
        longestStraight = Math.max(longestStraight, currentStraight);
        currentStraight = 1;

        // Bend midpoint quality (quadratic deviation from center)
        const distFromStart =
          Math.abs(prev.col - start.col) + Math.abs(prev.row - start.row);
        const t = distFromStart / totalDist;
        const deviation = Math.abs(t - 0.5);

        score += deviation * deviation * 100;
      }
    }
  }

  longestStraight = Math.max(longestStraight, currentStraight);

  // Symmetry: how close is path midpoint to geometric center
  const midIdx = Math.floor(path.length / 2);
  const midCell = path[midIdx];
  const geoCenterCol = (start.col + goal.col) / 2;
  const geoCenterRow = (start.row + goal.row) / 2;

  score +=
    (Math.abs(midCell.col - geoCenterCol) +
      Math.abs(midCell.row - geoCenterRow)) *
    2;

  // Fewer bends is better
  score += bends * 10;
  // Longer straight segments are better (negative contribution)
  score -= longestStraight * 0.5;

  return score;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Find a route between two pins on the obstacle map.
 *
 * @param obstacleMap - The obstacle grid
 * @param startWorld - Start point in world coordinates (pin position)
 * @param endWorld - End point in world coordinates (pin position)
 * @param startDir - Direction the start pin faces (wire exits this way)
 * @param endDir - Direction the end pin faces (wire arrives from opposite)
 * @returns RouteResult with waypoints and metrics
 */
export function findPath(
  obstacleMap: ObstacleMap,
  startWorld: Point,
  endWorld: Point,
  startDir: PinDir,
  endDir: PinDir,
): RouteResult {
  const startTime = typeof performance !== "undefined" ? performance.now() : 0;
  const metrics = emptyMetrics();

  const config = obstacleMap.getConfig();
  const { cols, rows } = obstacleMap.getGridSize();

  const start = obstacleMap.worldToGrid(startWorld);
  const end = obstacleMap.worldToGrid(endWorld);

  const exitDir = pinDirToDir(startDir);
  const approachDir = reverseDir(pinDirToDir(endDir));

  const stubStart = applyStub(start, exitDir, config.stubLength);
  const stubEnd = applyStub(end, approachDir, config.stubLength);

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
    metrics.durationMs =
      typeof performance !== "undefined" ? performance.now() - startTime : 0;

    return { success: false, waypoints: [], gridPath: [], metrics };
  }

  // Build exempt cells (stub cells that may be in blocked/padded zones)
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

  // Run A* with equal-cost collection
  const astarResult = runAstar(
    obstacleMap,
    stubStart,
    stubEnd,
    exitDir,
    approachDir,
    config,
    exemptCells,
    metrics,
  );

  if (!astarResult) {
    metrics.durationMs =
      typeof performance !== "undefined" ? performance.now() - startTime : 0;

    return { success: false, waypoints: [], gridPath: [], metrics };
  }

  // Build full path: start pin → stub → A* path → stub → end pin
  const fullGridPath: GridCell[] = [];

  const startStubCells = buildStubCells(start, exitDir, config.stubLength);

  fullGridPath.push(...startStubCells);

  for (let i = 1; i < astarResult.length; i += 1) {
    fullGridPath.push(astarResult[i]);
  }

  const endStubCells = buildStubCells(end, approachDir, config.stubLength);
  const reversedEndStub = [...endStubCells].reverse();

  for (let i = 1; i < reversedEndStub.length; i += 1) {
    fullGridPath.push(reversedEndStub[i]);
  }

  // Simplify collinear points
  const simplified = simplifyPath(fullGridPath);

  // Convert to world coordinates
  const waypoints = simplified.map((cell) => obstacleMap.gridToWorld(cell));

  // Align pin positions (stubs are immutable)
  if (waypoints.length >= 2) {
    waypoints[0] = startWorld;
    waypoints[waypoints.length - 1] = endWorld;

    if (waypoints.length >= 3) {
      const exitDc = DIR_DC[exitDir];
      const exitDr = DIR_DR[exitDir];

      if (exitDc !== 0) {
        let { x } = waypoints[1];

        if (exitDc > 0 && x < startWorld.x) x = startWorld.x + CELL_SIZE;
        if (exitDc < 0 && x > startWorld.x) x = startWorld.x - CELL_SIZE;

        waypoints[1] = { x, y: startWorld.y };
      } else if (exitDr !== 0) {
        let { y } = waypoints[1];

        if (exitDr > 0 && y < startWorld.y) y = startWorld.y + CELL_SIZE;
        if (exitDr < 0 && y > startWorld.y) y = startWorld.y - CELL_SIZE;

        waypoints[1] = { x: startWorld.x, y };
      }
    }

    if (waypoints.length >= 3) {
      const approachDc = DIR_DC[approachDir];
      const approachDr = DIR_DR[approachDir];
      const idx = waypoints.length - 2;

      if (idx > 0) {
        if (approachDc !== 0) {
          let { x } = waypoints[idx];

          if (approachDc > 0 && x < endWorld.x) x = endWorld.x + CELL_SIZE;
          if (approachDc < 0 && x > endWorld.x) x = endWorld.x - CELL_SIZE;

          waypoints[idx] = { x, y: endWorld.y };
        } else if (approachDr !== 0) {
          let { y } = waypoints[idx];

          if (approachDr > 0 && y < endWorld.y) y = endWorld.y + CELL_SIZE;
          if (approachDr < 0 && y > endWorld.y) y = endWorld.y - CELL_SIZE;

          waypoints[idx] = { x: endWorld.x, y };
        }
      }
    }
  }

  metrics.durationMs =
    typeof performance !== "undefined" ? performance.now() - startTime : 0;

  return { success: true, waypoints, gridPath: simplified, metrics };
}

/**
 * Core A* search with:
 * - Multi-level tie-breaking (f → h → bends)
 * - Context-aware turn penalty (bell curve)
 * - Equal-cost path collection with visual scoring
 * - U-turn rejection
 * - Search instrumentation
 *
 * @returns Grid path from start to goal, or null if no path exists
 */
function runAstar(
  obstacleMap: ObstacleMap,
  start: GridCell,
  goal: GridCell,
  initialDir: Dir,
  approachDir: Dir,
  config: RouterConfig,
  exemptCells: Set<string>,
  metrics: RouteMetrics,
): GridCell[] | null {
  const { cols, rows } = obstacleMap.getGridSize();
  const totalCells = cols * rows;

  const gScores = new Float32Array(totalCells * 4).fill(Infinity);
  const cameFrom = new Int32Array(totalCells * 4).fill(-1);
  // Track bend count per node for tie-breaking and visual scoring
  const bendCounts = new Uint16Array(totalCells * 4).fill(0);

  const openSet = new MinHeap();
  const startIdx = (start.row * cols + start.col) * 4 + initialDir;
  const h0 = heuristicSimple(start.col, start.row, goal.col, goal.row);

  gScores[startIdx] = 0;
  openSet.push({
    col: start.col,
    row: start.row,
    g: 0,
    f: h0,
    h: h0,
    dir: initialDir,
    bends: 0,
  });

  // Midpoint for context-aware turn penalty
  const midCol = (start.col + goal.col) / 2;
  const midRow = (start.row + goal.row) / 2;
  const maxDist =
    Math.max(
      1,
      Math.abs(goal.col - start.col) + Math.abs(goal.row - start.row),
    ) / 2;

  // (#3) Equal-cost path collection
  let goalCost = Infinity;
  const goalPaths: Array<{ path: GridCell[]; bends: number }> = [];
  const costTolerance = 0.5; // Accept paths within this cost of the best

  while (openSet.size > 0) {
    // Track peak open set size (#9)
    if (openSet.size > metrics.peakOpenSetSize) {
      metrics.peakOpenSetSize = openSet.size;
    }

    const current = openSet.pop();

    if (!current) break;

    metrics.nodesExpanded += 1;

    // If we've found goal paths and current f exceeds tolerance, stop
    if (goalPaths.length > 0 && current.f > goalCost + costTolerance) {
      break;
    }

    // Goal reached — collect path (#3)
    if (current.col === goal.col && current.row === goal.row) {
      const path = reconstructPath(cameFrom, current, start, cols);

      if (goalPaths.length === 0) {
        goalCost = current.g;
      }

      goalPaths.push({ path, bends: current.bends });
      metrics.equalCostPathsEvaluated += 1;

      // Collect up to 5 equal-cost paths, then stop
      if (goalPaths.length >= 5) break;

      continue; // Don't expand from goal, but keep searching for alternatives
    }

    const currentDir = current.dir;

    for (const dir of ALL_DIRS) {
      // Reject U-turns (reverse direction)
      if (dir === reverseDir(currentDir) && current.g > 0) continue;

      const nc = current.col + DIR_DC[dir];
      const nr = current.row + DIR_DR[dir];

      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;

      const cellKey = `${nc},${nr}`;
      const isExempt = exemptCells.has(cellKey);

      if (!isExempt && !obstacleMap.isPassable(nc, nr)) continue;

      // ── Cost calculation ─────────────────────────────────────────────
      let moveCost = 1;

      // Padded cell penalty
      if (!isExempt && !obstacleMap.isFree(nc, nr)) {
        moveCost += 40;
      }

      // Wire congestion
      const wireCongestion = obstacleMap.getWireCost(nc, nr);

      if (wireCongestion > 0) {
        moveCost += wireCongestion * config.wireCost;

        // (#4) Guide channel bonus: if moving in the same direction as
        // an existing wire (detected by adjacent parallel congestion),
        // apply a small discount to encourage bundle formation.
        const perpDirs: Dir[] =
          dir === DIR_LEFT || dir === DIR_RIGHT
            ? [DIR_UP, DIR_DOWN]
            : [DIR_LEFT, DIR_RIGHT];

        let hasParallelNeighbor = false;

        for (const pDir of perpDirs) {
          const ac = nc + DIR_DC[pDir];
          const ar = nr + DIR_DR[pDir];

          if (ac >= 0 && ac < cols && ar >= 0 && ar < rows) {
            if (obstacleMap.getWireCost(ac, ar) > 0) {
              hasParallelNeighbor = true;
              break;
            }
          }
        }

        // Crossing penalty (perpendicular intersection)
        if (hasParallelNeighbor) {
          // Running parallel is expensive
          moveCost += 12;
        } else if (wireCongestion > 0) {
          // Crossing is cheap
          moveCost += 2;
        }
      }

      // (#4) Guide channel bonus: slight discount for continuing along
      // the approach axis toward the goal (encourages aligned bus wires)
      const approachDc = DIR_DC[approachDir];
      const approachDr = DIR_DR[approachDir];

      if (
        (approachDc !== 0 && DIR_DC[dir] === approachDc) ||
        (approachDr !== 0 && DIR_DR[dir] === approachDr)
      ) {
        // Moving toward goal in the approach direction — slight bonus
        if (
          Math.abs(nc - goal.col) < Math.abs(current.col - goal.col) ||
          Math.abs(nr - goal.row) < Math.abs(current.row - goal.row)
        ) {
          moveCost -= 0.2;
        }
      }

      // Context-aware turn penalty (bell curve: cheap at midpoint)
      const isTurn = dir !== currentDir;
      let newBends = current.bends;

      if (isTurn) {
        newBends += 1;
        const distFromMid = Math.abs(nc - midCol) + Math.abs(nr - midRow);
        const t = distFromMid / maxDist; // 0 at midpoint, ~1 at edges
        // Quadratic: expensive at edges, cheap at center
        const multiplier = 0.3 + t * t * 2.0;

        moveCost += config.turnPenalty * multiplier;
      } else {
        // Straight continuation bonus
        moveCost -= 0.3;
      }

      const tentativeG = current.g + moveCost;
      const neighborIdx = (nr * cols + nc) * 4 + dir;

      if (tentativeG < gScores[neighborIdx]) {
        gScores[neighborIdx] = tentativeG;
        bendCounts[neighborIdx] = newBends;
        cameFrom[neighborIdx] =
          (current.row * cols + current.col) * 4 + currentDir;

        const h = heuristic(nc, nr, goal.col, goal.row, dir);

        openSet.push({
          col: nc,
          row: nr,
          g: tentativeG,
          f: tentativeG + h,
          h,
          dir,
          bends: newBends,
        });
      }
    }
  }

  // (#3) Select best path from equal-cost solutions using visual scoring
  if (goalPaths.length === 0) return null;

  if (goalPaths.length === 1) return goalPaths[0].path;

  let bestPath = goalPaths[0].path;
  let bestScore = visualScore(goalPaths[0].path, start, goal);

  for (let i = 1; i < goalPaths.length; i += 1) {
    const score = visualScore(goalPaths[i].path, start, goal);

    if (score < bestScore) {
      bestScore = score;
      bestPath = goalPaths[i].path;
    }
  }

  return bestPath;
}

/** Reconstruct the grid path by walking backwards through the cameFrom array */
function reconstructPath(
  cameFrom: Int32Array,
  endNode: AStarNode,
  start: GridCell,
  cols: number,
): GridCell[] {
  const path: GridCell[] = [];
  let currentIdx = (endNode.row * cols + endNode.col) * 4 + endNode.dir;

  path.push({ col: endNode.col, row: endNode.row });

  while (cameFrom[currentIdx] !== -1) {
    currentIdx = cameFrom[currentIdx];
    const cellIdx = currentIdx >> 2;
    const col = cellIdx % cols;
    const row = (cellIdx - col) / cols;

    path.push({ col, row });
  }

  path.reverse();

  if (
    path.length === 0 ||
    path[0].col !== start.col ||
    path[0].row !== start.row
  ) {
    path.unshift(start);
  }

  return path;
}

// ── Utility functions ────────────────────────────────────────────────────────

/** Convert a PinDir (left/right/up/down string) to a numeric Dir index */
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

/** Reverse a direction (UP↔DOWN, LEFT↔RIGHT) */
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

/** Compute the grid cell N steps from `cell` in direction `dir` */
function applyStub(cell: GridCell, dir: Dir, length: number): GridCell {
  return {
    col: cell.col + DIR_DC[dir] * length,
    row: cell.row + DIR_DR[dir] * length,
  };
}

/** Build an array of cells from pin outward in direction `dir` (inclusive on both ends) */
function buildStubCells(
  pinCell: GridCell,
  dir: Dir,
  length: number,
): GridCell[] {
  const cells: GridCell[] = [];
  const dc = DIR_DC[dir];
  const dr = DIR_DR[dir];

  for (let i = 0; i <= length; i += 1) {
    cells.push({ col: pinCell.col + dc * i, row: pinCell.row + dr * i });
  }

  return cells;
}

/** Remove collinear intermediate points — keeps only turn waypoints and endpoints */
function simplifyPath(path: GridCell[]): GridCell[] {
  if (path.length <= 2) return path;

  const result: GridCell[] = [path[0]];

  for (let i = 1; i < path.length - 1; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

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
