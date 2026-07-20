/**
 * Wire Router — Public API
 *
 * The obstacle map engine for intelligent wire routing.
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
