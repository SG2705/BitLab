/**
 * WireRouterClient — Main-thread async interface to the wire routing Web Worker.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides a Promise-based API for routing operations that execute in a
 * Web Worker (off the main thread). Used by App.tsx when wire style is
 * "optimized" to prevent UI jank during complex routing.
 *
 * Singleton:
 *   WireRouterClient.getInstance() returns the shared instance.
 *   The underlying Worker is created once and reused across the app lifetime.
 *
 * Request Cancellation:
 *   rebuildAndRouteAll() cancels any pending prior request before sending a new one.
 *   This implements "latest wins" semantics — only the most recent routing
 *   request matters (e.g., during rapid dragging). Cancelled requests reject
 *   with "Cancelled: newer request".
 *
 * Geometry Map:
 *   The worker cannot access the ComponentLibrary singleton, so the client
 *   builds a serializable GeometryMap containing component dimensions and
 *   pin counts for all types in the snapshot. This is sent with each request.
 *
 * Methods:
 *   rebuildAndRouteAll(snapshot, config?) — Full rebuild + route all wires
 *   routeSubset(snapshot, wireIds)       — Route only specified wires
 *   dispose()                            — Terminate the worker
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { library } from "@/engine";
import type { CircuitSnapshot } from "@/engine/types";

import type { RouterConfig } from "../model/types";
import type { CachedRoute } from "../WireRouter";

import type { GeometryMap, WorkerInMessage, WorkerOutMessage } from "./types";

export class WireRouterClient {
  private worker: Worker;
  private nextId = 0;
  private pending = new Map<
    number,
    {
      resolve: (routes: Map<string, CachedRoute>) => void;
      reject: (err: Error) => void;
    }
  >();

  private static instance: WireRouterClient | null = null;

  /** Get the singleton instance (creates the worker on first call) */
  static getInstance(): WireRouterClient {
    if (!WireRouterClient.instance) {
      WireRouterClient.instance = new WireRouterClient();
    }

    return WireRouterClient.instance;
  }

  constructor() {
    this.worker = new Worker(
      new URL("./wirerouter.worker.ts", import.meta.url),
      { type: "module" },
    );

    this.worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;
      const entry = this.pending.get(msg.id);

      if (!entry) return;

      this.pending.delete(msg.id);

      if (msg.type === "error") {
        entry.reject(new Error(msg.message));
      } else {
        const routes = new Map<string, CachedRoute>();

        for (const r of msg.routes) {
          routes.set(r.wireId, {
            wireId: r.wireId,
            waypoints: r.waypoints,
            gridPath: [], // Not needed on main thread for rendering
            valid: r.valid,
            topologyVersion: 0, // Worker routes are always fresh
            configVersion: 0,
          });
        }

        entry.resolve(routes);
      }
    };

    this.worker.onerror = (e) => {
      const entries = Array.from(this.pending.entries());

      this.pending.clear();

      for (const [, entry] of entries) {
        entry.reject(new Error(e.message || "Worker error"));
      }
    };

    this.worker.onmessageerror = () => {
      const entries = Array.from(this.pending.entries());

      this.pending.clear();

      for (const [, entry] of entries) {
        entry.reject(new Error("Worker message deserialization failed"));
      }
    };
  }

  /**
   * Rebuild obstacle map and route all wires in the snapshot.
   * Returns a Map of wireId → CachedRoute.
   *
   * Cancels any previously pending request (only the latest matters).
   */
  rebuildAndRouteAll(
    snapshot: CircuitSnapshot,
    config?: Partial<RouterConfig>,
  ): Promise<Map<string, CachedRoute>> {
    // Cancel any pending requests — only the latest rebuild matters
    const entries = Array.from(this.pending.entries());

    this.pending.clear();

    for (const [, entry] of entries) {
      entry.reject(new Error("Cancelled: newer request"));
    }

    const id = this.nextId;

    this.nextId += 1;
    const geometry = WireRouterClient.buildGeometryMap(snapshot);

    const msg: WorkerInMessage = {
      type: "rebuildAndRouteAll",
      id,
      snapshot,
      geometry,
      config,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(msg);
    });
  }

  /**
   * Route a subset of wires (e.g. after a component move).
   */
  routeSubset(
    snapshot: CircuitSnapshot,
    wireIds: string[],
  ): Promise<Map<string, CachedRoute>> {
    const id = this.nextId;

    this.nextId += 1;
    const geometry = WireRouterClient.buildGeometryMap(snapshot);

    const msg: WorkerInMessage = {
      type: "routeSubset",
      id,
      snapshot,
      geometry,
      wireIds,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(msg);
    });
  }

  /** Terminate the worker (cleanup) */
  dispose(): void {
    this.worker.terminate();

    for (const [, entry] of this.pending) {
      entry.reject(new Error("Worker disposed"));
    }

    this.pending.clear();
    WireRouterClient.instance = null;
  }

  /**
   * Build a serializable geometry map from the current library state.
   * Includes all component types present in the snapshot.
   */
  private static buildGeometryMap(snapshot: CircuitSnapshot): GeometryMap {
    const map: GeometryMap = {};
    const types = new Set<string>();

    for (const comp of Object.values(snapshot.components)) {
      types.add(comp.type);
    }

    for (const type of types) {
      if (!library.has(type)) continue;

      const def = library.get(type);

      map[type] = {
        width: def.width,
        height: def.height,
        inputs: def.inputs,
        outputs: def.outputs,
        busInputGroups: def.busInputGroups,
        busOutputGroups: def.busOutputGroups,
        isBusInput: def.isBusInput,
        isBusOutput: def.isBusOutput,
        isInput: def.isInput,
        isClock: def.isClock,
        isOutput: def.isOutput,
      };
    }

    return map;
  }
}

export default WireRouterClient;
