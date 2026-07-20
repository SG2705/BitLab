/**
 * WireRouter — High-level orchestrator for optimized wire routing.
 *
 * Responsibilities:
 * - Ties ObstacleMap + A* pathfinding together
 * - Caches computed routes per wire ID
 * - Provides selective re-routing when components move
 * - Detects which wires are affected by obstacle changes
 */

import type { CircuitSnapshot, Wire } from "@/engine";
import { pinDirection, pinPos } from "@/lib/circuit";
import { PIN_KIND } from "@/lib/constants";
import type { PinDir } from "@/lib/types";

import type { GridCell, Point, RouterConfig } from "./model/types";
import { type CompSizeResolver, ObstacleMap } from "./obstacles/ObstacleMap";
import { findPath, type RouteResult } from "./routing/astar";

/** Cached route for a single wire */
export interface CachedRoute {
  wireId: string;
  /** World-coordinate waypoints for SVG rendering */
  waypoints: Point[];
  /** Grid-coordinate path (for intersection checks) */
  gridPath: GridCell[];
  /** Whether the route was successfully computed */
  valid: boolean;
}

export class WireRouter {
  private obstacleMap: ObstacleMap;

  /** Cached routes keyed by wire ID */
  private cache: Map<string, CachedRoute> = new Map();

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

  /** Update router config */
  setConfig(patch: Partial<RouterConfig>): void {
    this.obstacleMap.setConfig(patch);
    // Config change invalidates all cached routes
    this.cache.clear();
  }

  /**
   * Initialize or rebuild from a circuit snapshot.
   * Rebuilds the obstacle map and clears all cached routes.
   */
  rebuild(snapshot: CircuitSnapshot): void {
    this.obstacleMap.buildFromSnapshot(snapshot);
    this.cache.clear();
  }

  /**
   * Route a single wire and cache the result.
   * Returns the cached route (or computes it fresh).
   */
  routeWire(wire: Wire, snapshot: CircuitSnapshot): CachedRoute {
    // Check cache first
    const cached = this.cache.get(wire.id);

    if (cached) return cached;

    // Compute route
    const route = this.computeRoute(wire, snapshot);

    this.cache.set(wire.id, route);

    return route;
  }

  /**
   * Get a cached route without computing.
   * Returns undefined if the wire hasn't been routed yet.
   */
  getCachedRoute(wireId: string): CachedRoute | undefined {
    return this.cache.get(wireId);
  }

  /**
   * Invalidate a specific wire's cached route.
   * Next call to routeWire() will recompute it.
   */
  invalidateWire(wireId: string): void {
    this.cache.delete(wireId);
  }

  /**
   * Invalidate all cached routes.
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Handle a component move: re-routes only affected wires.
   *
   * Affected wires are:
   * 1. Wires directly connected to the moved component
   * 2. Wires whose cached path intersects the moved component's new position
   *
   * @param compId - The moved component's ID
   * @param snapshot - The current (post-move) circuit snapshot
   * @returns Array of wire IDs that were re-routed
   */
  onComponentMove(compId: string, snapshot: CircuitSnapshot): string[] {
    // Rebuild obstacle map with new positions
    const comp = snapshot.components[compId];

    if (comp) {
      this.obstacleMap.updateObstacle(comp);
    }

    // Find affected wires
    const affectedIds = this.findAffectedWires(compId, snapshot);

    // Invalidate and re-route affected wires
    for (const wireId of affectedIds) {
      this.cache.delete(wireId);
    }

    // Re-route them
    for (const wireId of affectedIds) {
      const wire = snapshot.wires[wireId];

      if (wire) {
        this.routeWire(wire, snapshot);
      }
    }

    return affectedIds;
  }

  /**
   * Handle component addition.
   * Checks if any existing routed wire passes through the new component.
   */
  onComponentAdd(compId: string, snapshot: CircuitSnapshot): string[] {
    const comp = snapshot.components[compId];

    if (comp) {
      this.obstacleMap.updateObstacle(comp);
    }

    // Check which cached paths now intersect the new obstacle
    return this.invalidateIntersecting(compId, snapshot);
  }

  /**
   * Handle component removal.
   */
  onComponentRemove(compId: string, snapshot: CircuitSnapshot): void {
    this.obstacleMap.removeObstacle(compId);

    // Invalidate wires that were connected to this component
    for (const [wireId, wire] of Object.entries(snapshot.wires)) {
      if (wire.from.comp === compId || wire.to.comp === compId) {
        this.cache.delete(wireId);
      }
    }
  }

  /**
   * Route all wires in the snapshot.
   * Routes sequentially — each routed wire is marked as a soft obstacle
   * so subsequent wires prefer not overlapping.
   */
  routeAll(snapshot: CircuitSnapshot): Map<string, CachedRoute> {
    this.obstacleMap.clearWireCosts();
    this.cache.clear();

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
      };
    }

    // Get pin positions in world coordinates
    const p1 = pinPos(sourceComp, PIN_KIND.OUT, wire.from.pin);
    const p2 = pinPos(targetComp, PIN_KIND.IN, wire.to.pin);

    // Get pin directions
    const dir1: PinDir = pinDirection(sourceComp, PIN_KIND.OUT);
    const dir2: PinDir = pinDirection(targetComp, PIN_KIND.IN);

    // Run pathfinding
    const result: RouteResult = findPath(this.obstacleMap, p1, p2, dir1, dir2);

    return {
      wireId: wire.id,
      waypoints: result.waypoints,
      gridPath: result.gridPath,
      valid: result.success,
    };
  }

  /**
   * Find wires affected by a component move:
   * - Wires connected to the component
   * - Wires whose cached path passes through the component's new bounding area
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

    // 2. Wires whose cached path intersects the component's obstacle area
    const comp = snapshot.components[compId];

    if (!comp) return Array.from(affected);

    const obstacle = this.obstacleMap
      .getObstacles()
      .find((o) => o.compId === compId);

    if (!obstacle) return Array.from(affected);

    // Check each cached route's grid path for intersection
    for (const [wireId, route] of this.cache) {
      if (affected.has(wireId)) continue;
      if (!route.valid) continue;

      for (const cell of route.gridPath) {
        const worldPt = this.obstacleMap.gridToWorld(cell);

        if (WireRouter.pointInRect(worldPt, obstacle.paddedBounds)) {
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

        if (WireRouter.pointInRect(worldPt, obstacle.paddedBounds)) {
          intersects = true;
          break;
        }
      }

      if (intersects) {
        affected.push(wireId);
        this.cache.delete(wireId);

        // Re-route immediately
        const wire = snapshot.wires[wireId];

        if (wire) {
          this.routeWire(wire, snapshot);
        }
      }
    }

    return affected;
  }

  /** Check if a point falls within a rectangle */
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
