import { memo } from "react";

import { type ComponentInstance, library } from "@/engine";
import {
  GATE_TYPE_BUTTON,
  GATE_TYPE_CONST,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_LED,
  GATE_TYPE_TOGGLE,
  PIN_KIND,
} from "@/lib/constants";
import { type PinKind } from "@/lib/types";
import { cn } from "@/lib/utils";

// [a, b, c, d, e, f, g] segment patterns for hex digits 0-F
const SEG7: boolean[][] = [
  [1, 1, 1, 1, 1, 1, 0], // 0
  [0, 1, 1, 0, 0, 0, 0], // 1
  [1, 1, 0, 1, 1, 0, 1], // 2
  [1, 1, 1, 1, 0, 0, 1], // 3
  [0, 1, 1, 0, 0, 1, 1], // 4
  [1, 0, 1, 1, 0, 1, 1], // 5
  [1, 0, 1, 1, 1, 1, 1], // 6
  [1, 1, 1, 0, 0, 0, 0], // 7
  [1, 1, 1, 1, 1, 1, 1], // 8
  [1, 1, 1, 1, 0, 1, 1], // 9
  [1, 1, 1, 0, 1, 1, 1], // A
  [0, 0, 1, 1, 1, 1, 1], // b
  [1, 0, 0, 1, 1, 1, 0], // C
  [0, 1, 1, 1, 1, 0, 1], // d
  [1, 0, 0, 1, 1, 1, 1], // E
  [1, 0, 0, 0, 1, 1, 1], // F
].map((p) => p.map(Boolean));

// Segment rects: [x, y, w, h] within a 37×64 display box (75% width)
const SEG_RECTS = [
  [2, 0, 33, 5], // a top
  [32, 7, 5, 23], // b top-right
  [32, 34, 5, 23], // c bottom-right
  [2, 59, 33, 5], // d bottom
  [0, 34, 5, 23], // e bottom-left
  [0, 7, 5, 23], // f top-left
  [2, 29, 33, 5], // g middle
];

function SevenSegDisplay({ value }: { value: number }) {
  // eslint-disable-next-line no-bitwise
  const pattern = SEG7[value & 0xf] ?? SEG7[0];

  return (
    <g transform="translate(16, 8)">
      {SEG_RECTS.map(([x, y, w, h], i) => (
        <rect
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={1.5}
          fill={pattern[i] ? "var(--color-signal-on)" : "rgba(255,100,0,0.07)"}
          pointerEvents="none"
        />
      ))}
    </g>
  );
}

interface GateNodeProps {
  comp: ComponentInstance;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClickBody: () => void;
  onPinDown: (e: React.MouseEvent, pin: number, kind: PinKind) => void;
  onPinUp: (e: React.MouseEvent, pin: number, kind: PinKind) => void;
}

