import { cn } from "@/lib/utils";
import { WireType } from "@/types";
import { memo } from "react";

interface Point {
  x: number;
  y: number;
}

interface WirePathProps {
  p1: Point;
  p2: Point;
  live: boolean;
  running: boolean;
  style: WireType;
  selected?: boolean;
  preview?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function bezierPath(p1: Point, p2: Point): string {
  const dx = Math.max(40, Math.abs(p2.x - p1.x) / 2);
  return `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`;
}

function orthoPath(p1: Point, p2: Point): string {
  const mx = (p1.x + p2.x) / 2;
  return `M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`;
}

function WirePath({
  p1,
  p2,
  live,
  running,
  style,
  selected,
  preview,
  onClick,
}: WirePathProps) {
  const d = style === "ortho" ? orthoPath(p1, p2) : bezierPath(p1, p2);
  const color = live ? "var(--color-signal-on)" : "var(--color-wire)";

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
      <path
        d={d}
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        fill="none"
        strokeDasharray={preview ? "5 5" : undefined}
        className={cn(live && running && "wire-flow", live && "signal-glow")}
        style={{ opacity: preview ? 0.7 : 1 }}
      />
    </g>
  );
}

export default memo(WirePath);
