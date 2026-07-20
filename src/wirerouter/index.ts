/**
 * Wire Router — Public API
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WIRE ROUTER ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * The wire router converts pin-to-pin connections into visually clean
 * orthogonal polyline paths that avoid component obstacles.
 *
 * Module Structure:
 *
 *   WireRouter (WireRouter.ts)
 *     High-level orchestrator. Manages obstacle map + A* pathfinding.
 *     Caches routes with topology/config versioning. Handles incremental
 *     updates when components move/add/remove. Collects routing metrics.
 *
 *   ObstacleMap (obstacles/ObstacleMap.ts)
 *     2D grid discretization of the canvas. Marks component bodies as
 *     BLOCKED, surrounding zones as PADDED. Computes a BFS clearance field.
 *     Tracks wire congestion as a soft-cost layer (not hard obstacles).
 *     Pin-bearing edges have no padding (wires approach directly).
 *     Non-pin edges have configurable padding cells.
 *
 *   A* Pathfinder (routing/astar.ts)
 *     4-directional orthogonal search with:
 *     - Context-aware turn penalty (bell curve: cheap at midpoint)
 *     - Heading-aware heuristic with admissible tie-breaking
 *     - Multi-level priority queue (f → h → bend count)
 *     - Equal-cost path collection with secondary visual scoring
 *     - Guide channel bonus for parallel wire alignment
 *     - Search instrumentation (nodes expanded, peak open set, timing)
 *     - Configuration validation
 *
 *   PathBuilder (utils/pathBuilder.ts)
 *     Converts waypoint arrays to SVG path strings with optional
 *     rounded corners (quadratic Bézier at turns).
 *
 *   WireRouterClient (worker/WireRouterClient.ts)
 *     Main-thread async interface to the Web Worker. Singleton.
 *     Cancels obsolete requests (only latest matters).
 *
 *   Worker (worker/wirerouter.worker.ts)
 *     Off-main-thread routing. Creates its own ObstacleMap from the
 *     snapshot, routes all wires sequentially (marking each as soft obstacle).
 *
 * Data Flow:
 *   Component moved → WireRouter.onComponentMove(compId, snapshot)
 *     → updateObstacle → findAffectedWires → invalidate → reroute
 *
 *   Full reroute → WireRouterClient.rebuildAndRouteAll(snapshot)
 *     → Worker builds ObstacleMap → routes all wires → returns waypoints
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export { ObstacleMap, DEFAULT_ROUTER_CONFIG } from "./obstacles/ObstacleMap";
export type {
  CompSizeResolver,
  ObstacleMapStats,
} from "./obstacles/ObstacleMap";
export { findPath, validateRouterConfig } from "./routing/astar";
export type { RouteResult, RouteMetrics } from "./routing/astar";
export { waypointsToPath } from "./utils/pathBuilder";
export { WireRouter } from "./WireRouter";
export type { CachedRoute, RoutingMetrics } from "./WireRouter";
export { WireRouterClient } from "./worker/WireRouterClient";
export { CellState } from "./model/types";
export type {
  Rect,
  Obstacle,
  Point,
  GridCell,
  RouterConfig,
} from "./model/types";
