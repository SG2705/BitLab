import { cn } from "@/lib/utils";
import { GATES } from "@/lib/circuit";
import type { ComponentInstance } from "@/engine";

interface GateNodeProps {
  comp: ComponentInstance;
  selected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClickBody: () => void;
  onPinDown: (pin: number, kind: string, e: React.MouseEvent) => void;
  onPinUp: (pin: number, kind: string, e: React.MouseEvent) => void;
}

export function GateNode({
  comp,
  selected,
  onMouseDown,
  onClickBody,
  onPinDown,
  onPinUp,
}: GateNodeProps) {
  const def = GATES[comp.type];
  if (!def) return null;
  const active = comp.outputs.some(Boolean) || !!comp.state?.on;
  const isIO = ["TOGGLE", "BUTTON", "CONST", "LED", "LAMP"].includes(comp.type);

  return (
    <g transform={`translate(${comp.x}, ${comp.y})`} onMouseDown={onMouseDown}>
      {selected && (
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
      {(comp.type === "LED" || comp.type === "LAMP") && (
        <circle
          cx={def.width / 2}
          cy={def.height / 2 - 4}
          r={8}
          fill={
            comp.state?.on
              ? "var(--color-signal-on)"
              : "var(--color-signal-off)"
          }
          className={cn(!!comp.state?.on && "signal-glow")}
        />
      )}
      {Array.from({ length: def.inputs }).map((_, i) => {
        const y = (def.height / (def.inputs + 1)) * (i + 1);
        return (
          <g key={`in-${i}`}>
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
              onMouseDown={(e) => onPinDown(i, "in", e)}
              onMouseUp={(e) => onPinUp(i, "in", e)}
              style={{ cursor: "crosshair" }}
              className="hover:stroke-primary"
            />
          </g>
        );
      })}
      {Array.from({ length: def.outputs }).map((_, i) => {
        const y = (def.height / (def.outputs + 1)) * (i + 1);
        const on = !!comp.outputs[i];
        return (
          <g key={`out-${i}`}>
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
              onMouseDown={(e) => onPinDown(i, "out", e)}
              onMouseUp={(e) => onPinUp(i, "out", e)}
              style={{ cursor: "crosshair" }}
              className={cn("hover:stroke-primary", on && "signal-glow")}
            />
          </g>
        );
      })}
    </g>
  );
}
