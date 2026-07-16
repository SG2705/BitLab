/* eslint-disable react/jsx-props-no-spreading */
import type { SVGProps } from "react";
import { FormattedMessage } from "react-intl";

import {
  GATE_TYPE_AND,
  GATE_TYPE_AND3,
  GATE_TYPE_BUFFER,
  GATE_TYPE_BUS4,
  GATE_TYPE_BUS8,
  GATE_TYPE_BUS16,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CLOCK,
  GATE_TYPE_CMP4,
  GATE_TYPE_COMMENT,
  GATE_TYPE_COMPARATOR,
  GATE_TYPE_CONST,
  GATE_TYPE_COUNTER4,
  GATE_TYPE_DEBUS4,
  GATE_TYPE_DEBUS8,
  GATE_TYPE_DEBUS16,
  GATE_TYPE_DECODER2,
  GATE_TYPE_DECODER3,
  GATE_TYPE_DEMUX2,
  GATE_TYPE_DFF,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_DLATCH,
  GATE_TYPE_ENCODER4,
  GATE_TYPE_FULL_ADDER,
  GATE_TYPE_FULL_SUB,
  GATE_TYPE_HALF_ADDER,
  GATE_TYPE_HALF_SUB,
  GATE_TYPE_JKFF,
  GATE_TYPE_LED,
  GATE_TYPE_MUX2,
  GATE_TYPE_MUX4,
  GATE_TYPE_MUX8,
  GATE_TYPE_NAND,
  GATE_TYPE_NOR,
  GATE_TYPE_NOT,
  GATE_TYPE_OR,
  GATE_TYPE_OR3,
  GATE_TYPE_PROBE,
  GATE_TYPE_REG4,
  GATE_TYPE_SHREG4,
  GATE_TYPE_SPLITTER,
  GATE_TYPE_SR_LATCH,
  GATE_TYPE_TIFF,
  GATE_TYPE_TOGGLE,
  GATE_TYPE_UREG4,
  GATE_TYPE_UREG8,
  GATE_TYPE_XNOR,
  GATE_TYPE_XOR,
} from "@/lib/constants";

/**
 * Digital gate & symbol icons — 24x24, currentColor stroke, no fill by default.
 * Aesthetic, minimal, uniform stroke weight (1.5). Designed as a cohesive set.
 *
 * Usage: <AndIcon className="h-6 w-6 text-primary" />
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  xmlns: "http://www.w3.org/2000/svg",
};

function Svg({ children, ...p }: IconProps & { children: React.ReactNode }) {
  return (
    <svg {...base} {...p}>
      {children}
    </svg>
  );
}

/* ---------- Basic gates ---------- */

/**
 * AndIcon
 */
export function AndIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* AND: flat left, semicircle right */}
      <path d="M5 5h5a6 6 0 0 1 0 12H5z" />
      <path d="M2 9h3M2 15h3M17 12h5" />
    </Svg>
  );
}

/**
 * OrIcon
 */
export function OrIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {/* OR: curved back, pointed nose */}
      <path d="M4 5c3 2 3 12 0 14 4 0 9 0 13-7-4-7-9-7-13-7z" />
      <path d="M2 9h3.2M2 15h3.2M18 12h4" />
    </Svg>
  );
}

/**
 * XorIcon
 */
export function XorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 5c3 2 3 12 0 14 4 0 9 0 13-7-4-7-9-7-13-7z" />
      <path d="M3 5c3 2 3 12 0 14" />
      <path d="M2 9h2.5M2 15h2.5M18 12h4" />
    </Svg>
  );
}

/**
 * XnorIcon
 */
export function XnorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 5c3 2 3 12 0 14 4 0 8 0 11.5-6" />
      <path d="M17.5 18c-3-1-4-4-4-6s1-5 4-6" />
      <path d="M3 5c3 2 3 12 0 14" />
      <circle cx="20" cy="12" r="1.4" />
      <path d="M2 9h2.5M2 15h2.5M21.4 12H22" />
    </Svg>
  );
}

/**
 * NandIcon
 */
export function NandIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5h5a6 6 0 0 1 0 12H5z" />
      <circle cx="18.4" cy="12" r="1.4" />
      <path d="M2 9h3M2 15h3M19.8 12H22" />
    </Svg>
  );
}

/**
 * NorIcon
 */
export function NorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 5c3 2 3 12 0 14 4 0 9 0 12.5-7C13 5 8 5 4 5z" />
      <circle cx="18" cy="12" r="1.4" />
      <path d="M2 9h3.2M2 15h3.2M19.4 12H22" />
    </Svg>
  );
}

