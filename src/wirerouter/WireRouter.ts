/**
 * WireRouter — High-level orchestrator for optimized wire routing.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ties together ObstacleMap (grid discretization) and A* pathfinding into
 * a single routing API consumed by the application layer.
 *
 * Responsibilities:
 *   • Build/rebuild obstacle map from circuit snapshots
 *   • Route individual wires or all wires in bulk
 *   • Cache routes with dual versioning (topology + config)
 *   • Detect which routes are affected by component changes
 *   • Provide selective re-routing for incremental edits
 *   • Collect and expose routing performance metrics
 *
 * Cache Versioning:
 *   Every cached route is stamped with two version numbers:
 *     topologyVersion — bumped when obstacles change (move/add/remove/rebuild)
 *     configVersion   — bumped when routing parameters change (setConfig)
 *   On cache lookup, stale routes (version mismatch) trigger recomputation.
 *
 * Invalidation Strategy (#1 — tight):
 *   On component move, only these routes are invalidated:
 *     1. Wires directly connected to the moved component
 *     2. Wires whose grid path crosses the component's BODY bounds
 *   The padded bounds are NOT used for intersection — a wire passing
 *   through padding is still valid (just higher cost, not blocked).
 *
 * Metrics (#7):
 *   Tracks cache hits/misses, reroute count, total/avg routing time,
 *   and version numbers. Exposed via getMetrics() for UI display.
 *
 * Singleton Pattern:
 *   WireRouter.getInstance() returns a shared instance used by App.tsx.
 *   The worker has its own independent ObstacleMap (no shared state).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CircuitSnapshot, Wire } from "@/engine";
import { pinDirection, pinPos } from "@/lib/circuit";
import { PIN_KIND } from "@/lib/constants";
import type { PinDir } from "@/lib/types";

import type { GridCell, Point, RouterConfig } from "./model/types";
import { type CompSizeResolver, ObstacleMap } from "./obstacles/ObstacleMap";
import { findPath, type RouteResult } from "./routing/astar";

// ── Types ────────────────────────────────────────────────────────────────────

/** Cached route for a single wire, stamped with topology version (#10) */
export interface CachedRoute {
  wireId: string;
  /** World-coordinate waypoints for SVG rendering */
  waypoints: Point[];
  /** Grid-coordinate path (for intersection checks) */
  gridPath: GridCell[];
  /** Whether the route was successfully computed */
  valid: boolean;
  /** Topology version when this route was computed (#10) */
  topologyVersion: number;
  /** Config version when this route was computed (#6) */
  configVersion: number;
}

/** Routing performance metrics (#7) */
export interface RoutingMetrics {
  /** Number of cache hits (route served from cache) */
  cacheHits: number;
  /** Number of cache misses (route computed fresh) */
  cacheMisses: number;
  /** Number of routes invalidated and recomputed */
  reroutes: number;
  /** Total routing time accumulated (ms) */
  totalRoutingTimeMs: number;
  /** Average routing time per wire (ms) */
  avgRoutingTimeMs: number;
  /** Current cache size */
  cacheSize: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Current topology version */
  topologyVersion: number;
  /** Current config version */
  configVersion: number;
}

// ── WireRouter Class ─────────────────────────────────────────────────────────

export class WireRouter {
  private obstacleMap: ObstacleMap;

  /** Cached routes keyed by wire ID */
  private cache: Map<string, CachedRoute> = new Map();

  /** Monotonically increasing topology version (#10) */
  private topologyVersion: number = 0;

  /** Monotonically increasing config version (#6) */
  private configVersion: number = 0;

