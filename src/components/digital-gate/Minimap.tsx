import { memo } from "react";

import type { CircuitSnapshot } from "@/engine";
import { GATES } from "@/lib/circuit";

interface MinimapProps {
  snapshot: CircuitSnapshot;
  view: { x: number; y: number; k: number };
  size: { w: number; h: number };
}

function Minimap({ snapshot, view, size }: MinimapProps) {
  const W = 180;
  const H = 120;
  const P = 40;
  const comps = Object.values(snapshot.components);

  if (!comps.length) return null;

  let minX = 0;
  let minY = 0;
  let maxX = 400;
  let maxY = 300;

  for (const c of comps) {
    const d = GATES[c.type];

    if (!d) continue;

    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x + d.width);
    maxY = Math.max(maxY, c.y + d.height);
  }

  minX -= P;
  minY -= P;
  maxX += P;
  maxY += P;

  const sx = W / (maxX - minX);
  const sy = H / (maxY - minY);
  const s = Math.min(sx, sy);

  const vx = (-view.x / view.k - minX) * s;
  const vy = (-view.y / view.k - minY) * s;
  const vw = (size.w / view.k) * s;
  const vh = (size.h / view.k) * s;

  return (
    <div className="absolute bottom-3 right-3 glass-panel rounded-md p-1 shadow-lg pointer-events-none">
      <svg width={W} height={H}>
        {comps.map((c) => {
          const d = GATES[c.type];

          if (!d) return null;

          return (
            <rect
              key={c.id}
              x={(c.x - minX) * s}
              y={(c.y - minY) * s}
              width={d.width * s}
              height={d.height * s}
              fill="var(--color-primary)"
              opacity={0.6}
            />
          );
        })}
        <rect
          x={vx}
          y={vy}
          width={vw}
          height={vh}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

export default memo(Minimap);
