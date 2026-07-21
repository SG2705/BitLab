import { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { GATE_ICON, type GateIcon } from "@/components/ui";
import type { ComponentInstance, SignalValue } from "@/engine";
import { library, LogicValue } from "@/engine";
import {
  DEFAULT_PROBE_SAMPLES,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_LED,
  GATE_TYPE_PROBE,
  GATE_TYPE_TOGGLE,
} from "@/engine/constants";
import { CELL_SIZE, PIN_OFFSET, PIN_SPACING_UNITS } from "@/globals";
import { PIN_KIND } from "@/lib/constants";
import { type PinKind } from "@/lib/types";
import { cn, getGateLabel, resolveLabel } from "@/lib/utils";

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

/** Map a signal value to the appropriate CSS color for pin/output rendering */
function pinColor(signal: SignalValue): string {
  switch (signal) {
    case LogicValue.ZERO:
      return "var(--color-wire)";
    case LogicValue.ONE:
      return "var(--color-signal-on)";
    case LogicValue.UNKNOWN:
      return "var(--color-signal-unknown)";
    case LogicValue.HIGH_IMPEDANCE:
      return "var(--color-signal-highz)";
    default:
      return "var(--color-wire)";
  }
}

/** Map a signal value to its glow CSS class (or empty string if ZERO) */
function glowClass(signal: SignalValue): string {
  switch (signal) {
    case LogicValue.ONE:
      return "signal-glow";
    case LogicValue.UNKNOWN:
      return "signal-glow-unknown";
    case LogicValue.HIGH_IMPEDANCE:
      return "signal-glow-highz";
    case LogicValue.ZERO:
      return "";
    default:
      return "";
  }
}

function compGlowClass(signal: SignalValue): string {
  switch (signal) {
    case LogicValue.ONE:
      return "comp-glow";
    case LogicValue.UNKNOWN:
      return "comp-glow-unknown";
    case LogicValue.HIGH_IMPEDANCE:
      return "comp-glow-highz";
    case LogicValue.ZERO:
      return "";
    default:
      return "";
  }
}

function SevenSegDisplay({ value }: { value: number }) {
  // eslint-disable-next-line no-bitwise
  const pattern = SEG7[value & 0xf] ?? SEG7[0];

  return (
    <g transform="translate(25, 10)">
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

interface ProbeSample {
  v: boolean;
  t: number;
}

function WaveformDisplay({
  history,
  width,
  height,
}: {
  history: ProbeSample[];
  width: number;
  height: number;
}) {
  const padX = 6;
  const topY = 8;
  const botY = height - 15;
  const displayW = width - padX * 2;
  const windowSize = DEFAULT_PROBE_SAMPLES;

  if (history.length === 0) {
    return (
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-muted-foreground)"
        fontSize={8}
        fontFamily="var(--font-mono)"
        pointerEvents="none"
      >
        <FormattedMessage id="xqZM36" defaultMessage="— no signal —" />
      </text>
    );
  }

  const endTick = history[history.length - 1].t;
  // Clamp to 0: the first few ticks fill in from the left instead of showing
  // negative tick labels. windowSize is the fixed x-axis span in ticks.
  const startTick = Math.max(0, endTick - windowSize + 1);

  // Map a tick number to an x coordinate
  const tickToX = (t: number) =>
    padX + ((t - startTick) / windowSize) * displayW;

  // Entries that are relevant: the last entry before the window (carries the
  // initial value into the visible range) plus all entries inside the window.
  const lastBefore = history.filter((e) => e.t < startTick);
  const anchor =
    lastBefore.length > 0 ? [lastBefore[lastBefore.length - 1]] : [];
  const inWindow = history.filter((e) => e.t >= startTick);
  const relevant: ProbeSample[] = [...anchor, ...inWindow];

  const parts: string[] = [];

  for (let i = 0; i < relevant.length; i += 1) {
    const entry = relevant[i];
    const nextT = i + 1 < relevant.length ? relevant[i + 1].t : endTick + 1;
    const x1 = Math.max(tickToX(entry.t), padX);
    const x2 = Math.min(tickToX(nextT), padX + displayW);
    const y = entry.v ? topY : botY;

    if (i === 0) {
      parts.push(`M ${x1} ${y}`);
    } else {
      const prevY = relevant[i - 1].v ? topY : botY;

      if (prevY !== y) {
        parts.push(`L ${x1} ${prevY} L ${x1} ${y}`);
      }
    }

    parts.push(`L ${x2} ${y}`);
  }

  // Tick marks stop at endTick (the current tick), not endTick+1, so the
  // rightmost label always matches the simulation tick counter.
  const tickNums = Array.from(
    { length: endTick - startTick + 1 },
    (_, i) => startTick + i,
  );
  const labelNums = tickNums.filter((_, i) => i % 2 === 0);

  return (
    <>
      <line
        x1={padX}
        y1={(topY + botY) / 2}
        x2={padX + displayW}
        y2={(topY + botY) / 2}
        stroke="var(--color-border)"
        strokeWidth={0.5}
        strokeDasharray="2 2"
        pointerEvents="none"
      />
      <path
        d={parts.join(" ")}
        fill="none"
        stroke="var(--color-signal-on)"
        strokeWidth={1.5}
        strokeLinejoin="miter"
        pointerEvents="none"
      />
      <line
        x1={padX}
        y1={botY}
        x2={padX + displayW}
        y2={botY}
        stroke="var(--color-border)"
        strokeWidth={0.5}
        pointerEvents="none"
      />
      {tickNums.map((t) => (
        <line
          key={t}
          x1={tickToX(t)}
          y1={botY}
          x2={tickToX(t)}
          y2={botY + 3}
          stroke="var(--color-border)"
          strokeWidth={0.5}
          pointerEvents="none"
        />
      ))}
      {labelNums.map((t) => (
        <text
          key={t}
          x={tickToX(t)}
          y={botY + 11}
          textAnchor="middle"
          fill="var(--color-muted-foreground)"
          fontSize={6}
          fontFamily="var(--font-mono)"
          pointerEvents="none"
        >
          {t}
        </text>
      ))}
    </>
  );
}

interface GateNodeProps {
  comp: ComponentInstance;
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClickBody: () => void;
  onPointerDownBody?: (e: React.PointerEvent) => void;
  onPointerUpBody?: (e: React.PointerEvent) => void;
  onPinDown: (e: React.MouseEvent, pin: number, kind: PinKind) => void;
  onPinUp: (e: React.MouseEvent, pin: number, kind: PinKind) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

GateNode.defaultProps = {
  onPointerDownBody: undefined,
  onPointerUpBody: undefined,
  onContextMenu: undefined,
};

function GateNode({
  comp,
  isSelected,
  onMouseDown,
  onClickBody,
  onPointerDownBody,
  onPointerUpBody,
  onPinDown,
  onPinUp,
  onContextMenu,
}: GateNodeProps) {
  const intl = useIntl();

  if (!library.has(comp.type)) return null;

  const def = library.get(comp.type);
  const resolvedLabel = getGateLabel(def.type, def.label, intl);

  const dominantOutput =
    comp.outputs.find((v) => v !== LogicValue.ZERO) ?? LogicValue.ZERO;
  const isActive =
    dominantOutput !== LogicValue.ZERO || Boolean(comp.state?.on);
  const bodyGlow =
    dominantOutput !== LogicValue.ZERO
      ? compGlowClass(dominantOutput)
      : comp.state?.on
        ? "comp-glow"
        : "";
  const isIO = [
    GATE_TYPE_TOGGLE,
    GATE_TYPE_BUTTON,
    GATE_TYPE_CONST,
    GATE_TYPE_LED,
    GATE_TYPE_DIGIT_BIN,
  ].includes(comp.type);

  // For input/output/clock components a custom label becomes the pin name in
  // custom circuits — show it prominently inside the gate body when set.
  const isCustomLabel =
    (def.isInput || def.isClock || def.isOutput) && Boolean(comp.label);

  const isNormalIcon =
    comp.type !== GATE_TYPE_DISPLAY7 &&
    comp.type !== GATE_TYPE_PROBE &&
    comp.type !== GATE_TYPE_DIGIT_BIN;
  const IconComponent = GATE_ICON[comp.type as GateIcon];

  if (def.isAnnotation) {
    return (
      <g
        transform={`translate(${comp.x}, ${comp.y})`}
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
      >
        {isSelected && (
          <rect
            x={-4}
            y={-4}
            width={def.width + 8}
            height={def.height + 8}
            rx={6}
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
          rx={4}
          fill="var(--color-card)"
          fillOpacity={0.5}
          stroke="var(--color-muted-foreground)"
          strokeWidth={1}
          strokeDasharray="5 3"
          onClick={onClickBody}
          style={{ cursor: "grab" }}
        />
        <text
          x={def.width / 2}
          y={def.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--color-muted-foreground)"
          fontSize={10}
          fontFamily="var(--font-mono)"
          fontStyle="italic"
          pointerEvents="none"
        >
          {resolveLabel(comp.label, intl) ||
            intl.formatMessage({ id: "qBo9Vt", defaultMessage: "// comment" })}
        </text>
      </g>
    );
  }

  return (
    <g
      transform={`translate(${comp.x}, ${comp.y})`}
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
    >
      {(() => {
        const r =
          comp.type === GATE_TYPE_PROBE || comp.type === GATE_TYPE_DISPLAY7
            ? 0
            : (comp.rotation ?? 0);
        const rw = r === 90 || r === 270 ? def.height : def.width;
        const rh = r === 90 || r === 270 ? def.width : def.height;
        const isVertical = r === 0 || r === 180;

        return (
          <>
            {isSelected && (
              <rect
                x={-4}
                y={-4}
                width={rw + 8}
                height={rh + 8}
                rx={8}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            )}
            {/* Body */}
            <rect
              x={0}
              y={0}
              width={rw}
              height={rh}
              rx={6}
              fill="var(--color-card)"
              stroke={
                isActive
                  ? pinColor(
                      dominantOutput !== LogicValue.ZERO
                        ? dominantOutput
                        : LogicValue.ONE,
                    )
                  : "var(--color-border)"
              }
              strokeWidth={1.5}
              onClick={onClickBody}
              onPointerDown={onPointerDownBody}
              onPointerUp={onPointerUpBody}
              onPointerLeave={onPointerUpBody}
              onPointerCancel={onPointerUpBody}
              style={{ cursor: isIO ? "pointer" : "grab" }}
              className={cn(bodyGlow)}
            />
            {/* Pinned indicator */}
            {comp.pinned && (
              <g
                transform={`translate(${rw - 18}, 2) rotate(20, 3.5, 4.5) scale(2)`}
                pointerEvents="none"
              >
                <path
                  d="M3.5 0.5L3.5 2.5L1 4.5L1 5.5L3 5.5L3 8.5L4 8.5L4 5.5L6 5.5L6 4.5L3.5 2.5L3.5 0.5Z"
                  fill="var(--color-accent)"
                  stroke="none"
                />
              </g>
            )}
            {/* Symbol/Icon — always horizontal text */}
            {isNormalIcon && IconComponent && (
              <IconComponent
                x={rw / 2 - 20}
                y={rh / 2 - 20}
                width={40}
                height={40}
                stroke={
                  isActive
                    ? pinColor(
                        dominantOutput !== LogicValue.ZERO
                          ? dominantOutput
                          : LogicValue.ONE,
                      )
                    : "var(--color-foreground)"
                }
                pointerEvents="none"
                className={cn(bodyGlow)}
              />
            )}
            {isNormalIcon && !IconComponent && (
              <text
                x={rw / 2}
                y={rh / 2 + (isCustomLabel ? 4 : 5)}
                textAnchor="middle"
                fill={
                  isActive
                    ? pinColor(
                        dominantOutput !== LogicValue.ZERO
                          ? dominantOutput
                          : LogicValue.ONE,
                      )
                    : "var(--color-foreground)"
                }
                fontSize={isCustomLabel ? 10 : 14}
                fontWeight={600}
                fontFamily="var(--font-mono)"
                pointerEvents="none"
                className={cn(bodyGlow)}
              >
                {def.symbol ?? resolvedLabel}
              </text>
            )}
            {/* Component name label — always below, horizontal */}
            <text
              x={isVertical ? rw / 2 : rw + 6}
              y={isVertical ? rh + 15 : rh / 2}
              textAnchor={isVertical ? "middle" : "start"}
              fill="var(--color-muted-foreground)"
              fontSize={9}
              rx={0}
              ry={0}
              pointerEvents="none"
              stroke="var(--background)"
              strokeWidth={8}
              paintOrder="stroke"
            >
              {isCustomLabel
                ? resolveLabel(comp.label, intl)
                : resolveLabel(comp.label, intl) || resolvedLabel}
            </text>
            {/* Special renderers */}
            {comp.type === GATE_TYPE_LED && (
              <circle
                cx={rw / 2}
                cy={rh / 2 - 4}
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
            {comp.type === GATE_TYPE_PROBE && (
              <WaveformDisplay
                history={(comp.state?.history as ProbeSample[]) ?? []}
                width={rw}
                height={rh}
              />
            )}
            {comp.type === GATE_TYPE_DIGIT_BIN && (
              <text
                x={rw / 2}
                y={rh / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={
                  isActive
                    ? "var(--color-signal-on)"
                    : "var(--color-foreground)"
                }
                fontSize={32}
                fontWeight={700}
                fontFamily="var(--font-mono)"
                pointerEvents="none"
              >
                {(comp.state?.digit as number) ?? 0}
              </text>
            )}
            {/* Input pins */}
            {def.isBusInput
              ? (() => {
                  const bx =
                    r === 0
                      ? -9
                      : r === 90
                        ? rw / 2
                        : r === 180
                          ? rw + 9
                          : rw / 2;
                  const by =
                    r === 0
                      ? rh / 2
                      : r === 90
                        ? -9
                        : r === 180
                          ? rh / 2
                          : rh + 9;

                  return (
                    <g key="gate-node-bus-in">
                      <rect
                        x={bx - 6}
                        y={by - 6}
                        width={12}
                        height={12}
                        rx={2}
                        ry={2}
                        fill={(() => {
                          const dominantIn =
                            comp.inputs.find((v) => v !== LogicValue.ZERO) ??
                            LogicValue.ZERO;

                          return dominantIn === LogicValue.ONE
                            ? "var(--color-signal-on)"
                            : dominantIn === LogicValue.UNKNOWN
                              ? "var(--color-signal-unknown)"
                              : dominantIn === LogicValue.HIGH_IMPEDANCE
                                ? "var(--color-signal-highz)"
                                : "var(--color-background)";
                        })()}
                        stroke={pinColor(
                          comp.inputs.find((v) => v !== LogicValue.ZERO) ??
                            LogicValue.ZERO,
                        )}
                        strokeWidth={1.5}
                        onMouseUp={(e) => onPinUp(e, -1, PIN_KIND.IN)}
                        style={{ cursor: "crosshair" }}
                        className={cn(
                          "hover:stroke-primary",
                          glowClass(
                            comp.inputs.find((v) => v !== LogicValue.ZERO) ??
                              LogicValue.ZERO,
                          ),
                        )}
                      />
                    </g>
                  );
                })()
              : (() => {
                  // Compute visual slots: each normal pin = 1 slot, each bus group = 1 slot
                  const busGroups = def.busInputGroups ?? [];

                  // Build slot list: { type: 'pin', index } or { type: 'bus', groupIdx, start, end }
                  type Slot =
                    | { kind: "pin"; index: number }
                    | {
                        kind: "bus";
                        groupIdx: number;
                        start: number;
                        end: number;
                      };

                  let pinIdx = 0;
                  const slots: Slot[] = [];
                  const groupStartMap = new Map(
                    busGroups.map((g, gi) => [g[0], { gi, g }]),
                  );

                  while (pinIdx < def.inputs) {
                    const entry = groupStartMap.get(pinIdx);

                    if (entry) {
                      const [start, end] = entry.g;

                      slots.push({
                        kind: "bus",
                        groupIdx: entry.gi,
                        start,
                        end,
                      });
                      pinIdx = end;
                    } else {
                      slots.push({ kind: "pin", index: pinIdx });
                      pinIdx += 1;
                    }
                  }

                  const slotCount = slots.length;
                  const sizeAxis = isVertical ? rh : rw;

                  // Calculate positions with bus ports getting double spacing
                  const pinSpacing = PIN_SPACING_UNITS * CELL_SIZE;
                  let totalSpan = 0;

                  for (let i = 1; i < slotCount; i += 1) {
                    const prevBus = slots[i - 1].kind === "bus";
                    const curBus = slots[i].kind === "bus";

                    totalSpan +=
                      prevBus || curBus ? pinSpacing * 2 : pinSpacing;
                  }

                  const startOffset =
                    Math.round((sizeAxis - totalSpan) / 2 / CELL_SIZE) *
                    CELL_SIZE;

                  // Build position array
                  const positions: number[] = [startOffset];

                  for (let i = 1; i < slotCount; i += 1) {
                    const prevBus = slots[i - 1].kind === "bus";
                    const curBus = slots[i].kind === "bus";
                    const gap = prevBus || curBus ? pinSpacing * 2 : pinSpacing;

                    positions.push(positions[i - 1] + gap);
                  }

                  return slots.map((slot, si) => {
                    const pos = positions[si];

                    if (slot.kind === "bus") {
                      // Render bus port square
                      const bx =
                        r === 0
                          ? -12
                          : r === 90
                            ? pos
                            : r === 180
                              ? rw + 3
                              : pos;
                      const by =
                        r === 0
                          ? pos
                          : r === 90
                            ? -9
                            : r === 180
                              ? pos
                              : rh + 3;
                      const dominantIn =
                        comp.inputs
                          .slice(slot.start, slot.end)
                          .find((v) => v !== LogicValue.ZERO) ??
                        LogicValue.ZERO;
                      const busLabel =
                        def.inputLabels?.[slot.start]?.replace(/\..*$/, "") ??
                        `/${slot.end - slot.start}`;

                      return (
                        <g key={`gate-node-bus-in-${slot.groupIdx}`}>
                          <rect
                            x={isVertical ? bx - 3 : bx - 6}
                            y={isVertical ? by - 6 : by - 3}
                            width={12}
                            height={12}
                            rx={2}
                            ry={2}
                            fill={
                              dominantIn === LogicValue.ONE
                                ? "var(--color-signal-on)"
                                : dominantIn === LogicValue.UNKNOWN
                                  ? "var(--color-signal-unknown)"
                                  : dominantIn === LogicValue.HIGH_IMPEDANCE
                                    ? "var(--color-signal-highz)"
                                    : "var(--color-background)"
                            }
                            stroke={pinColor(dominantIn)}
                            strokeWidth={1.5}
                            onMouseDown={(e) =>
                              onPinDown(e, slot.start, PIN_KIND.IN)
                            }
                            onMouseUp={(e) =>
                              onPinUp(e, slot.start, PIN_KIND.IN)
                            }
                            style={{ cursor: "crosshair" }}
                            className={cn(
                              "hover:stroke-primary",
                              glowClass(dominantIn),
                            )}
                          />
                          <text
                            x={isVertical ? (r === 0 ? 4 : rw - 4) : pos}
                            y={isVertical ? pos : r === 90 ? 10 : rh - 10}
                            textAnchor={
                              isVertical
                                ? r === 0
                                  ? "start"
                                  : "end"
                                : "middle"
                            }
                            dominantBaseline={
                              isVertical
                                ? "middle"
                                : r === 90
                                  ? "hanging"
                                  : "auto"
                            }
                            fill="var(--color-muted-foreground)"
                            fontSize={7}
                            fontFamily="var(--font-mono)"
                            pointerEvents="none"
                          >
                            {busLabel}
                          </text>
                        </g>
                      );
                    }

                    // Render normal pin
                    const i = slot.index;
                    let cx: number;
                    let cy: number;
                    let lx: number;
                    let ly: number;

                    if (r === 0) {
                      cx = -PIN_OFFSET;
                      cy = pos;
                      lx = 0;
                      ly = pos;
                    } else if (r === 90) {
                      cx = pos;
                      cy = -PIN_OFFSET;
                      lx = pos;
                      ly = 0;
                    } else if (r === 180) {
                      cx = rw + PIN_OFFSET;
                      cy = pos;
                      lx = rw;
                      ly = pos;
                    } else {
                      cx = pos;
                      cy = rh + PIN_OFFSET;
                      lx = pos;
                      ly = rh;
                    }

                    const pinLabel = def.inputLabels?.[i];
                    const inSignal =
                      comp.inputs[i] ?? LogicValue.HIGH_IMPEDANCE;
                    const isClockPin = pinLabel === "CLK";

                    return (
                      <g key={`gate-node-in-${i}`}>
                        <line
                          x1={lx}
                          y1={ly}
                          x2={cx}
                          y2={cy}
                          stroke={pinColor(inSignal)}
                          strokeWidth={1.5}
                        />
                        {isClockPin ? (
                          <>
                            <rect
                              x={cx - 5}
                              y={cy - 5}
                              width={10}
                              height={10}
                              fill={
                                inSignal === LogicValue.ONE
                                  ? "var(--color-signal-on)"
                                  : inSignal === LogicValue.UNKNOWN
                                    ? "var(--color-signal-unknown)"
                                    : inSignal === LogicValue.HIGH_IMPEDANCE
                                      ? "var(--color-signal-highz)"
                                      : "var(--color-background)"
                              }
                              stroke={pinColor(inSignal)}
                              strokeWidth={1.5}
                              onMouseDown={(e) => onPinDown(e, i, PIN_KIND.IN)}
                              onMouseUp={(e) => onPinUp(e, i, PIN_KIND.IN)}
                              style={{ cursor: "crosshair" }}
                              className={cn(
                                "hover:stroke-primary",
                                glowClass(inSignal),
                              )}
                            />
                            <polygon
                              points={`${cx - 3},${cy - 3} ${cx + 3},${cy} ${cx - 3},${cy + 3}`}
                              fill={pinColor(inSignal)}
                              pointerEvents="none"
                            />
                          </>
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={
                              inSignal === LogicValue.ONE
                                ? "var(--color-signal-on)"
                                : inSignal === LogicValue.UNKNOWN
                                  ? "var(--color-signal-unknown)"
                                  : inSignal === LogicValue.HIGH_IMPEDANCE
                                    ? "var(--color-signal-highz)"
                                    : "var(--color-background)"
                            }
                            stroke={pinColor(inSignal)}
                            strokeWidth={1.5}
                            onMouseDown={(e) => onPinDown(e, i, PIN_KIND.IN)}
                            onMouseUp={(e) => onPinUp(e, i, PIN_KIND.IN)}
                            style={{ cursor: "crosshair" }}
                            className={cn(
                              "hover:stroke-primary",
                              glowClass(inSignal),
                            )}
                          />
                        )}
                        {pinLabel && (
                          <text
                            x={isVertical ? (r === 0 ? 4 : rw - 4) : pos}
                            y={isVertical ? pos : r === 90 ? 10 : rh - 10}
                            textAnchor={
                              isVertical
                                ? r === 0
                                  ? "start"
                                  : "end"
                                : "middle"
                            }
                            dominantBaseline={
                              isVertical
                                ? "middle"
                                : r === 90
                                  ? "hanging"
                                  : "auto"
                            }
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
                  });
                })()}
            {/* Output pins */}
            {def.isBusOutput
              ? (() => {
                  const bx =
                    r === 0
                      ? rw + 3
                      : r === 90
                        ? rw / 2 - 6
                        : r === 180
                          ? -15
                          : rw / 2 - 6;
                  const by =
                    r === 0
                      ? rh / 2
                      : r === 90
                        ? rh + 9
                        : r === 180
                          ? rh / 2
                          : -9;

                  return (
                    <g key="gate-node-bus-out">
                      <rect
                        x={bx}
                        y={by - 6}
                        width={12}
                        height={12}
                        rx={2}
                        ry={2}
                        fill={
                          dominantOutput === LogicValue.ONE
                            ? "var(--color-signal-on)"
                            : dominantOutput === LogicValue.UNKNOWN
                              ? "var(--color-signal-unknown)"
                              : dominantOutput === LogicValue.HIGH_IMPEDANCE
                                ? "var(--color-signal-highz)"
                                : "var(--color-background)"
                        }
                        stroke={pinColor(dominantOutput)}
                        strokeWidth={1.5}
                        onMouseDown={(e) => onPinDown(e, -1, PIN_KIND.OUT)}
                        style={{ cursor: "crosshair" }}
                        className={cn(
                          "hover:stroke-primary",
                          glowClass(dominantOutput),
                        )}
                      />
                    </g>
                  );
                })()
              : (() => {
                  const busGroups = def.busOutputGroups ?? [];

                  type Slot =
                    | { kind: "pin"; index: number }
                    | {
                        kind: "bus";
                        groupIdx: number;
                        start: number;
                        end: number;
                      };

                  let pinIdx = 0;
                  const slots: Slot[] = [];
                  const groupStartMap = new Map(
                    busGroups.map((g, gi) => [g[0], { gi, g }]),
                  );

                  while (pinIdx < def.outputs) {
                    const entry = groupStartMap.get(pinIdx);

                    if (entry) {
                      const [start, end] = entry.g;

                      slots.push({
                        kind: "bus",
                        groupIdx: entry.gi,
                        start,
                        end,
                      });
                      pinIdx = end;
                    } else {
                      slots.push({ kind: "pin", index: pinIdx });
                      pinIdx += 1;
                    }
                  }

                  const slotCount = slots.length;
                  const sizeAxis = isVertical ? rh : rw;

                  // Calculate positions with bus ports getting double spacing
                  const pinSpacing = PIN_SPACING_UNITS * CELL_SIZE;
                  let totalSpan = 0;

                  for (let i = 1; i < slotCount; i += 1) {
                    const prevBus = slots[i - 1].kind === "bus";
                    const curBus = slots[i].kind === "bus";

                    totalSpan +=
                      prevBus || curBus ? pinSpacing * 2 : pinSpacing;
                  }

                  const startOffset =
                    Math.round((sizeAxis - totalSpan) / 2 / CELL_SIZE) *
                    CELL_SIZE;

                  // Build position array
                  const positions: number[] = [startOffset];

                  for (let i = 1; i < slotCount; i += 1) {
                    const prevBus = slots[i - 1].kind === "bus";
                    const curBus = slots[i].kind === "bus";
                    const gap = prevBus || curBus ? pinSpacing * 2 : pinSpacing;

                    positions.push(positions[i - 1] + gap);
                  }

                  return slots.map((slot, si) => {
                    const pos = positions[si];

                    if (slot.kind === "bus") {
                      const bx =
                        r === 0
                          ? rw + 3
                          : r === 90
                            ? pos - 6
                            : r === 180
                              ? -15
                              : pos - 6;
                      const by =
                        r === 0
                          ? pos
                          : r === 90
                            ? rh + 3
                            : r === 180
                              ? pos
                              : -15;
                      const dominantBus =
                        comp.outputs
                          .slice(slot.start, slot.end)
                          .find((v) => v !== LogicValue.ZERO) ??
                        LogicValue.ZERO;
                      const busLabel =
                        def.outputLabels?.[slot.start]?.replace(/\..*$/, "") ??
                        `/${slot.end - slot.start}`;

                      return (
                        <g key={`gate-node-bus-out-${slot.groupIdx}`}>
                          <rect
                            x={isVertical ? bx : bx}
                            y={isVertical ? by - 6 : by}
                            width={12}
                            height={12}
                            rx={2}
                            ry={2}
                            fill={
                              dominantBus === LogicValue.ONE
                                ? "var(--color-signal-on)"
                                : dominantBus === LogicValue.UNKNOWN
                                  ? "var(--color-signal-unknown)"
                                  : dominantBus === LogicValue.HIGH_IMPEDANCE
                                    ? "var(--color-signal-highz)"
                                    : "var(--color-background)"
                            }
                            stroke={pinColor(dominantBus)}
                            strokeWidth={1.5}
                            onMouseDown={(e) =>
                              onPinDown(e, slot.start, PIN_KIND.OUT)
                            }
                            style={{ cursor: "crosshair" }}
                            className={cn(
                              "hover:stroke-primary",
                              glowClass(dominantBus),
                            )}
                          />
                          <text
                            x={isVertical ? (r === 0 ? rw - 4 : 4) : pos}
                            y={isVertical ? pos : r === 90 ? rh - 10 : 10}
                            textAnchor={
                              isVertical
                                ? r === 0
                                  ? "end"
                                  : "start"
                                : "middle"
                            }
                            dominantBaseline={
                              isVertical
                                ? "middle"
                                : r === 90
                                  ? "auto"
                                  : "hanging"
                            }
                            fill="var(--color-muted-foreground)"
                            fontSize={7}
                            fontFamily="var(--font-mono)"
                            pointerEvents="none"
                          >
                            {busLabel}
                          </text>
                        </g>
                      );
                    }

                    const i = slot.index;
                    const outSignal = comp.outputs[i] ?? LogicValue.UNKNOWN;
                    const isOn = outSignal === LogicValue.ONE;
                    let cx: number;
                    let cy: number;
                    let lx: number;
                    let ly: number;

                    if (r === 0) {
                      cx = rw + PIN_OFFSET;
                      cy = pos;
                      lx = rw;
                      ly = pos;
                    } else if (r === 90) {
                      cx = pos;
                      cy = rh + PIN_OFFSET;
                      lx = pos;
                      ly = rh;
                    } else if (r === 180) {
                      cx = -PIN_OFFSET;
                      cy = pos;
                      lx = 0;
                      ly = pos;
                    } else {
                      cx = pos;
                      cy = -PIN_OFFSET;
                      lx = pos;
                      ly = 0;
                    }

                    const pinLabel = def.outputLabels?.[i];

                    return (
                      <g key={`gate-node-out-${i}`}>
                        <line
                          x1={lx}
                          y1={ly}
                          x2={cx}
                          y2={cy}
                          stroke={pinColor(outSignal)}
                          strokeWidth={1.5}
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={
                            isOn
                              ? "var(--color-signal-on)"
                              : outSignal === LogicValue.UNKNOWN
                                ? "var(--color-signal-unknown)"
                                : outSignal === LogicValue.HIGH_IMPEDANCE
                                  ? "var(--color-signal-highz)"
                                  : "var(--color-background)"
                          }
                          stroke={pinColor(outSignal)}
                          strokeWidth={1.5}
                          onMouseDown={(e) => onPinDown(e, i, PIN_KIND.OUT)}
                          onMouseUp={(e) => onPinUp(e, i, PIN_KIND.OUT)}
                          style={{ cursor: "crosshair" }}
                          className={cn(
                            "hover:stroke-primary",
                            glowClass(outSignal),
                          )}
                        />
                        {pinLabel && (
                          <text
                            x={isVertical ? (r === 0 ? rw - 4 : 4) : pos}
                            y={isVertical ? pos : r === 90 ? rh - 10 : 10}
                            textAnchor={
                              isVertical
                                ? r === 0
                                  ? "end"
                                  : "start"
                                : "middle"
                            }
                            dominantBaseline={
                              isVertical
                                ? "middle"
                                : r === 90
                                  ? "auto"
                                  : "hanging"
                            }
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
                  });
                })()}
          </>
        );
      })()}
    </g>
  );
}

export default memo(GateNode);
