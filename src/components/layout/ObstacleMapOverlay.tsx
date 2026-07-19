import { memo, useMemo } from "react";

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
      </g>
    </svg>
  );
}

export default memo(ObstacleMapOverlay);