  /** Routing metrics (#7) */
  private metrics: RoutingMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    reroutes: 0,
    totalRoutingTimeMs: 0,
    avgRoutingTimeMs: 0,
    cacheSize: 0,
    hitRate: 0,
    topologyVersion: 0,
    configVersion: 0,
  };

  private static instance: WireRouter | null = null;

  /** Get the singleton instance */
  static getInstance(): WireRouter {
    if (!WireRouter.instance) {
      WireRouter.instance = new WireRouter();
    }

    return WireRouter.instance;
  }

  constructor(config?: Partial<RouterConfig>, sizeResolver?: CompSizeResolver) {
    this.obstacleMap = new ObstacleMap(config, sizeResolver);
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Get the underlying obstacle map (for visualization) */
  getObstacleMap(): ObstacleMap {
    return this.obstacleMap;
  }

  /** Get router config */
  getConfig(): RouterConfig {
    return this.obstacleMap.getConfig();
  }

  /**
   * Update router config (#6).
   * Bumps config version — cached routes with old version will be treated as stale.
   */
  setConfig(patch: Partial<RouterConfig>): void {
    this.obstacleMap.setConfig(patch);
    this.configVersion += 1;
    // Invalidate all cached routes since config affects routing decisions
    this.cache.clear();
  }

  /** Get routing performance metrics (#7) */
  getMetrics(): RoutingMetrics {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;

    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      hitRate: totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0,
      avgRoutingTimeMs:
        this.metrics.cacheMisses > 0
          ? this.metrics.totalRoutingTimeMs / this.metrics.cacheMisses
          : 0,
      topologyVersion: this.topologyVersion,
      configVersion: this.configVersion,
    };
  }

  /** Reset routing metrics (#7) */
  resetMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      reroutes: 0,
      totalRoutingTimeMs: 0,
      avgRoutingTimeMs: 0,
      cacheSize: 0,
      hitRate: 0,
      topologyVersion: this.topologyVersion,
      configVersion: this.configVersion,
    };
  }

  /**
   * Initialize or rebuild from a circuit snapshot.
   * Rebuilds the obstacle map, bumps topology version, clears cache.
   */
  rebuild(snapshot: CircuitSnapshot): void {
    this.obstacleMap.buildFromSnapshot(snapshot);
    this.topologyVersion += 1;
    this.cache.clear();
  }

  /**
   * Route a single wire and cache the result.
   * Returns cached route if still valid (version check), otherwise recomputes.
   */
  routeWire(wire: Wire, snapshot: CircuitSnapshot): CachedRoute {
    // Check cache with version validation (#10, #6)
    const cached = this.cache.get(wire.id);

    if (
      cached &&
      cached.topologyVersion === this.topologyVersion &&
      cached.configVersion === this.configVersion
    ) {
      this.metrics.cacheHits += 1;

      return cached;
    }

    // Cache miss or stale — compute fresh
    this.metrics.cacheMisses += 1;

    const route = this.computeRoute(wire, snapshot);

    this.cache.set(wire.id, route);

    return route;
  }

  /**
   * Get a cached route without computing.
   * Returns undefined if not cached or if version is stale.
   */
  getCachedRoute(wireId: string): CachedRoute | undefined {
    const cached = this.cache.get(wireId);

    if (
      cached &&
      cached.topologyVersion === this.topologyVersion &&
      cached.configVersion === this.configVersion
    ) {
      return cached;
    }

    return undefined;
  }

  /** Invalidate a specific wire's cached route */
  invalidateWire(wireId: string): void {
    this.cache.delete(wireId);
  }

  /** Invalidate all cached routes */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Handle a component move: re-routes only affected wires (#1).
   *
   * Tighter invalidation: only invalidates wires that are
   * - directly connected to the moved component, OR
   * - whose grid path actually crosses the component's BODY bounds (not padded bounds)
   *
   * @returns Array of wire IDs that were re-routed
   */
  onComponentMove(compId: string, snapshot: CircuitSnapshot): string[] {
    const comp = snapshot.components[compId];

    if (comp) {
      this.obstacleMap.updateObstacle(comp);
    }

    this.topologyVersion += 1;

    // Find affected wires with tight invalidation (#1)
    const affectedIds = this.findAffectedWires(compId, snapshot);

    this.metrics.reroutes += affectedIds.length;

    // Invalidate and re-route
    for (const wireId of affectedIds) {
      this.cache.delete(wireId);
    }

    for (const wireId of affectedIds) {
      const wire = snapshot.wires[wireId];

      if (wire) {
        this.routeWire(wire, snapshot);
      }
    }

    return affectedIds;
  }

  /** Handle component addition */
  onComponentAdd(compId: string, snapshot: CircuitSnapshot): string[] {
    const comp = snapshot.components[compId];

    if (comp) {
      this.obstacleMap.updateObstacle(comp);
    }

    this.topologyVersion += 1;

    return this.invalidateIntersecting(compId, snapshot);
  }

  /** Handle component removal */
  onComponentRemove(compId: string, snapshot: CircuitSnapshot): void {
    this.obstacleMap.removeObstacle(compId);
    this.topologyVersion += 1;

    for (const [wireId, wire] of Object.entries(snapshot.wires)) {
      if (wire.from.comp === compId || wire.to.comp === compId) {
        this.cache.delete(wireId);
      }
    }
  }

  /**
   * Route all wires in the snapshot.
   * Routes sequentially — each routed wire is marked as a soft obstacle.
   */
  routeAll(snapshot: CircuitSnapshot): Map<string, CachedRoute> {
    this.obstacleMap.clearWireCosts();
    this.cache.clear();
    this.topologyVersion += 1;

    for (const wire of Object.values(snapshot.wires)) {
      const route = this.computeRoute(wire, snapshot);

      this.cache.set(wire.id, route);

      if (route.valid && route.gridPath.length > 0) {
        this.obstacleMap.markWirePath(route.gridPath);
      }
    }

    return new Map(this.cache);
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private computeRoute(wire: Wire, snapshot: CircuitSnapshot): CachedRoute {
    const sourceComp = snapshot.components[wire.from.comp];
    const targetComp = snapshot.components[wire.to.comp];

    if (!sourceComp || !targetComp) {
      return {
        wireId: wire.id,
        waypoints: [],
        gridPath: [],
        valid: false,
        topologyVersion: this.topologyVersion,
        configVersion: this.configVersion,
      };
    }

    const p1 = pinPos(sourceComp, PIN_KIND.OUT, wire.from.pin);
    const p2 = pinPos(targetComp, PIN_KIND.IN, wire.to.pin);
    const dir1: PinDir = pinDirection(sourceComp, PIN_KIND.OUT);
    const dir2: PinDir = pinDirection(targetComp, PIN_KIND.IN);

    const startTime =
      typeof performance !== "undefined" ? performance.now() : 0;

    const result: RouteResult = findPath(this.obstacleMap, p1, p2, dir1, dir2);

    const elapsed =
      typeof performance !== "undefined" ? performance.now() - startTime : 0;

    this.metrics.totalRoutingTimeMs += elapsed;

    return {
      wireId: wire.id,
      waypoints: result.waypoints,
      gridPath: result.gridPath,
      valid: result.success,
      topologyVersion: this.topologyVersion,
      configVersion: this.configVersion,
    };
  }

  /**
   * Find wires affected by a component move (#1 — tighter invalidation).
   *
   * Uses the component's BODY bounds (not padded bounds) for intersection
   * checking. This is tighter because a wire passing through the padding
   * zone but not the body is still valid — it just has higher cost.
   */
  private findAffectedWires(
    compId: string,
    snapshot: CircuitSnapshot,
  ): string[] {
    const affected = new Set<string>();

    // 1. Wires directly connected to the moved component
    for (const [wireId, wire] of Object.entries(snapshot.wires)) {
      if (wire.from.comp === compId || wire.to.comp === compId) {
        affected.add(wireId);
      }
    }

    // 2. Wires whose grid path crosses the component's BODY bounds (#1)
    const obstacle = this.obstacleMap
      .getObstacles()
      .find((o) => o.compId === compId);

    if (!obstacle) return Array.from(affected);

    // Use actual body bounds (tighter than paddedBounds)
    const bodyBounds = obstacle.bounds;

    for (const [wireId, route] of this.cache) {
      if (affected.has(wireId)) continue;
      if (!route.valid) continue;

      // Skip routes from different topology version (they'll be recomputed anyway)
      if (route.topologyVersion !== this.topologyVersion - 1) continue;

      for (const cell of route.gridPath) {
        const worldPt = this.obstacleMap.gridToWorld(cell);

        if (WireRouter.pointInRect(worldPt, bodyBounds)) {
          affected.add(wireId);
          break;
        }
      }
    }

    return Array.from(affected);
  }

  /**
   * Invalidate cached routes that intersect a newly placed component.
   */
  private invalidateIntersecting(
    compId: string,
    snapshot: CircuitSnapshot,
  ): string[] {
    const affected: string[] = [];
    const obstacle = this.obstacleMap
      .getObstacles()
      .find((o) => o.compId === compId);

    if (!obstacle) return affected;

    for (const [wireId, route] of this.cache) {
      if (!route.valid) continue;

      let intersects = false;

      for (const cell of route.gridPath) {
        const worldPt = this.obstacleMap.gridToWorld(cell);

        if (WireRouter.pointInRect(worldPt, obstacle.bounds)) {
          intersects = true;
          break;
        }
      }

      if (intersects) {
        affected.push(wireId);
        this.cache.delete(wireId);
        this.metrics.reroutes += 1;

        const wire = snapshot.wires[wireId];

        if (wire) {
          this.routeWire(wire, snapshot);
        }
      }
    }

    return affected;
  }

  private static pointInRect(
    p: Point,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      p.x >= rect.x &&
      p.x <= rect.x + rect.width &&
      p.y >= rect.y &&
      p.y <= rect.y + rect.height
    );
  }
}
