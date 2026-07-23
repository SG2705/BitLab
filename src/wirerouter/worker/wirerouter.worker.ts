/* eslint-disable no-restricted-globals */
/**
 * wirerouter.worker.ts — Off-main-thread wire routing Web Worker.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Performs heavy routing operations without blocking the main thread:
 *
 *   rebuildAndRouteAll:
 *     Receives a full CircuitSnapshot + component geometry map.
 *     Builds a fresh ObstacleMap, then routes ALL wires sequentially.
 *     Each routed wire is marked as a soft obstacle for subsequent wires,
 *     producing natural wire spreading.
 *
 *   routeSubset:
 *     Routes only the specified wire IDs (used after component moves).
 *     Builds a fresh ObstacleMap from the snapshot first.
 *
 * Communication:
 *   Main → Worker: WorkerInMessage (snapshot + geometry + config)
 *   Worker → Main: WorkerOutMessage (routes array or error)
 *
 * The worker maintains its own geometry map (component sizes/pin counts)
 * since it cannot access the ComponentLibrary singleton from the main thread.
 * Pin positions are computed locally using the same algorithm as src/lib/circuit.ts.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { GATE_TYPE_JUNCTION } from "@/engine/constants";
import type { CircuitSnapshot, ComponentInstance } from "@/engine/types";
import { CELL_SIZE, PIN_OFFSET, PIN_SPACING_UNITS } from "@/globals";
import { PIN_DIR, PIN_KIND, WIRE_JUNCTION_RADIUS } from "@/lib/constants";
import type { PinDir, PinKind } from "@/lib/types";

import type { Point } from "../model/types";
import { type CompSizeResolver, ObstacleMap } from "../obstacles/ObstacleMap";
import { findPath } from "../routing/astar";

import type {
  CompGeometry,
  GeometryMap,
  WorkerInMessage,
  WorkerOutMessage,
} from "./types";

// ── Worker-local geometry store ──────────────────────────────────────────────

let geometryMap: GeometryMap = {};

function getGeometry(type: string): CompGeometry | null {
  return geometryMap[type] ?? null;
}

/** Size resolver that uses the geometry map sent from the main thread */
const workerSizeResolver: CompSizeResolver = (comp) => {
  const geo = getGeometry(comp.type);

  if (!geo) return null;

  const r = comp.rotation ?? 0;

  if (r === 90 || r === 270) {
    return { w: geo.height, h: geo.width };
  }

  return { w: geo.width, h: geo.height };
};

// ── Pin position calculation (mirrors src/lib/circuit.ts pinPos) ─────────────

function pinPosWorker(
  comp: ComponentInstance,
  kind: PinKind,
  idx: number,
): { x: number; y: number } {
  const def = getGeometry(comp.type);

  if (!def) return { x: comp.x, y: comp.y };

  // Junction: wires terminate at the boundary of the dot (radius 4.5)
  if (comp.type === GATE_TYPE_JUNCTION) {
    const DOT_RADIUS = WIRE_JUNCTION_RADIUS * CELL_SIZE;

    if (kind === PIN_KIND.IN) {
      return { x: comp.x - DOT_RADIUS, y: comp.y };
    }

    return { x: comp.x + DOT_RADIUS, y: comp.y };
  }

  const r = comp.rotation ?? 0;
  const rw = r === 90 || r === 270 ? def.height : def.width;
  const rh = r === 90 || r === 270 ? def.width : def.height;
  const isVertical = r === 0 || r === 180;

  const busGroups =
    kind === PIN_KIND.IN ? def.busInputGroups : def.busOutputGroups;
  const totalPins = kind === PIN_KIND.IN ? def.inputs : def.outputs;

  let slotIndex: number;
  let slotCount: number;

  if (busGroups && busGroups.length > 0) {
    const groupStartMap = new Map(busGroups.map((g, gi) => [g[0], { gi, g }]));
    let slots = 0;
    let foundSlot = -1;
    let pi = 0;

    while (pi < totalPins) {
      const entry = groupStartMap.get(pi);

      if (entry) {
        const [start, end] = entry.g;

        if (idx >= start && idx < end) foundSlot = slots;
        slots += 1;
        pi = end;
      } else {
        if (pi === idx) foundSlot = slots;
        slots += 1;
        pi += 1;
      }
    }

    slotCount = slots;
    slotIndex = foundSlot >= 0 ? foundSlot : idx;
  } else {
    slotCount = totalPins;
    slotIndex = idx;
  }

  const sizeAxis = isVertical ? rh : rw;
  const pinSpacing = PIN_SPACING_UNITS * CELL_SIZE;

  let isBusSlot: boolean[] = [];

  if (busGroups && busGroups.length > 0) {
    const groupStartSet = new Set(busGroups.map((g) => g[0]));
    const groupEndMap = new Map(busGroups.map((g) => [g[0], g[1]]));
    let pi = 0;

    while (pi < totalPins) {
      if (groupStartSet.has(pi)) {
        isBusSlot.push(true);
        const end = groupEndMap.get(pi);

        pi = end ?? pi + 1;
      } else {
        isBusSlot.push(false);
        pi += 1;
      }
    }
  } else {
    isBusSlot = Array.from({ length: slotCount }, () => false);
  }

  let totalSpan = 0;

  for (let i = 1; i < slotCount; i += 1) {
    const prevBus = isBusSlot[i - 1];
    const curBus = isBusSlot[i];

    totalSpan += prevBus || curBus ? pinSpacing * 2 : pinSpacing;
  }

  const startOffset =
    Math.round((sizeAxis - totalSpan) / 2 / CELL_SIZE) * CELL_SIZE;

  let pos = startOffset;

  for (let i = 1; i <= slotIndex; i += 1) {
    const prevBus = isBusSlot[i - 1];
    const curBus = isBusSlot[i];

    pos += prevBus || curBus ? pinSpacing * 2 : pinSpacing;
  }

  let x: number;
  let y: number;

  if (isVertical) {
    const isLeftEdge =
      (r === 0 && kind === PIN_KIND.IN) || (r === 180 && kind === PIN_KIND.OUT);

    x = isLeftEdge ? comp.x - PIN_OFFSET : comp.x + rw + PIN_OFFSET;
    y = comp.y + pos;
  } else {
    const isTopEdge =
      (r === 90 && kind === PIN_KIND.IN) ||
      (r === 270 && kind === PIN_KIND.OUT);

    x = comp.x + pos;
    y = isTopEdge ? comp.y - PIN_OFFSET : comp.y + rh + PIN_OFFSET;
  }

  return { x, y };
}

