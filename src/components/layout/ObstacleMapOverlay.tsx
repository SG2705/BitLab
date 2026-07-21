import { memo, useMemo } from "react";
import { FormattedMessage } from "react-intl";

import { CellState, type ObstacleMap } from "@/wirerouter";

interface ObstacleMapOverlayProps {
  obstacleMap: ObstacleMap;
  view: { x: number; y: number; k: number };
  size: { w: number; h: number };
  /** Incremented when the obstacle map is rebuilt, to break memoization */
  version: number;
}

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
  version,
}: ObstacleMapOverlayProps) {
  const { grid, cols, rows } = obstacleMap.getRawGrid();
  const bounds = obstacleMap.getBounds();
  const { cellSize } = obstacleMap.getConfig();

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

  return (
    <svg
      width={size.w}
      height={size.h}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 15 }}
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
        {/* Obstacle bounding boxes with corner coordinates */}
        {obstacleRects.map((obs) => (
          <g key={obs.compId}>
            {/* Bounding box outline */}
            <rect
              x={obs.x}
              y={obs.y}
              width={obs.width}
              height={obs.height}
              fill="none"
              stroke="rgba(168, 85, 247, 0.7)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
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
        ))}
      </g>
    </svg>
  );
}

export default memo(ObstacleMapOverlay);
