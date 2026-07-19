import { memo } from "react";

import { CELL_SIZE } from "@/globals";

interface GridBackgroundProps {
  view: { x: number; y: number; k: number };
  size: { w: number; h: number };
}

function GridBackground({ view, size }: GridBackgroundProps) {
  const step = CELL_SIZE * view.k;
  const offX = view.x % step;
  const offY = view.y % step;

  return (
    <svg
      width={size.w}
      height={size.h}
      className="absolute inset-0 pointer-events-none"
    >
      <defs>
        <pattern
          id="grid-sm"
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
          x={offX}
          y={offY}
        >
          <circle cx={0} cy={0} r={1} fill="var(--color-grid)" />
        </pattern>
        <pattern
          id="grid-lg"
          width={step * 5}
          height={step * 5}
          patternUnits="userSpaceOnUse"
          x={offX}
          y={offY}
        >
          <path
            d={`M ${step * 5} 0 L 0 0 0 ${step * 5}`}
            stroke="var(--color-grid)"
            strokeWidth={0.6}
            fill="none"
            opacity={0.6}
          />
        </pattern>
      </defs>
      <rect width={size.w} height={size.h} fill="url(#grid-sm)" />
      <rect width={size.w} height={size.h} fill="url(#grid-lg)" />
    </svg>
  );
}

export default memo(GridBackground);