/**
 * NotIcon
 */
export function NotIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5v14l12-7z" />
      <circle cx="18.4" cy="12" r="1.4" />
      <path d="M2 12h3M19.8 12H22" />
    </Svg>
  );
}

/**
 * BufferIcon
 */
export function BufferIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5v14l14-7z" />
      <path d="M2 12h3M19 12h3" />
    </Svg>
  );
}

/**
 * And3Icon
 */
export function And3Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 4h5a7 7 0 0 1 0 14H5z" />
      <path d="M2 8h3M2 12h3M2 16h3M17 11h5" />
    </Svg>
  );
}

/**
 * Or3Icon
 */
export function Or3Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 4c3 2 3 14 0 16 4 0 9 0 13-8-4-8-9-8-13-8z" />
      <path d="M2 8h3.2M2 12h3.2M2 16h3.2M18 12h4" />
    </Svg>
  );
}

/* ---------- Inputs / outputs ---------- */

/**
 * ToggleIcon
 */
export function ToggleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2.5" y="7" width="19" height="10" rx="5" />
      <circle cx="16.5" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/**
 * ButtonIcon
 */
export function ButtonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
    </Svg>
  );
}

/**
 * ConstantIcon
 */
export function ConstantIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="8" width="12" height="8" rx="1.5" />
      <path d="M7 12h5" />
      <path d="M15.5 12H22" />
    </Svg>
  );
}

/**
 * ClockIcon
 */
export function ClockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="14" height="12" rx="1" />
      <path d="M5 15v-3h2v-3h2v3h2v-3h2v3h2v-3" />
      <path d="M17 12h5" />
    </Svg>
  );
}

/**
 * LedIcon
 */
export function LedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 4v-2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 5 5M19 19l-1.3-1.3M6.3 17.7 5 19M19 5l-1.3 1.3" />
    </Svg>
  );
}

/**
 * SevenSegIcon
 */
export function SevenSegIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 4h6l-1 2H9zM7 5l1 6H6l-1-6zM16 5l1 6h-2l-1-6z" />
      <path d="M6 12h2l1 2-1 2H6l-1-2zM15 12h2l1 2-1 2h-2l-1-2z" />
      <path d="M7 18h2l-1 2H8zM7 19h9l-1 2H8zM14 18h2l1 2h-2z" />
    </Svg>
  );
}

/* ---------- Latches / flip-flops ---------- */

const rect = (extra?: React.ReactNode) => (
  <>
    <rect x="5" y="4" width="14" height="16" rx="1.5" />
    {extra}
  </>
);

/**
 * SrLatchIcon
 */
export function SrLatchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {rect(
        <text
          x="12"
          y="14"
          textAnchor="middle"
          fontSize="6"
          fontFamily="ui-sans-serif"
          fill="currentColor"
          stroke="none"
        >
          <FormattedMessage id="45rhyt" defaultMessage="SR" />
        </text>,
      )}
      <path d="M2 8h3M2 16h3M19 8h3M19 16h3" />
    </Svg>
  );
}

/**
 * DFlipFlopIcon
 */
export function DFlipFlopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {rect(
        <text
          x="12"
          y="11"
          textAnchor="middle"
          fontSize="6"
          fontFamily="ui-sans-serif"
          fill="currentColor"
          stroke="none"
        >
          <FormattedMessage id="KslodS" defaultMessage="D" />
        </text>,
      )}
      <path d="M6 15l2 1.5-2 1.5" />
      <path d="M2 8h3M2 17h3M19 8h3M19 16h3" />
    </Svg>
  );
}

/**
 * JkFlipFlopIcon
 */
export function JkFlipFlopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {rect(
        <text
          x="12"
          y="14"
          textAnchor="middle"
          fontSize="6"
          fontFamily="ui-sans-serif"
          fill="currentColor"
          stroke="none"
        >
          <FormattedMessage id="pTk7NT" defaultMessage="JK" />
        </text>,
      )}
      <path d="M6 15l2 1.5-2 1.5" />
      <path d="M2 8h3M2 12h3M2 17h3M19 8h3M19 16h3" />
    </Svg>
  );
}

/**
 * TFlipFlopIcon
 */
export function TFlipFlopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {rect(
        <text
          x="12"
          y="11"
          textAnchor="middle"
          fontSize="6"
          fontFamily="ui-sans-serif"
          fill="currentColor"
          stroke="none"
        >
          <FormattedMessage id="sjlqAC" defaultMessage="T" />
        </text>,
      )}
      <path d="M6 15l2 1.5-2 1.5" />
      <path d="M2 8h3M2 17h3M19 8h3M19 16h3" />
    </Svg>
  );
}