function pinDirectionWorker(comp: ComponentInstance, kind: PinKind): PinDir {
  const r = comp.rotation ?? 0;
  const isOutput = kind === PIN_KIND.OUT;

  if (isOutput) {
    if (r === 0) return PIN_DIR.RIGHT;
    if (r === 90) return PIN_DIR.DOWN;
    if (r === 180) return PIN_DIR.LEFT;

    return PIN_DIR.UP;
  }

  if (r === 0) return PIN_DIR.LEFT;
  if (r === 90) return PIN_DIR.UP;
  if (r === 180) return PIN_DIR.RIGHT;

  return PIN_DIR.DOWN;
}

// ── Routing logic ────────────────────────────────────────────────────────────

function routeWires(
  snapshot: CircuitSnapshot,
  obstacleMap: ObstacleMap,
  wireIds: string[],
): Array<{ wireId: string; waypoints: Point[]; valid: boolean }> {
  const results: Array<{
    wireId: string;
    waypoints: Point[];
    valid: boolean;
  }> = [];

  for (const wireId of wireIds) {
    const wire = snapshot.wires[wireId];

    if (!wire) {
      results.push({ wireId, waypoints: [], valid: false });
      continue;
    }

    const sourceComp = snapshot.components[wire.from.comp];
    const targetComp = snapshot.components[wire.to.comp];

    if (!sourceComp || !targetComp) {
      results.push({ wireId, waypoints: [], valid: false });
      continue;
    }

    const p1 = pinPosWorker(sourceComp, PIN_KIND.OUT, wire.from.pin);
    const p2 = pinPosWorker(targetComp, PIN_KIND.IN, wire.to.pin);
    const dir1 = pinDirectionWorker(sourceComp, PIN_KIND.OUT);
    const dir2 = pinDirectionWorker(targetComp, PIN_KIND.IN);

    const result = findPath(obstacleMap, p1, p2, dir1, dir2);

    results.push({
      wireId,
      waypoints: result.waypoints,
      valid: result.success,
    });

    // Mark this wire path as a soft obstacle for subsequent wires
    if (result.success && result.gridPath.length > 0) {
      obstacleMap.markWirePath(result.gridPath);
    }
  }

  return results;
}

// ── Message handler ──────────────────────────────────────────────────────────

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  try {
    switch (msg.type) {
      case "rebuildAndRouteAll": {
        geometryMap = msg.geometry;

        const obstacleMap = new ObstacleMap(
          msg.config ?? {},
          workerSizeResolver,
        );

        obstacleMap.buildFromSnapshot(msg.snapshot);
        obstacleMap.clearWireCosts();

        const wireIds = Object.keys(msg.snapshot.wires);
        const routes = routeWires(msg.snapshot, obstacleMap, wireIds);

        const response: WorkerOutMessage = {
          type: "routes",
          id: msg.id,
          routes,
        };

        self.postMessage(response);

        break;
      }

      case "routeSubset": {
        geometryMap = msg.geometry;

        const obstacleMap = new ObstacleMap({}, workerSizeResolver);

        obstacleMap.buildFromSnapshot(msg.snapshot);
        obstacleMap.clearWireCosts();

        const routes = routeWires(msg.snapshot, obstacleMap, msg.wireIds);

        const response: WorkerOutMessage = {
          type: "routes",
          id: msg.id,
          routes,
        };

        self.postMessage(response);

        break;
      }
    }
  } catch (err) {
    const response: WorkerOutMessage = {
      type: "error",
      id: msg.id,
      message: err instanceof Error ? err.message : String(err),
    };

    self.postMessage(response);
  }
};
