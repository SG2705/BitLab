/**
 * Wire Router Worker — Message types for main ↔ worker communication.
 */

import type { CircuitSnapshot } from "@/engine/types";

import type { Point, RouterConfig } from "../model/types";

/** Minimal component geometry needed for pin position calculation in the worker */
export interface CompGeometry {
  width: number;
  height: number;
  inputs: number;
  outputs: number;
  busInputGroups?: [number, number][];
  busOutputGroups?: [number, number][];
  isBusInput?: boolean;
  isBusOutput?: boolean;
  isInput?: boolean;
  isClock?: boolean;
  isOutput?: boolean;
}

/** Serializable map of component type → geometry (sent to worker) */
export type GeometryMap = Record<string, CompGeometry>;

// ── Messages from Main → Worker ─────────────────────────────────────────────

export interface WorkerMsgRebuildAndRouteAll {
  type: "rebuildAndRouteAll";
  id: number;
  snapshot: CircuitSnapshot;
  geometry: GeometryMap;
  config?: Partial<RouterConfig>;
}

export interface WorkerMsgRouteSubset {
  type: "routeSubset";
  id: number;
  snapshot: CircuitSnapshot;
  geometry: GeometryMap;
  wireIds: string[];
}

export type WorkerInMessage =
  WorkerMsgRebuildAndRouteAll | WorkerMsgRouteSubset;

// ── Messages from Worker → Main ─────────────────────────────────────────────

export interface WorkerResultRoutes {
  type: "routes";
  id: number;
  routes: Array<{
    wireId: string;
    waypoints: Point[];
    valid: boolean;
  }>;
}

export interface WorkerResultError {
  type: "error";
  id: number;
  message: string;
}

export type WorkerOutMessage = WorkerResultRoutes | WorkerResultError;