function GateNode({
  comp,
  isSelected,
  onMouseDown,
  onClickBody,
  onPinDown,
  onPinUp,
}: GateNodeProps) {
  const def = library.get(comp.type);

  const active = comp.outputs.some(Boolean) || Boolean(comp.state?.on);
  const isIO = [
    GATE_TYPE_TOGGLE,
    GATE_TYPE_BUTTON,
    GATE_TYPE_CONST,
    GATE_TYPE_LED,
  ].includes(comp.type);

  if (!def) return null;

  return (
    <g transform={`translate(${comp.x}, ${comp.y})`} onMouseDown={onMouseDown}>
      {isSelected && (
        <rect
          x={-4}
          y={-4}
          width={def.width + 8}
          height={def.height + 8}
          rx={8}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      <rect
        x={0}
        y={0}
        width={def.width}
        height={def.height}
        rx={6}
        fill="var(--color-card)"
        stroke={active ? "var(--color-signal-on)" : "var(--color-border)"}
        strokeWidth={1.5}
        onClick={onClickBody}
        style={{ cursor: isIO ? "pointer" : "grab" }}
        className={cn(active && "signal-glow")}
      />
      {comp.type !== GATE_TYPE_DISPLAY7 && (
        <text
          x={def.width / 2}
          y={def.height / 2 + 5}
          textAnchor="middle"
          fill={active ? "var(--color-signal-on)" : "var(--color-foreground)"}
          fontSize={14}
          fontWeight={600}
          fontFamily="var(--font-mono)"
          pointerEvents="none"
        >
          {def.symbol ?? def.label}
        </text>
      )}
      <text
        x={def.width / 2}
        y={def.height + 14}
        textAnchor="middle"
        fill="var(--color-muted-foreground)"
        fontSize={9}
        pointerEvents="none"
      >
        {comp.label ?? def.label}
      </text>
      {comp.type === GATE_TYPE_LED && (
        <circle
          cx={def.width / 2}
          cy={def.height / 2 - 4}
          r={8}
          fill={
            comp.state?.on
              ? "var(--color-signal-on)"
              : "var(--color-signal-off)"
          }
          className={cn(Boolean(comp.state?.on) && "signal-glow")}
        />
      )}
      {comp.type === GATE_TYPE_DISPLAY7 && (
        <SevenSegDisplay value={(comp.state?.value as number) ?? 0} />
      )}
      {Array.from({ length: def.inputs }).map((_, i) => {
        const y = (def.height / (def.inputs + 1)) * (i + 1);
        const pinLabel = def.inputLabels?.[i];

        return (
          // eslint-disable-next-line react/no-array-index-key
          <g key={`gate-node-in-${i}`}>
            <line
              x1={-8}
              y1={y}
              x2={0}
              y2={y}
              stroke="var(--color-wire)"
              strokeWidth={1.5}
            />
            <circle
              cx={-8}
              cy={y}
              r={5}
              fill="var(--color-background)"
              stroke="var(--color-wire)"
              strokeWidth={1.5}
              onMouseDown={(e) => onPinDown(e, i, PIN_KIND.IN)}
              onMouseUp={(e) => onPinUp(e, i, PIN_KIND.IN)}
              style={{ cursor: "crosshair" }}
              className="hover:stroke-primary"
            />
            {pinLabel && (
              <text
                x={4}
                y={y}
                textAnchor="start"
                dominantBaseline="middle"
                fill="var(--color-muted-foreground)"
                fontSize={7}
                fontFamily="var(--font-mono)"
                pointerEvents="none"
              >
                {pinLabel}
              </text>
            )}
          </g>
        );
      })}
      {Array.from({ length: def.outputs }).map((_, i) => {
        const y = (def.height / (def.outputs + 1)) * (i + 1);
        const on = Boolean(comp.outputs[i]);
        const pinLabel = def.outputLabels?.[i];

        return (
          // eslint-disable-next-line react/no-array-index-key
          <g key={`gate-node-out-${i}`}>
            <line
              x1={def.width}
              y1={y}
              x2={def.width + 8}
              y2={y}
              stroke={on ? "var(--color-signal-on)" : "var(--color-wire)"}
              strokeWidth={1.5}
            />
            <circle
              cx={def.width + 8}
              cy={y}
              r={5}
              fill={on ? "var(--color-signal-on)" : "var(--color-background)"}
              stroke={on ? "var(--color-signal-on)" : "var(--color-wire)"}
              strokeWidth={1.5}
              onMouseDown={(e) => onPinDown(e, i, PIN_KIND.OUT)}
              onMouseUp={(e) => onPinUp(e, i, PIN_KIND.OUT)}
              style={{ cursor: "crosshair" }}
              className={cn("hover:stroke-primary", on && "signal-glow")}
            />
            {pinLabel && (
              <text
                x={def.width - 4}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--color-muted-foreground)"
                fontSize={7}
                fontFamily="var(--font-mono)"
                pointerEvents="none"
              >
                {pinLabel}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export default memo(GateNode);