/**
 * DLatchIcon
 */
export function DLatchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {rect(
        <text
          x="12"
          y="11"
          textAnchor="middle"
          fontSize="6"
          fontFamily="ui-sans-serif"
          fill="currentColor"
          stroke="none"
        >
          <FormattedMessage id="KslodS" defaultMessage="D" />
        </text>,
      )}
      <text
        x="12"
        y="18"
        textAnchor="middle"
        fontSize="4.5"
        fontFamily="ui-sans-serif"
        fill="currentColor"
        stroke="none"
      >
        <FormattedMessage id="zsr0Bz" defaultMessage="EN" />
      </text>
      <path d="M2 8h3M2 17h3M19 8h3M19 16h3" />
    </Svg>
  );
}

/* ---------- Adders / subtractors ---------- */

const chip = (label: string, key?: string) => (
  <>
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <text
      key={key}
      x="12"
      y="14"
      textAnchor="middle"
      fontSize="5.5"
      fontFamily="ui-sans-serif"
      fill="currentColor"
      stroke="none"
    >
      {label}
    </text>
  </>
);

/**
 * HalfAdderIcon
 */
export function HalfAdderIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {chip("½ ADD")}
      <path d="M1 9h3M1 15h3M20 9h3M20 15h3" />
    </Svg>
  );
}

/**
 * FullAdderIcon
 */
export function FullAdderIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {chip("ADD")}
      <path d="M1 8h3M1 12h3M1 16h3M20 9h3M20 15h3" />
    </Svg>
  );
}

/**
 * HalfSubIcon
 */
export function HalfSubIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {chip("½ SUB")}
      <path d="M1 9h3M1 15h3M20 9h3M20 15h3" />
    </Svg>
  );
}

/**
 * FullSubIcon
 */
export function FullSubIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {chip("SUB")}
      <path d="M1 8h3M1 12h3M1 16h3M20 9h3M20 15h3" />
    </Svg>
  );
}

/* ---------- Mux / demux / decoders / encoders ---------- */

const trapezoid = (flip = false) => (
  <path
    d={
      flip
        ? "M18 4L6 8v8l12 4z" // demux/decoder: narrow left, wide right
        : "M6 4l12 4v8L6 20z" // mux: wide left, narrow right
    }
  />
);

/**
 * Mux21Icon
 */
export function Mux21Icon(p: IconProps) {
  return (
    <Svg {...p}>
      {trapezoid()}
      <path d="M2 8h4M2 16h4M18 12h4M12 21v-2" />
    </Svg>
  );
}

/**
 * Mux41Icon
 */
export function Mux41Icon(p: IconProps) {
  return (
    <Svg {...p}>
      {trapezoid()}
      <path d="M2 7h4M2 11h4M2 15h4M2 19h4M18 12h4M10 21v-2M14 21v-2" />
    </Svg>
  );
}

/**
 * Mux81Icon
 */
export function Mux81Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 3l14 5v8l-14 5z" />
      <path d="M1 5h3M1 8h3M1 11h3M1 14h3M1 17h3M1 20h3M18 12h5" />
      <path d="M9 22v-2M12 22v-2M15 22v-2" />
    </Svg>
  );
}

/**
 * Demux12Icon
 */
export function Demux12Icon(p: IconProps) {
  return (
    <Svg {...p}>
      {trapezoid(true)}
      <path d="M2 12h4M18 8h4M18 16h4M12 21v-2" />
    </Svg>
  );
}

/**
 * Decoder24Icon
 */
export function Decoder24Icon(p: IconProps) {
  return (
    <Svg {...p}>
      {trapezoid(true)}
      <path d="M2 9h4M2 15h4M18 7h4M18 11h4M18 15h4M18 19h4" />
    </Svg>
  );
}

/**
 * Decoder38Icon
 */
export function Decoder38Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3l14 5v8L6 21z" transform="matrix(-1 0 0 1 24 0)" />
      <path d="M2 7h4M2 11h4M2 15h4M18 5h4M18 8h4M18 11h4M18 14h4M18 17h4M18 20h4" />
      <path d="M18 5h4" />
    </Svg>
  );
}

/**
 * Encoder42Icon
 */
export function Encoder42Icon(p: IconProps) {
  return (
    <Svg {...p}>
      {trapezoid()}
      <path d="M2 7h4M2 11h4M2 15h4M2 19h4M18 9h4M18 15h4" />
    </Svg>
  );
}

