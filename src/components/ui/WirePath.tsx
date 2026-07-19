import { memo } from "react";

import type { SignalValue } from "@/engine";
import { LogicValue } from "@/engine";
import { PIN_DIR, WIRE_TYPE } from "@/lib/constants";
import { type PinDir, type WireType } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

/** Map a LogicValue to its CSS color variable */
function signalColor(signal: SignalValue): string {
  switch (signal) {
    case LogicValue.ONE:
      return "var(--color-signal-on)";
    case LogicValue.UNKNOWN:
      return "var(--color-signal-unknown)";
    case LogicValue.HIGH_IMPEDANCE:
      return "var(--color-signal-highz)";
    case LogicValue.ZERO:
      return "var(--color-wire)";
    default:
      return "var(--color-wire)";
  }
}

interface WirePathProps {
  p1: Point;
  p2: Point;
  isSignalUp: boolean;
  /** Four-state signal value for wire coloring */
  signal?: SignalValue;
  isRunning: boolean;
  wireType: WireType;
  /** Direction the source pin faces (default: RIGHT) */
  dir1?: PinDir;
  /** Direction the target pin faces (default: LEFT) */
  dir2?: PinDir;
  isSelected?: boolean;
  isPreview?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

function bezierPath(p1: Point, p2: Point, dir1: PinDir, dir2: PinDir): string {
  const dist = Math.max(
    40,
    Math.abs(p2.x - p1.x) / 2,
    Math.abs(p2.y - p1.y) / 2,
  );

  const c1 = controlPoint(p1, dir1, dist);
  const c2 = controlPoint(p2, dir2, dist);

  return `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
}

function orthoPath(p1: Point, p2: Point, dir1: PinDir, dir2: PinDir): string {
  const perpendicular = arePerpendicular(dir1, dir2);

  if (perpendicular) {
    // L-shaped: one segment from p1 in dir1, then turn to p2
    const corner = lCorner(p1, p2, dir1);

    return `M ${p1.x} ${p1.y} L ${corner.x} ${corner.y} L ${p2.x} ${p2.y}`;
  }

  // Parallel directions: Z-shaped (3 segments)
  const isHorizontal = dir1 === PIN_DIR.LEFT || dir1 === PIN_DIR.RIGHT;

  if (isHorizontal) {
    const mx = (p1.x + p2.x) / 2;

    return `M ${p1.x} ${p1.y} L ${mx} ${p1.y} L ${mx} ${p2.y} L ${p2.x} ${p2.y}`;
  }

  const my = (p1.y + p2.y) / 2;

  return `M ${p1.x} ${p1.y} L ${p1.x} ${my} L ${p2.x} ${my} L ${p2.x} ${p2.y}`;
}

function controlPoint(p: Point, dir: PinDir, dist: number): Point {
  switch (dir) {
    case PIN_DIR.RIGHT:
      return { x: p.x + dist, y: p.y };
    case PIN_DIR.LEFT:
      return { x: p.x - dist, y: p.y };
    case PIN_DIR.DOWN:
      return { x: p.x, y: p.y + dist };
    case PIN_DIR.UP:
      return { x: p.x, y: p.y - dist };
    default:
      return { x: p.x + dist, y: p.y };
  }
}

function arePerpendicular(d1: PinDir, d2: PinDir): boolean {
  const h = (d: PinDir) => d === PIN_DIR.LEFT || d === PIN_DIR.RIGHT;

  return h(d1) !== h(d2);
}

function lCorner(p1: Point, p2: Point, dir1: PinDir): Point {
  const isH1 = dir1 === PIN_DIR.LEFT || dir1 === PIN_DIR.RIGHT;

  if (isH1) {
    return { x: p2.x, y: p1.y };
  }

  return { x: p1.x, y: p2.y };
}

WirePath.defaultProps = {
  isSelected: false,
  isPreview: false,
  onClick: () => {},
  signal: LogicValue.ZERO,
  dir1: PIN_DIR.RIGHT,
  dir2: PIN_DIR.LEFT,
};

function WirePath({
  p1,
  p2,
  isSignalUp,
  signal,
  isRunning,
  wireType,
  dir1 = PIN_DIR.RIGHT,
  dir2 = PIN_DIR.LEFT,
  isSelected,
  isPreview,
  onClick,
}: WirePathProps) {
  const d =
    wireType === WIRE_TYPE.ORTHO
      ? orthoPath(p1, p2, dir1, dir2)
      : bezierPath(p1, p2, dir1, dir2);
  // Use four-state signal if provided, otherwise fall back to boolean isSignalUp
  const effectiveSignal =
    signal ?? (isSignalUp ? LogicValue.ONE : LogicValue.ZERO);
  const color = signalColor(effectiveSignal);
  const isActive = effectiveSignal === LogicValue.ONE;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <path d={d} stroke="transparent" strokeWidth={12} fill="none" />
      <path
        d={d}
        stroke={color}
        strokeWidth={isSelected ? 3 : 2}
        fill="none"
        strokeDasharray={isPreview ? "5 5" : undefined}
        className={cn(
          isActive && isRunning && "wire-flow",
          effectiveSignal === LogicValue.ONE && "signal-glow",
          effectiveSignal === LogicValue.UNKNOWN && "signal-glow-unknown",
          effectiveSignal === LogicValue.HIGH_IMPEDANCE && "signal-glow-highz",
        )}
        style={{ opacity: isPreview ? 0.7 : 1 }}
      />
    </g>
  );
}

export default memo(WirePath);
