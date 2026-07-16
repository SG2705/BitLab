import { memo } from "react";
import { FormattedMessage, useIntl } from "react-intl";

import { GATE_ICON, type GateIcon } from "@/components/ui";
import { type ComponentInstance, library } from "@/engine";
import {
  DEFAULT_PROBE_SAMPLES,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CONST,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_LED,
  GATE_TYPE_PROBE,
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
    <g transform="translate(20, 13)">
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
  const intl = useIntl();

  if (!library.has(comp.type)) return null;

  const def = library.get(comp.type);

  const active = comp.outputs.some(Boolean) || Boolean(comp.state?.on);
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
  const IconComponent = GATE_ICON[comp.type as GateIcon];

  if (def.isAnnotation) {
    return (
      <g
        transform={`translate(${comp.x}, ${comp.y})`}
        onMouseDown={onMouseDown}
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
          {comp.label ||
            intl.formatMessage({ id: "qBo9Vt", defaultMessage: "// comment" })}
        </text>
      </g>
    );
  }

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
      {comp.type !== GATE_TYPE_DISPLAY7 &&
        comp.type !== GATE_TYPE_PROBE &&
        comp.type !== GATE_TYPE_DIGIT_BIN &&
        (IconComponent ? (
          <IconComponent
            x={def.width / 2 - 20}
            y={def.height / 2 - 20}
            width={40}
            height={40}
            stroke={
              active ? "var(--color-signal-on)" : "var(--color-foreground)"
            }
            pointerEvents="none"
          />
        ) : (
          <text
            x={def.width / 2}
            y={def.height / 2 + (isCustomLabel ? 4 : 5)}
            textAnchor="middle"
            fill={active ? "var(--color-signal-on)" : "var(--color-foreground)"}
            fontSize={isCustomLabel ? 10 : 14}
            fontWeight={600}
            fontFamily="var(--font-mono)"
            pointerEvents="none"
          >
            {def.symbol ?? def.label}
          </text>
        ))}
      <text
        x={def.width / 2}
        y={def.height + 14}
        textAnchor="middle"
        fill="var(--color-muted-foreground)"
        fontSize={9}
        pointerEvents="none"
      >
        {isCustomLabel ? comp.label : (comp.label ?? def.label)}
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
      {comp.type === GATE_TYPE_PROBE && (
        <WaveformDisplay
          history={(comp.state?.history as ProbeSample[]) ?? []}
          width={def.width}
          height={def.height}
        />
      )}
      {comp.type === GATE_TYPE_DIGIT_BIN && (
        <text
          x={def.width / 2}
          y={def.height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={active ? "var(--color-signal-on)" : "var(--color-foreground)"}
          fontSize={32}
          fontWeight={700}
          fontFamily="var(--font-mono)"
          pointerEvents="none"
        >
          {(comp.state?.digit as number) ?? 0}
        </text>
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