/* ---------- Registers / counters ---------- */

/**
 * Register4Icon
 */
export function Register4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M8 6v12M12 6v12M16 6v12" />
    </Svg>
  );
}

/**
 * Counter4Icon
 */
export function Counter4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontSize="6"
        fontFamily="ui-monospace"
        fill="currentColor"
        stroke="none"
      >
        <FormattedMessage id="lLzTuh" defaultMessage="0-F" />
      </text>
    </Svg>
  );
}

/**
 * ShiftReg4Icon
 */
export function ShiftReg4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M8 7v10M13 7v10M18 7v10" />
      <path d="M5.5 12l1.5-1.5M10.5 12L12 10.5M15.5 12L17 10.5" />
    </Svg>
  );
}

/* ---------- Comparators ---------- */

/**
 * Comparator4Icon
 */
export function Comparator4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      {chip("A=B")}
      <path d="M1 8h3M1 12h3M1 16h3M20 8h3M20 12h3M20 16h3" />
    </Svg>
  );
}

/**
 * ComparatorIcon
 */
export function ComparatorIcon(p: IconProps) {
  return (
    <Svg {...p}>
      {chip("CMP")}
      <path d="M1 9h3M1 15h3M20 12h3" />
    </Svg>
  );
}

/* ---------- Misc ---------- */

/**
 * UtilityIcon
 */
export function UtilityIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14.7 3.3l-1.4 1.4a3 3 0 0 0 4.2 4.2l1.4-1.4a5 5 0 0 1-6.7 6.7l-6.5 6.5a2 2 0 0 1-2.8-2.8l6.5-6.5a5 5 0 0 1 6.7-6.7z" />
    </Svg>
  );
}

/**
 * SplitterIcon
 */
export function SplitterIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 12h8M10 12l6-5M10 12l6 0M10 12l6 5" />
      <circle cx="10" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="7" r="1.4" />
      <circle cx="17" cy="12" r="1.4" />
      <circle cx="17" cy="17" r="1.4" />
    </Svg>
  );
}

/**
 * CommentIcon
 */
export function CommentIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 5h16v11H10l-4 4v-4H4z" />
      <path d="M8 10h8M8 13h5" />
    </Svg>
  );
}

/**
 * ProbeIcon
 */
export function ProbeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 3l7 7-4 1-4 4-1 4-7-7 4-1 4-4z" />
      <path d="M9 15l-5 5" />
    </Svg>
  );
}

/* ---------- Bus / debus ---------- */

/**
 * Bus4Icon
 */
export function Bus4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8h18v8H3z" />
      <path d="M6 12h1M10 12h1M14 12h1M18 12h1" />
    </Svg>
  );
}

/**
 * Bus8Icon
 */
export function Bus8Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8h18v8H3z" />
      <path d="M5 12h1.5M8 12h1.5M11 12h1.5M14 12h1.5M17 12h1.5" />
      <text
        x="12"
        y="11"
        textAnchor="middle"
        fontSize="4"
        fontFamily="ui-monospace"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

/**
 * Bus16Icon
 */
export function Bus16Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8h18v8H3z" />
      <path d="M4 12h1.5M6.5 12h1.5M9 12h1.5M11.5 12h1.5M14 12h1.5M16.5 12h1.5M19 12h1.5" />
    </Svg>
  );
}

/**
 * Debus4Icon
 */
export function Debus4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8h18v8H3z" />
      <path d="M6 12h1M10 12h1M14 12h1M18 12h1" />
      <path d="M6 12v2M10 12v2M14 12v2M18 12v2" />
    </Svg>
  );
}

/**
 * Debus8Icon
 */
export function Debus8Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8h18v8H3z" />
      <path d="M5 12h1.5M8 12h1.5M11 12h1.5M14 12h1.5M17 12h1.5" />
      <path d="M5 12v2M8 12v2M11 12v2M14 12v2M17 12v2" />
    </Svg>
  );
}

/**
 * Debus16Icon
 */
export function Debus16Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8h18v8H3z" />
      <path d="M4 12h1.5M6.5 12h1.5M9 12h1.5M11.5 12h1.5M14 12h1.5M16.5 12h1.5M19 12h1.5" />
      <path d="M4 12v2M6.5 12v2M9 12v2M11.5 12v2M14 12v2M16.5 12v2M19 12v2" />
    </Svg>
  );
}

/* ---------- Universal registers ---------- */

