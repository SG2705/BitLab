import { memo } from "react";
import { FormattedMessage } from "react-intl";

import { WIRE_TYPE } from "@/lib/constants";
import { type WireType } from "@/lib/types";
import { signalsToBinary, signalsToHex } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface BusWirePathProps {
  p1: Point;
  p2: Point;
  width: number;
  signals: boolean[];
  style: WireType;
  isSelected: boolean;
  isPreview?: boolean;
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

/** Compute midpoint of a bezier or ortho path */
function midpoint(p1: Point, p2: Point): Point {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

BusWirePath.defaultProps = {
  isPreview: undefined,
  onClick: undefined,
};

function BusWirePath({
  p1,
  p2,
  width: busWidth,
  signals,
  style,
  isSelected,
  isPreview,
  onClick,
}: BusWirePathProps) {
  const d = style === WIRE_TYPE.ORTHO ? orthoPath(p1, p2) : bezierPath(p1, p2);
  const strokeWidth = busWidth * 2 + 4;
  const mid = midpoint(p1, p2);

  const hexValue = signalsToHex(signals);
  const binaryStr = signalsToBinary(signals);

  // Badge dimensions
  const badgeWidth = Math.max(120, busWidth * 12 + 60);
  const badgeHeight = 40;
  const badgeX = mid.x - badgeWidth / 2;
  const badgeY = mid.y - badgeHeight - 4;

  // Per-bit state box dimensions
  const boxSize = 8;
  const boxGap = 2;

  // Border box
  const totalSpan = (busWidth - 1) * 2;
  const borderOffset = totalSpan / 2 + 3;
  const border = totalSpan / 2 + 2;
  const rP1 = { x: p1.x - 1, y: p1.y };
  const rP2 = { x: p2.x + 1, y: p2.y };
  const db =
    style === WIRE_TYPE.ORTHO ? orthoPath(rP1, rP2) : bezierPath(rP1, rP2);

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      {/* Hit area for click detection */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth={strokeWidth + 8}
        fill="none"
      />

      {/* Top Border */}
      <path
        d={db}
        stroke={isSelected ? "var(--color-primary)" : "var(--color-border)"}
        strokeWidth={2}
        fill="none"
        strokeDasharray={isPreview ? "8 6" : undefined}
        style={{
          opacity: isPreview ? 0.5 : 1,
          transform: `translateY(${-borderOffset}px)`,
        }}
      />

      {/* Bottom Border */}
      <path
        d={db}
        stroke={isSelected ? "var(--color-primary)" : "var(--color-border)"}
        strokeWidth={2}
        fill="none"
        strokeDasharray={isPreview ? "8 6" : undefined}
        style={{
          opacity: isPreview ? 0.5 : 1,
          transform: `translateY(${borderOffset}px)`,
        }}
      />

      {/* Left Border */}
      <line
        x1={p1.x - 2}
        y1={p1.y - border - 2}
        x2={p1.x - 2}
        y2={p1.y + border + 2}
        stroke={isSelected ? "var(--color-primary)" : "var(--color-border)"}
        strokeWidth={2}
        fill="none"
        strokeDasharray={isPreview ? "8 6" : undefined}
      />

      {/* Right Border */}
      <line
        x1={p2.x + 2}
        y1={p2.y - border - 2}
        x2={p2.x + 2}
        y2={p2.y + border + 2}
        stroke={isSelected ? "var(--color-primary)" : "var(--color-border)"}
        strokeWidth={2}
        fill="none"
        strokeDasharray={isPreview ? "8 6" : undefined}
      />

      {/* Inner Bus Lines */}
      {Array.from({ length: busWidth }, (_, i) => {
        const offset = -totalSpan / 2 + i * 2;

        return (
          <path
            key={i}
            d={d}
            stroke="var(--color-wire)"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray={isPreview ? "8 6" : undefined}
            style={{
              opacity: isPreview ? 0.5 : 0.6,
              transform: `translateY(${offset}px)`,
            }}
          />
        );
      })}

      {/* N parallel thin lines inside */}
      {Array.from({ length: busWidth }, (_, i) => {
        const offset = -totalSpan / 2 + i * 2;

        return (
          <path
            key={i}
            d={d}
            stroke="var(--color-wire)"
            strokeWidth={1.5}
            fill="none"
            strokeDasharray={isPreview ? "8 6" : undefined}
            style={{
              opacity: isPreview ? 0.5 : 0.6,
              transform: `translateY(${offset}px)`,
            }}
          />
        );
      })}

      {/* Info Badge at midpoint */}
      {!isPreview && (
        <g transform={`translate(${badgeX}, ${badgeY})`}>
          {/* Glass panel background */}
          <rect
            width={badgeWidth}
            height={badgeHeight}
            rx={6}
            ry={6}
            fill="var(--color-surface, rgba(30, 30, 30, 0.85))"
            stroke="var(--color-border)"
            strokeWidth={1}
            style={{ opacity: 0.92 }}
          />

          {/* /N width label (left) */}
          <text
            x={8}
            y={16}
            fontSize={11}
            fontFamily="monospace"
            fill="var(--color-text, #ccc)"
          >
            <FormattedMessage
              id="Gb5Mf2"
              defaultMessage="/{busWidth}"
              values={{ busWidth }}
            />
          </text>

          {/* 0x hex value (center) */}
          <text
            x={22}
            y={32}
            fontSize={11}
            fontFamily="monospace"
            fill="var(--color-text, #ccc)"
            textAnchor="middle"
          >
            {hexValue}
          </text>

          {/* Per-bit state boxes (right) */}
          {signals.map((sig, i) => {
            const bitsStartX =
              badgeWidth - 8 - signals.length * (boxSize + boxGap);

            return (
              <rect
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                x={bitsStartX + i * (boxSize + boxGap)}
                y={8}
                width={boxSize}
                height={boxSize}
                rx={1}
                fill={sig ? "#4ade80" : "#6b7280"}
              />
            );
          })}

          {/* Binary string below */}
          <text
            x={badgeWidth / 2}
            y={32}
            fontSize={9}
            fontFamily="monospace"
            fill="var(--color-text, #999)"
            textAnchor="middle"
          >
            {binaryStr}
          </text>
        </g>
      )}
    </g>
  );
}

export default memo(BusWirePath);
