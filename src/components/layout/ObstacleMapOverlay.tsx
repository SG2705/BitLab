import { memo, useMemo, useState } from "react";
import { FormattedMessage } from "react-intl";

import type { CircuitSnapshot } from "@/engine";
import { GATE_TYPE_JUNCTION } from "@/engine/constants";
import { pinPos } from "@/lib/circuit";
import { PIN_KIND } from "@/lib/constants";
import { CellState, type ObstacleMap } from "@/wirerouter";

interface ObstacleMapOverlayProps {
  obstacleMap: ObstacleMap;
  view: { x: number; y: number; k: number };
  size: { w: number; h: number };
  /** Circuit snapshot for wire rendering and IDs */
  snapshot?: CircuitSnapshot;
  /** Incremented when the obstacle map is rebuilt, to break memoization */
  version: number;
}

ObstacleMapOverlay.defaultProps = {
  snapshot: undefined,
};

/**
 * ObstacleMapOverlay — Renders the obstacle grid as a translucent SVG overlay.
 *
 * Shows:
 * - Red cells = BLOCKED (component body)
 * - Yellow cells = PADDED (avoidance zone)
 * - Transparent = FREE (routable)
 */
function ObstacleMapOverlay({
  obstacleMap,
  view,
  size,
  snapshot,
  version,
}: ObstacleMapOverlayProps) {
  const { grid, cols, rows } = obstacleMap.getRawGrid();
  const bounds = obstacleMap.getBounds();
  const { cellSize } = obstacleMap.getConfig();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build cell rects — only render non-FREE cells for performance
  const cells = useMemo(() => {
    const blocked: { x: number; y: number }[] = [];
    const padded: { x: number; y: number }[] = [];

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const state: CellState = grid[r * cols + c];

        if (state === CellState.BLOCKED) {
          blocked.push({
            x: bounds.x + c * cellSize,
            y: bounds.y + r * cellSize,
          });
        } else if (state === CellState.PADDED) {
          padded.push({
            x: bounds.x + c * cellSize,
            y: bounds.y + r * cellSize,
          });
        }
      }
    }

    return { blocked, padded };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, cols, rows, bounds, cellSize, version]);

  // Obstacle bounding boxes with corner coordinates
  const obstacleRects = useMemo(() => {
    return obstacleMap.getObstacles().map((obs) => {
      const { x, y, width, height } = obs.bounds;

      return {
        compId: obs.compId,
        x,
        y,
        width,
        height,
        corners: {
          tl: { x, y },
          tr: { x: x + width, y },
          bl: { x, y: y + height },
          br: { x: x + width, y: y + height },
        },
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obstacleMap, version]);

  // Wire paths for hover
  const wireLines = useMemo(() => {
    if (!snapshot) return [];

    return Object.values(snapshot.wires)
      .map((w) => {
        const a = snapshot.components[w.from.comp];
        const b = snapshot.components[w.to.comp];

        if (!a || !b) return null;

        const p1 = pinPos(a, PIN_KIND.OUT, w.from.pin);
        const p2 = pinPos(b, PIN_KIND.IN, w.to.pin);

        return { id: w.id, p1, p2, fromComp: w.from.comp, toComp: w.to.comp };
      })
      .filter(Boolean) as Array<{
      id: string;
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      fromComp: string;
      toComp: string;
    }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, version]);

  return (
    <svg
      width={size.w}
      height={size.h}
      className="absolute inset-0"
      style={{ zIndex: 15, pointerEvents: "none" }}
    >
      <g transform={`translate(${view.x}, ${view.y}) scale(${view.k})`}>
        {/* Padded cells — yellow */}
        {cells.padded.map((cell, i) => (
          <rect
            // eslint-disable-next-line react/no-array-index-key
            key={`p-${i}`}
            x={cell.x}
            y={cell.y}
            width={cellSize}
            height={cellSize}
            fill="rgba(250, 204, 21, 0.25)"
            stroke="rgba(250, 204, 21, 0.4)"
            strokeWidth={0.3}
          />
        ))}
        {/* Blocked cells — red */}
        {cells.blocked.map((cell, i) => (
          <rect
            // eslint-disable-next-line react/no-array-index-key
            key={`b-${i}`}
            x={cell.x}
            y={cell.y}
            width={cellSize}
            height={cellSize}
            fill="rgba(239, 68, 68, 0.35)"
            stroke="rgba(239, 68, 68, 0.5)"
            strokeWidth={0.3}
          />
        ))}
        {/* Obstacle bounding boxes with hover tooltip */}
        {obstacleRects.map((obs) => {
          const comp = snapshot?.components[obs.compId];
          const isJunction = comp?.type === GATE_TYPE_JUNCTION;
          const label = isJunction
            ? `Junction: ${obs.compId.slice(0, 8)}`
            : comp
              ? `${comp.type}: ${obs.compId.slice(0, 8)}`
              : obs.compId.slice(0, 8);

          return (
            <g key={obs.compId}>
              {/* Bounding box outline */}
              <rect
                x={obs.x}
                y={obs.y}
                width={obs.width}
                height={obs.height}
                fill={
                  hoveredId === obs.compId ? "rgba(168, 85, 247, 0.15)" : "none"
                }
                stroke="rgba(168, 85, 247, 0.7)"
                strokeWidth={hoveredId === obs.compId ? 2.5 : 1.5}
                strokeDasharray="4 2"
                style={{ pointerEvents: "all", cursor: "pointer" }}
                onMouseEnter={() => setHoveredId(obs.compId)}
                onMouseLeave={() => setHoveredId(null)}
              />
              {/* Hover tooltip */}
              {hoveredId === obs.compId && (
                <g>
                  <rect
                    x={obs.x + obs.width / 2 - 60}
                    y={obs.y - 22}
                    width={120}
                    height={16}
                    rx={3}
                    fill="rgba(0,0,0,0.85)"
                  />
                  <text
                    x={obs.x + obs.width / 2}
                    y={obs.y - 11}
                    fill="#fff"
                    fontSize={9}
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {label}
                  </text>
                </g>
              )}
              {/* Corner dots */}
              <circle
                cx={obs.corners.tl.x}
                cy={obs.corners.tl.y}
                r={3}
                fill="rgba(168, 85, 247, 0.9)"
              />
              <circle
                cx={obs.corners.tr.x}
                cy={obs.corners.tr.y}
                r={3}
                fill="rgba(168, 85, 247, 0.9)"
              />
              <circle
                cx={obs.corners.bl.x}
                cy={obs.corners.bl.y}
                r={3}
                fill="rgba(168, 85, 247, 0.9)"
              />
              <circle
                cx={obs.corners.br.x}
                cy={obs.corners.br.y}
                r={3}
                fill="rgba(168, 85, 247, 0.9)"
              />
              {/* Corner coordinate labels */}
              <text
                x={obs.corners.tl.x - 2}
                y={obs.corners.tl.y - 5}
                fill="rgba(168, 85, 247, 0.95)"
                fontSize={8}
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                <FormattedMessage
                  id="pEFFMn"
                  defaultMessage="{x}, {y}"
                  values={{
                    x: Math.round(obs.corners.tl.x),
                    y: Math.round(obs.corners.tl.y),
                  }}
                />
              </text>
              <text
                x={obs.corners.tr.x + 2}
                y={obs.corners.tr.y - 5}
                fill="rgba(168, 85, 247, 0.95)"
                fontSize={8}
                fontFamily="var(--font-mono)"
                textAnchor="start"
              >
                <FormattedMessage
                  id="pEFFMn"
                  defaultMessage="{x}, {y}"
                  values={{
                    x: Math.round(obs.corners.tr.x),
                    y: Math.round(obs.corners.tr.y),
                  }}
                />
              </text>
              <text
                x={obs.corners.bl.x - 2}
                y={obs.corners.bl.y + 12}
                fill="rgba(168, 85, 247, 0.95)"
                fontSize={8}
                fontFamily="var(--font-mono)"
                textAnchor="end"
              >
                <FormattedMessage
                  id="pEFFMn"
                  defaultMessage="{x}, {y}"
                  values={{
                    x: Math.round(obs.corners.bl.x),
                    y: Math.round(obs.corners.bl.y),
                  }}
                />
              </text>
              <text
                x={obs.corners.br.x + 2}
                y={obs.corners.br.y + 12}
                fill="rgba(168, 85, 247, 0.95)"
                fontSize={8}
                fontFamily="var(--font-mono)"
                textAnchor="start"
              >
                <FormattedMessage
                  id="pEFFMn"
                  defaultMessage="{x}, {y}"
                  values={{
                    x: Math.round(obs.corners.br.x),
                    y: Math.round(obs.corners.br.y),
                  }}
                />
              </text>
            </g>
          );
        })}
        {/* Wire paths with hover tooltip */}
        {wireLines.map((wl) => (
          <g key={wl.id}>
            <line
              x1={wl.p1.x}
              y1={wl.p1.y}
              x2={wl.p2.x}
              y2={wl.p2.y}
              stroke={
                hoveredId === wl.id ? "rgba(59, 130, 246, 0.8)" : "transparent"
              }
              strokeWidth={10}
              style={{ pointerEvents: "all", cursor: "pointer" }}
              onMouseEnter={() => setHoveredId(wl.id)}
              onMouseLeave={() => setHoveredId(null)}
            />
            {hoveredId === wl.id && (
              <g>
                <rect
                  x={(wl.p1.x + wl.p2.x) / 2 - 70}
                  y={(wl.p1.y + wl.p2.y) / 2 - 22}
                  width={140}
                  height={16}
                  rx={3}
                  fill="rgba(0,0,0,0.85)"
                />
                <text
                  x={(wl.p1.x + wl.p2.x) / 2}
                  y={(wl.p1.y + wl.p2.y) / 2 - 11}
                  fill="#fff"
                  fontSize={9}
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <FormattedMessage
                    id="7APQN6"
                    defaultMessage="Wire: {count}"
                    values={{
                      count: wl.id.slice(0, 8),
                    }}
                  />
                </text>
              </g>
            )}
          </g>
        ))}
      </g>
    </svg>
  );
}

export default memo(ObstacleMapOverlay);
