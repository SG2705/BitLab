/**
 * pathBuilder.ts — Converts waypoints to SVG path `d` strings.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Takes an array of orthogonal waypoints (from the A* router) and produces
 * an SVG path string suitable for rendering in the WirePath component.
 *
 * Two output modes:
 *   waypointsToPolyline — Sharp corners (straight line segments)
 *   waypointsToPath     — Rounded corners (quadratic Bézier at each turn)
 *
 * The corner radius is clamped to half the shortest adjacent segment
 * to prevent arcs from overlapping.
 *
 * Utilities:
 *   segmentLength     — Euclidean distance between two points
 *   pointAlongSegment — Interpolate a point at distance `d` from `from` toward `to`
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Point } from "../model/types";
import { DEFAULT_ROUTER_CONFIG } from "../obstacles/ObstacleMap";

/** Corner radius in pixels for rounded turns. Set to 0 for sharp corners. */
const CORNER_RADIUS = DEFAULT_ROUTER_CONFIG.bendRadius;

/** Convert waypoints to a simple SVG polyline (M...L...L...) with sharp corners */
export const waypointsToPolyline = (waypoints: Point[]): string => {
  if (waypoints.length === 0) return "";

  const parts = [`M ${waypoints[0].x} ${waypoints[0].y}`];

  for (let i = 1; i < waypoints.length; i += 1) {
    parts.push(`L ${waypoints[i].x} ${waypoints[i].y}`);
  }

  return parts.join(" ");
};

/** Compute Euclidean distance between two points */
export const segmentLength = (a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  return Math.sqrt(dx * dx + dy * dy);
};

/** Interpolate a point at distance `dist` from `from` toward `to` */
export const pointAlongSegment = (
  from: Point,
  to: Point,
  dist: number,
): Point => {
  const len = segmentLength(from, to);

  if (len === 0) return from;

  const t = dist / len;

  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
};

/**
 * Convert waypoints to an SVG path string with optional rounded corners.
 * Uses quadratic Bézier curves at each turn point, with radius clamped
 * to half the shortest adjacent segment to prevent overlap.
 *
 * @param waypoints - Array of orthogonal waypoints from the router
 * @param radius - Corner radius in pixels (0 = sharp corners, uses polyline)
 * @returns SVG path `d` attribute string
 */
export const waypointsToPath = (
  waypoints: Point[],
  radius = CORNER_RADIUS,
): string => {
  if (waypoints.length === 0) return "";
  if (waypoints.length === 1) return `M ${waypoints[0].x} ${waypoints[0].y}`;

  if (waypoints.length === 2) {
    return `M ${waypoints[0].x} ${waypoints[0].y} L ${waypoints[1].x} ${waypoints[1].y}`;
  }

  // No rounding — simple polyline
  if (radius <= 0) {
    return waypointsToPolyline(waypoints);
  }

  // Build path with rounded corners
  const parts: string[] = [];

  parts.push(`M ${waypoints[0].x} ${waypoints[0].y}`);

  for (let i = 1; i < waypoints.length - 1; i += 1) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    // Compute the actual radius (clamped to half the shortest segment)
    const segPrev = segmentLength(prev, curr);
    const segNext = segmentLength(curr, next);
    const r = Math.min(radius, segPrev / 2, segNext / 2);

    if (r < 1) {
      // Too small to round — just line to the point
      parts.push(`L ${curr.x} ${curr.y}`);
      continue;
    }

    // Point before the corner (on the incoming segment)
    const beforeCorner = pointAlongSegment(curr, prev, r);
    // Point after the corner (on the outgoing segment)
    const afterCorner = pointAlongSegment(curr, next, r);

    // Line to the start of the corner arc
    parts.push(`L ${beforeCorner.x} ${beforeCorner.y}`);

    // Quadratic bezier through the corner point to smooth it
    parts.push(`Q ${curr.x} ${curr.y} ${afterCorner.x} ${afterCorner.y}`);
  }

  // Line to final point
  const last = waypoints[waypoints.length - 1];

  parts.push(`L ${last.x} ${last.y}`);

  return parts.join(" ");
};
