/**
 * Wire Router — Public API
 *
 * The obstacle map engine for intelligent wire routing.
 */

export { ObstacleMap, DEFAULT_ROUTER_CONFIG } from "./obstacles/ObstacleMap";
export { CellState } from "./model/types";
export type {
  Rect,
  Obstacle,
  Point,
  GridCell,
  RouterConfig,
} from "./model/types";
