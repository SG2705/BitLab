import { cn } from "@/lib/utils";

interface JunctionVisualProps {
  active: boolean;
  onPinDown: (e: React.MouseEvent) => void;
  onPinUp: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

JunctionVisual.defaultProps = {
  onContextMenu: () => {},
};

/**
 * Visual for a T-junction node: a filled dot with a small hit area that
 * acts as both an input and output pin at the same coordinate.
 */
export function JunctionVisual({
  active,
  onPinDown,
  onPinUp,
  onContextMenu,
}: JunctionVisualProps) {
  return (
    <g onContextMenu={onContextMenu} style={{ cursor: "crosshair" }}>
      {/* generous transparent hit target */}
      <circle
        cx={0}
        cy={0}
        r={10}
        fill="transparent"
        // fill="var(--color-wire)"
        // stroke="var(--color-wire)"
        onMouseDown={onPinDown}
        onMouseUp={onPinUp}
      />
      {/* outer halo when active */}
      {active && (
        <circle
          cx={0}
          cy={0}
          r={7}
          fill="var(--color-signal-on)"
          opacity={0.25}
        />
      )}
      {/* solid dot */}
      <circle
        cx={0}
        cy={0}
        r={4.5}
        fill={active ? "var(--color-signal-on)" : "var(--color-wire)"}
        stroke={active ? "var(--color-signal-on)" : "var(--color-border)"}
        strokeWidth={1}
        className={cn(active && "signal-glow")}
        pointerEvents="none"
      />
    </g>
  );
}

export default JunctionVisual;