/**
 * UReg4Icon
 */
export function UReg4Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M7 6v12M12 6v12M17 6v12" />
    </Svg>
  );
}

/**
 * UReg8Icon
 */
export function UReg8Icon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M6 6v12M9 6v12M12 6v12M15 6v12M18 6v12" />
    </Svg>
  );
}

/* ---------- BCD / digit display ---------- */

/**
 * DigitToBinIcon
 */
export function DigitToBinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <text
        x="12"
        y="11"
        textAnchor="middle"
        fontSize="4"
        fontFamily="ui-monospace"
        fill="currentColor"
        stroke="none"
      >
        <FormattedMessage
          id="kR4Dpg"
          defaultMessage="{num}"
          values={{ num: "4→1" }}
        />
      </text>
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="4"
        fontFamily="ui-monospace"
        fill="currentColor"
        stroke="none"
      >
        <FormattedMessage
          id="kR4Dpg"
          defaultMessage="{num}"
          values={{ num: "0-9" }}
        />
      </text>
    </Svg>
  );
}

/* ---------- Registry (label -> component) ---------- */

const GATE_ICON = {
  [GATE_TYPE_AND]: AndIcon,
  [GATE_TYPE_OR]: OrIcon,
  [GATE_TYPE_XOR]: XorIcon,
  [GATE_TYPE_XNOR]: XnorIcon,
  [GATE_TYPE_NAND]: NandIcon,
  [GATE_TYPE_NOR]: NorIcon,
  [GATE_TYPE_NOT]: NotIcon,
  [GATE_TYPE_BUFFER]: BufferIcon,
  [GATE_TYPE_AND3]: And3Icon,
  [GATE_TYPE_OR3]: Or3Icon,
  [GATE_TYPE_TOGGLE]: ToggleIcon,
  [GATE_TYPE_BUTTON]: ButtonIcon,
  [GATE_TYPE_CONST]: ConstantIcon,
  [GATE_TYPE_CLOCK]: ClockIcon,
  [GATE_TYPE_LED]: LedIcon,
  [GATE_TYPE_DISPLAY7]: SevenSegIcon,
  [GATE_TYPE_SR_LATCH]: SrLatchIcon,
  [GATE_TYPE_DFF]: DFlipFlopIcon,
  [GATE_TYPE_JKFF]: JkFlipFlopIcon,
  [GATE_TYPE_TIFF]: TFlipFlopIcon,
  [GATE_TYPE_HALF_ADDER]: HalfAdderIcon,
  [GATE_TYPE_FULL_ADDER]: FullAdderIcon,
  [GATE_TYPE_MUX2]: Mux21Icon,
  [GATE_TYPE_MUX4]: Mux41Icon,
  [GATE_TYPE_DEMUX2]: Demux12Icon,
  [GATE_TYPE_DECODER2]: Decoder24Icon,
  [GATE_TYPE_ENCODER4]: Encoder42Icon,
  [GATE_TYPE_DLATCH]: DLatchIcon,
  [GATE_TYPE_REG4]: Register4Icon,
  [GATE_TYPE_COUNTER4]: Counter4Icon,
  [GATE_TYPE_SHREG4]: ShiftReg4Icon,
  [GATE_TYPE_DECODER3]: Decoder38Icon,
  [GATE_TYPE_MUX8]: Mux81Icon,
  [GATE_TYPE_HALF_SUB]: HalfSubIcon,
  [GATE_TYPE_FULL_SUB]: FullSubIcon,
  [GATE_TYPE_CMP4]: Comparator4Icon,
  [GATE_TYPE_COMPARATOR]: ComparatorIcon,
  [GATE_TYPE_PROBE]: ProbeIcon,
  [GATE_TYPE_SPLITTER]: SplitterIcon,
  [GATE_TYPE_COMMENT]: CommentIcon,
  [GATE_TYPE_DIGIT_BIN]: DigitToBinIcon,
  [GATE_TYPE_BUS4]: Bus4Icon,
  [GATE_TYPE_BUS8]: Bus8Icon,
  [GATE_TYPE_BUS16]: Bus16Icon,
  [GATE_TYPE_DEBUS4]: Debus4Icon,
  [GATE_TYPE_DEBUS8]: Debus8Icon,
  [GATE_TYPE_DEBUS16]: Debus16Icon,
  [GATE_TYPE_UREG4]: UReg4Icon,
  [GATE_TYPE_UREG8]: UReg8Icon,
} as const;

export type GateIcon = keyof typeof GATE_ICON;

export default GATE_ICON;
