/* eslint-disable no-bitwise */
/**
 * logic.ts — Component evaluation functions and four-state logic utilities.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FOUR-STATE SIGNAL MODEL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This simulator uses a four-state logic model inspired by IEEE 1164 (VHDL):
 *
 *   ZERO (0)          — Strong logic low (driven low)
 *   ONE  (1)          — Strong logic high (driven high)
 *   UNKNOWN (X)       — Unknown / conflicting / unresolvable state
 *   HIGH_IMPEDANCE (Z)— High impedance / undriven / tri-state
 *
 * Signal Resolution (multi-driver nets):
 *   Uses a 4×4 resolution matrix. Key behaviors:
 *   - Z resolves to whatever the other driver provides (Z is "no drive")
 *   - Two agreeing strong signals resolve to that signal
 *   - Conflicting strong signals (0 vs 1) resolve to X
 *   - X combined with anything (except Z) remains X
 *
 * Gate Input Normalization:
 *   Before evaluation, HIGH_IMPEDANCE (Z) on gate inputs is treated as ZERO.
 *   This models TTL/CMOS behavior where floating inputs are pulled low.
 *   Tri-state behavior is handled explicitly by tri-state buffer evaluators.
 *
 * Sequential Control Inputs:
 *   Edge detection requires a definitive transition: prevClk === ZERO and
 *   clk === ONE. Uncertain signals (X, Z) do NOT trigger edges.
 *   This prevents spurious triggers from unknown or floating clock lines.
 *
 * Truth Tables:
 *   All gate truth tables are defined for the full 4×4 input space.
 *   The tables follow standard IEEE interpretations:
 *   - AND: 0 dominates (any 0 input → 0 output, regardless of X)
 *   - OR:  1 dominates (any 1 input → 1 output, regardless of X)
 *   - XOR/XNOR: X if any input is X or Z
 *   - NOT: inverts 0↔1, X→X, Z→X
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { DEFAULT_PROBE_SAMPLES } from "./constants";
import { type EvaluateResult, LogicValue, type SignalValue } from "./types";

const { ZERO, ONE, UNKNOWN, HIGH_IMPEDANCE } = LogicValue;

// Short aliases for truth table readability
const Z = ZERO;
const O = ONE;
const X = UNKNOWN;
const Hi = HIGH_IMPEDANCE;

// ══════════════════════════════════════════════════════════════════════════════
// FOUR-STATE LOGIC UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

// ── Conversion helpers ───────────────────────────────────────────────────────

export const fromBool = (v: boolean): LogicValue => (v ? O : Z);
export const toBool = (v: LogicValue): boolean => v === O;
export const isHigh = (v: LogicValue): boolean => v === O;
export const isLow = (v: LogicValue): boolean => v === Z;

// ── Signal Resolution Matrix (IEEE 1164 inspired) ────────────────────────────
// Indexed as RESOLVE_TABLE[a][b] where a,b ∈ {ZERO=0, ONE=1, UNKNOWN=2, HIGH_IMPEDANCE=3}
//
//          ZERO  ONE   X     Z
// ZERO  [  0,    X,    X,    0  ]
// ONE   [  X,    1,    X,    1  ]
// X     [  X,    X,    X,    X  ]
// Z     [  0,    1,    X,    Z  ]

const RESOLVE_TABLE: LogicValue[][] = [
  /* ZERO */ [Z, X, X, Z],
  /* ONE  */ [X, O, X, O],
  /* X    */ [X, X, X, X],
  /* Z    */ [Z, O, X, Hi],
];

// ── Truth tables ─────────────────────────────────────────────────────────────
// Indexed as TABLE[a][b] where a,b ∈ {ZERO=0, ONE=1, UNKNOWN=2, HIGH_IMPEDANCE=3}
//
// AND: 0 dominates — any definitive 0 forces output 0
// OR:  1 dominates — any definitive 1 forces output 1
// XOR: requires both inputs known
// Z is treated same as X in gate inputs (per input normalization)

export const AND_TABLE: LogicValue[][] = [
  /*        Z  O  X  Hi   */
  /* Z  */ [Z, Z, Z, Z],
  /* O  */ [Z, O, X, X],
  /* X  */ [Z, X, X, X],
  /* Hi */ [Z, X, X, X],
];

export const OR_TABLE: LogicValue[][] = [
  /*        Z  O  X  Hi   */
  /* Z  */ [Z, O, X, X],
  /* O  */ [O, O, O, O],
  /* X  */ [X, O, X, X],
  /* Hi */ [X, O, X, X],
];

export const XOR_TABLE: LogicValue[][] = [
  /*        Z  O  X  Hi   */
  /* Z  */ [Z, O, X, X],
  /* O  */ [O, Z, X, X],
  /* X  */ [X, X, X, X],
  /* Hi */ [X, X, X, X],
];

/** NOT: inverts 0↔1, X→X, Z→X */
export const NOT_TABLE: LogicValue[] = [O, Z, X, X];

/** BUFFER: passes signal through, Z remains Z (for tri-state modeling) */
export const BUFFER_TABLE: LogicValue[] = [Z, O, X, Hi];

// Derived tables (computed from NOT ∘ base for correctness)
export const NAND_TABLE: LogicValue[][] = AND_TABLE.map((row) =>
  row.map((v) => NOT_TABLE[v]),
);

export const NOR_TABLE: LogicValue[][] = OR_TABLE.map((row) =>
  row.map((v) => NOT_TABLE[v]),
);

export const XNOR_TABLE: LogicValue[][] = XOR_TABLE.map((row) =>
  row.map((v) => NOT_TABLE[v]),
);

// ── Input normalization ──────────────────────────────────────────────────────

/**
 * Normalize a signal for gate input: HIGH_IMPEDANCE → ZERO.
 * Models TTL/CMOS behavior where floating inputs are pulled low.
 * Used internally before gate evaluation.
 */
const normalizeInput = (v: SignalValue): SignalValue => (v === Hi ? Z : v);

/**
 * Normalize an entire input array. Returns the original array if no
 * HIGH_IMPEDANCE values are present (avoids allocation).
 */
const normalizeInputs = (inputs: SignalValue[]): SignalValue[] => {
  let hasHiZ = false;

  for (let i = 0; i < inputs.length; i += 1) {
    if (inputs[i] === Hi) {
      hasHiZ = true;
      break;
    }
  }

  if (!hasHiZ) return inputs;

  return inputs.map(normalizeInput);
};

// ── Bus utilities ────────────────────────────────────────────────────────────

/**
 * Validate bus width: ensures input array length matches expected width.
 * Returns true if valid. Used by bus evaluators for defensive checks.
 */
const validateBusWidth = (
  inputs: SignalValue[],
  expectedTotal: number,
): boolean => inputs.length >= expectedTotal;

/**
 * Normalize a bus (array of signals): replace Hi-Z with ZERO for each bit.
 */
const normalizeBus = (signals: SignalValue[]): SignalValue[] =>
  signals.map(normalizeInput);

// ── Multi-input gate evaluation with early termination ───────────────────────

/**
 * Evaluate multi-input AND with short-circuit: any ZERO forces output ZERO.
 * Normalizes Hi-Z inputs to ZERO before evaluation.
 */
const evalAndInputs = (inputs: SignalValue[]): LogicValue => {
  if (inputs.length === 0) return X;

  let result: LogicValue = normalizeInput(inputs[0]);

  for (let i = 1; i < inputs.length; i += 1) {
    const v = normalizeInput(inputs[i]);

    result = AND_TABLE[result][v];
    // Early termination: AND with 0 is always 0
    if (result === Z) return Z;
  }

  return result;
};

/**
 * Evaluate multi-input OR with short-circuit: any ONE forces output ONE.
 * Normalizes Hi-Z inputs to ZERO before evaluation.
 */
const evalOrInputs = (inputs: SignalValue[]): LogicValue => {
  if (inputs.length === 0) return X;

  let result: LogicValue = normalizeInput(inputs[0]);

  for (let i = 1; i < inputs.length; i += 1) {
    const v = normalizeInput(inputs[i]);

    result = OR_TABLE[result][v];
    // Early termination: OR with 1 is always 1
    if (result === O) return O;
  }

  return result;
};

/**
 * Evaluate multi-input XOR (no short-circuit possible; X propagates).
 * Normalizes Hi-Z inputs to ZERO before evaluation.
 */
const evalXorInputs = (inputs: SignalValue[]): LogicValue => {
  if (inputs.length === 0) return X;

  let result: LogicValue = normalizeInput(inputs[0]);

  for (let i = 1; i < inputs.length; i += 1) {
    const v = normalizeInput(inputs[i]);

    result = XOR_TABLE[result][v];
  }

  return result;
};

// ── Signal resolution ────────────────────────────────────────────────────────

/**
 * Resolve multiple drivers on a single net using the 4×4 resolution matrix.
 *
 * Implements IEEE 1164-style resolution:
 * - Z + Z = Z (no driver)
 * - Z + 0 = 0 (single driver wins)
 * - Z + 1 = 1 (single driver wins)
 * - 0 + 0 = 0 (agreeing drivers)
 * - 1 + 1 = 1 (agreeing drivers)
 * - 0 + 1 = X (bus contention)
 * - X + anything = X (unknown propagates)
 */
export const resolveSignal = (drivers: LogicValue[]): LogicValue => {
  if (drivers.length === 0) return Hi;
  if (drivers.length === 1) return drivers[0];

  let resolved = drivers[0];

  for (let i = 1; i < drivers.length; i += 1) {
    resolved = RESOLVE_TABLE[resolved][drivers[i]];
  }

  return resolved;
};

/**
 * Resolve a bus (array of signals from multiple driver arrays).
 * Each position is resolved independently.
 */
export const resolveBus = (
  driverArrays: LogicValue[][],
  width: number,
): LogicValue[] => {
  const result: LogicValue[] = new Array<LogicValue>(width).fill(Hi);

  for (let bit = 0; bit < width; bit += 1) {
    const drivers: LogicValue[] = [];

    for (const arr of driverArrays) {
      if (bit < arr.length) drivers.push(arr[bit]);
    }

    result[bit] = resolveSignal(drivers);
  }

  return result;
};

export const migrateSignal = (v: unknown): LogicValue => {
  if (typeof v === "boolean") return v ? O : Z;
  if (typeof v === "number" && v >= 0 && v <= 3) return v;

  return X;
};

// ── Sequential logic helpers ─────────────────────────────────────────────────

/**
 * Interpret a SignalValue as boolean for sequential data inputs.
 * ONE → true, everything else (ZERO, UNKNOWN, Hi-Z) → false.
 * This is the conservative interpretation: uncertain signals are treated as low.
 */
const asBool = (v: SignalValue): boolean => v === O;

/**
 * Detect a rising edge on a clock signal.
 * Requires DEFINITIVE transition: previous must be ZERO, current must be ONE.
 * Uncertain signals (X, Z) do NOT trigger edges — this prevents spurious
 * clocking from floating or unknown clock lines.
 */
const isRisingEdge = (current: SignalValue, previous: SignalValue): boolean =>
  current === O && previous === Z;

/**
 * Check if a control signal (reset, enable) is asserted.
 * Only ONE counts as asserted. X and Z do NOT assert control signals.
 */
const isAsserted = (v: SignalValue): boolean => v === O;

// ── Tri-state buffer ─────────────────────────────────────────────────────────

/**
 * Tri-state buffer evaluation.
 * When enabled (enable === ONE): output = input (buffered)
 * When disabled (enable !== ONE): output = HIGH_IMPEDANCE
 *
 * This clearly separates tri-state behavior from regular buffer logic.
 */
export const evalTriStateBuffer = (
  input: SignalValue,
  enable: SignalValue,
): LogicValue => {
  if (enable === O) return BUFFER_TABLE[normalizeInput(input)];

  return Hi;
};

// ══════════════════════════════════════════════════════════════════════════════
// EVALUATE FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Logic Gates (with input normalization and early termination) ──────────────

export const evalGateAnd = (i: SignalValue[]): EvaluateResult => ({
  outputs: [evalAndInputs(i)],
  state: null,
});

export const evalGateOr = (i: SignalValue[]): EvaluateResult => ({
  outputs: [evalOrInputs(i)],
  state: null,
});

export const evalGateXor = (i: SignalValue[]): EvaluateResult => ({
  outputs: [evalXorInputs(i)],
  state: null,
});

export const evalGateXnor = (i: SignalValue[]): EvaluateResult => ({
  outputs: [NOT_TABLE[evalXorInputs(i)]],
  state: null,
});

export const evalGateNand = (i: SignalValue[]): EvaluateResult => ({
  outputs: [NOT_TABLE[evalAndInputs(i)]],
  state: null,
});

export const evalGateNor = (i: SignalValue[]): EvaluateResult => ({
  outputs: [NOT_TABLE[evalOrInputs(i)]],
  state: null,
});

export const evalGateNot = (i: SignalValue[]): EvaluateResult => ({
  outputs: [NOT_TABLE[normalizeInput(i[0])]],
  state: null,
});

/** Multi-channel NOT: each input is independently inverted (with normalization) */
export const evalGateNotMulti = (i: SignalValue[]): EvaluateResult => ({
  outputs: i.map((v) => NOT_TABLE[normalizeInput(v)]),
  state: null,
});

export const evalGateBuffer = (i: SignalValue[]): EvaluateResult => ({
  outputs: [BUFFER_TABLE[i[0]]],
  state: null,
});

// ── Bus Logic Gates (with width validation) ──────────────────────────────────

export const evalBusAnd = (i: SignalValue[]): EvaluateResult => {
  const width = i.length / 2;

  if (!validateBusWidth(i, width * 2)) {
    return { outputs: new Array<LogicValue>(width).fill(X), state: null };
  }

  const normalized = normalizeBus(i);

  return {
    outputs: Array.from(
      { length: width },
      (_, idx) => AND_TABLE[normalized[idx]][normalized[idx + width]],
    ),
    state: null,
  };
};

export const evalBusOr = (i: SignalValue[]): EvaluateResult => {
  const width = i.length / 2;

  if (!validateBusWidth(i, width * 2)) {
    return { outputs: new Array<LogicValue>(width).fill(X), state: null };
  }

  const normalized = normalizeBus(i);

  return {
    outputs: Array.from(
      { length: width },
      (_, idx) => OR_TABLE[normalized[idx]][normalized[idx + width]],
    ),
    state: null,
  };
};

export const evalBusNot = (i: SignalValue[]): EvaluateResult => ({
  outputs: i.map((v) => NOT_TABLE[normalizeInput(v)]),
  state: null,
});

// ── Inputs ───────────────────────────────────────────────────────────────────

export const evalInput = (
  _i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => ({
  outputs: [s?.on ? O : Z],
  state: s,
});

export const evalVcc = (): EvaluateResult => ({
  outputs: [O],
  state: { on: true },
});

export const evalGnd = (): EvaluateResult => ({
  outputs: [Z],
  state: { on: false },
});

export const evalBusInput = (
  _i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  const signal = (s?.signal as SignalValue) ?? Z;
  const width = (s?.width as number) ?? 4;

  return {
    outputs: new Array<SignalValue>(width).fill(signal),
    state: s,
  };
};

export const evalClockTick = (
  state: Record<string, unknown> | null,
): EvaluateResult => {
  const on = !(state?.on as boolean);

  return { outputs: [on ? O : Z], state: { on } };
};

export const evalDigitBin = (
  _i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  const digit = s?.digit as number | null | undefined;
  const zero: LogicValue[] = [Z, Z, Z, Z];

  if (
    typeof digit !== "number" ||
    !Number.isInteger(digit) ||
    digit < 0 ||
    digit > 9
  )
    return { outputs: zero, state: s };

  return {
    outputs: Array.from({ length: 4 }, (_, bit) =>
      (digit >> bit) & 1 ? O : Z,
    ),
    state: s,
  };
};

// ── Outputs ──────────────────────────────────────────────────────────────────

export const evalLed = (i: SignalValue[]): EvaluateResult => ({
  outputs: [],
  state: { on: normalizeInput(i[0]) === O },
});

export const evalBusDisplay = (i: SignalValue[]): EvaluateResult => {
  const normalized = normalizeBus(i);
  const value = normalized.reduce(
    (acc, bit, idx) => acc | (bit === O ? 1 << idx : 0),
    0,
  );

  return { outputs: [], state: { value } };
};

export const evalDisplay7 = (i: SignalValue[]): EvaluateResult => {
  const normalized = normalizeBus(i);
  const value =
    (normalized[3] === O ? 8 : 0) |
    (normalized[2] === O ? 4 : 0) |
    (normalized[1] === O ? 2 : 0) |
    (normalized[0] === O ? 1 : 0);

  return { outputs: [], state: { value } };
};

export const evalProbe = (
  inputs: SignalValue[],
  state: Record<string, unknown> | null,
  context?: { tick: number; snapshotInputs?: SignalValue[] },
): EvaluateResult => {
  const v = normalizeInput(inputs[0]) === O;
  const t = context?.tick ?? 0;

  const raw = state?.history as unknown[] | undefined;
  const prev: Array<{ v: boolean; t: number }> =
    Array.isArray(raw) &&
    raw.length > 0 &&
    typeof raw[0] === "object" &&
    raw[0] !== null
      ? (raw as Array<{ v: boolean; t: number }>)
      : [];

  const history = [...prev, { v, t }].slice(-(DEFAULT_PROBE_SAMPLES + 1));

  return { outputs: [], state: { history } };
};

// ── Sequential (with proper edge detection and control signal handling) ──────

export const evalSrLatch = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = Boolean(s?.q);
  const S = normalizeInput(i[0]);
  const R = normalizeInput(i[1]);

  // Both unknown → output unknown
  if (S === X && R === X) {
    return { outputs: [X, X], state: { q } };
  }

  // S=1, R=0 → Set
  if (S === O && R === Z) q = true;
  // S=0, R=1 → Reset
  else if (S === Z && R === O) q = false;
  // S=1, R=1 → Invalid (hold)
  // S=0, R=0 → Hold
  // Any X on one input while other is definitive → output uncertain
  else if (S === X || R === X) {
    return { outputs: [X, X], state: { q } };
  }

  return { outputs: [q ? O : Z, q ? Z : O], state: { q } };
};

export const evalDff = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = Boolean(s?.q);
  const clk = i[1];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  // Rising edge: requires definitive ZERO→ONE transition
  // X or Z on clock does NOT trigger — prevents spurious clocking
  if (isRisingEdge(clk, prevClk)) {
    q = asBool(normalizeInput(i[0]));
  }

  return {
    outputs: [q ? O : Z, q ? Z : O],
    state: { q, prevClk: clk },
  };
};

export const evalJkff = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  const clk = i[2];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;
  let q = Boolean(s?.q);

  // Rising edge: requires definitive ZERO→ONE transition
  if (isRisingEdge(clk, prevClk)) {
    const J = asBool(normalizeInput(i[0]));
    const K = asBool(normalizeInput(i[1]));

    if (J && !K) q = true;
    else if (!J && K) q = false;
    else if (J && K) q = !q;
  }

  return {
    outputs: [q ? O : Z, q ? Z : O],
    state: { q, prevClk: clk },
  };
};

export const evalTiff = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = Boolean(s?.q);
  const clk = i[1];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  // Rising edge with T asserted
  if (isRisingEdge(clk, prevClk) && asBool(normalizeInput(i[0]))) q = !q;

  return {
    outputs: [q ? O : Z, q ? Z : O],
    state: { q, prevClk: clk },
  };
};

export const evalDlatch = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = Boolean(s?.q);

  // Transparent only when enable is definitively ONE
  if (isAsserted(i[1])) q = asBool(normalizeInput(i[0]));

  return { outputs: [q ? O : Z, q ? Z : O], state: { q } };
};

export const evalReg4 = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = (s?.q as number) ?? 0;
  const clk = i[4];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  if (isRisingEdge(clk, prevClk)) {
    q =
      (asBool(normalizeInput(i[3])) ? 8 : 0) |
      (asBool(normalizeInput(i[2])) ? 4 : 0) |
      (asBool(normalizeInput(i[1])) ? 2 : 0) |
      (asBool(normalizeInput(i[0])) ? 1 : 0);
  }

  return {
    outputs: [q & 1 ? O : Z, q & 2 ? O : Z, q & 4 ? O : Z, q & 8 ? O : Z],
    state: { q, prevClk: clk },
  };
};

export const evalCounter4 = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let count = (s?.count as number) ?? 0;
  const clk = i[0];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  // Reset takes priority; only resets on definitive assertion
  if (isAsserted(i[1])) count = 0;
  else if (isRisingEdge(clk, prevClk)) count = (count + 1) & 0xf;

  return {
    outputs: [
      count & 1 ? O : Z,
      count & 2 ? O : Z,
      count & 4 ? O : Z,
      count & 8 ? O : Z,
    ],
    state: { count, prevClk: clk },
  };
};

export const evalShreg4 = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let bits = (s?.bits as number) ?? 0;
  const clk = i[1];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  // Reset takes priority
  if (isAsserted(i[2])) bits = 0;
  else if (isRisingEdge(clk, prevClk))
    bits = ((bits << 1) | (asBool(normalizeInput(i[0])) ? 1 : 0)) & 0xf;

  return {
    outputs: [
      bits & 1 ? O : Z,
      bits & 2 ? O : Z,
      bits & 4 ? O : Z,
      bits & 8 ? O : Z,
    ],
    state: { bits, prevClk: clk },
  };
};

// ── Arithmetic (with input normalization) ────────────────────────────────────

export const evalHalfAdder = (i: SignalValue[]): EvaluateResult => {
  const a = normalizeInput(i[0]);
  const b = normalizeInput(i[1]);

  return {
    outputs: [XOR_TABLE[a][b], AND_TABLE[a][b]],
    state: null,
  };
};

export const evalFullAdder = (i: SignalValue[]): EvaluateResult => {
  const A = normalizeInput(i[0]);
  const B = normalizeInput(i[1]);
  const Cin = normalizeInput(i[2]);
  const axorb = XOR_TABLE[A][B];
  const s = XOR_TABLE[axorb][Cin];
  const aandb = AND_TABLE[A][B];
  const cinAndAxorb = AND_TABLE[Cin][axorb];
  const co = OR_TABLE[aandb][cinAndAxorb];

  return { outputs: [s, co], state: null };
};

export const evalMux2 = (i: SignalValue[]): EvaluateResult => {
  const sel = normalizeInput(i[2]);
  const d0 = normalizeInput(i[0]);
  const d1 = normalizeInput(i[1]);

  if (sel === Z) return { outputs: [BUFFER_TABLE[d0]], state: null };
  if (sel === O) return { outputs: [BUFFER_TABLE[d1]], state: null };
  // Select is unknown — output is unknown unless both data inputs agree
  if (d0 === d1 && (d0 === Z || d0 === O))
    return { outputs: [d0], state: null };

  return { outputs: [X], state: null };
};

export const evalMux4 = (i: SignalValue[]): EvaluateResult => {
  const s0 = normalizeInput(i[4]);
  const s1 = normalizeInput(i[5]);

  if (s0 === X || s1 === X) return { outputs: [X], state: null };

  const sel = (s1 === O ? 2 : 0) | (s0 === O ? 1 : 0);

  return { outputs: [BUFFER_TABLE[normalizeInput(i[sel])]], state: null };
};

export const evalDemux2 = (i: SignalValue[]): EvaluateResult => {
  const data = normalizeInput(i[0]);
  const sel = normalizeInput(i[1]);

  if (sel === X) return { outputs: [X, X], state: null };
  if (sel === Z) return { outputs: [BUFFER_TABLE[data], Z], state: null };

  return { outputs: [Z, BUFFER_TABLE[data]], state: null };
};

export const evalDecoder2 = (i: SignalValue[]): EvaluateResult => {
  const a = normalizeInput(i[0]);
  const bv = normalizeInput(i[1]);

  if (a === X || bv === X) return { outputs: [X, X, X, X], state: null };

  const idx = (bv === O ? 2 : 0) | (a === O ? 1 : 0);

  return {
    outputs: [
      idx === 0 ? O : Z,
      idx === 1 ? O : Z,
      idx === 2 ? O : Z,
      idx === 3 ? O : Z,
    ],
    state: null,
  };
};

export const evalEncoder4 = (i: SignalValue[]): EvaluateResult => {
  const normalized = normalizeInputs(i);
  let idx = 0;

  for (let j = 3; j >= 0; j -= 1) {
    if (normalized[j] === O) {
      idx = j;
      break;
    }
  }

  return {
    outputs: [idx & 1 ? O : Z, idx & 2 ? O : Z],
    state: null,
  };
};

export const evalComparator = (i: SignalValue[]): EvaluateResult => {
  const a = normalizeInput(i[0]);
  const bv = normalizeInput(i[1]);

  if (a === X || bv === X) return { outputs: [X, X, X], state: null };

  const av = a === O ? 1 : 0;
  const bvn = bv === O ? 1 : 0;

  return {
    outputs: [av < bvn ? O : Z, av === bvn ? O : Z, av > bvn ? O : Z],
    state: null,
  };
};

export const evalDecoder3 = (i: SignalValue[]): EvaluateResult => {
  const normalized = normalizeInputs(i.slice(0, 3));

  if (normalized[0] === X || normalized[1] === X || normalized[2] === X)
    return { outputs: [X, X, X, X, X, X, X, X], state: null };

  const idx =
    (normalized[2] === O ? 4 : 0) |
    (normalized[1] === O ? 2 : 0) |
    (normalized[0] === O ? 1 : 0);

  return {
    outputs: [0, 1, 2, 3, 4, 5, 6, 7].map((j) => (idx === j ? O : Z)),
    state: null,
  };
};

export const evalMux8 = (i: SignalValue[]): EvaluateResult => {
  const s0 = normalizeInput(i[8]);
  const s1 = normalizeInput(i[9]);
  const s2 = normalizeInput(i[10]);

  if (s0 === X || s1 === X || s2 === X) return { outputs: [X], state: null };

  const sel = (s2 === O ? 4 : 0) | (s1 === O ? 2 : 0) | (s0 === O ? 1 : 0);

  return { outputs: [BUFFER_TABLE[normalizeInput(i[sel])]], state: null };
};

export const evalHalfSub = (i: SignalValue[]): EvaluateResult => {
  const A = normalizeInput(i[0]);
  const B = normalizeInput(i[1]);
  const D = XOR_TABLE[A][B];
  const notA = NOT_TABLE[A];
  const Bo = AND_TABLE[notA][B];

  return { outputs: [D, Bo], state: null };
};

export const evalFullSub = (i: SignalValue[]): EvaluateResult => {
  const A = normalizeInput(i[0]);
  const B = normalizeInput(i[1]);
  const Bin = normalizeInput(i[2]);
  const axorb = XOR_TABLE[A][B];
  const D = XOR_TABLE[axorb][Bin];
  const notA = NOT_TABLE[A];
  const t1 = AND_TABLE[notA][B];
  const t2 = AND_TABLE[notA][Bin];
  const t3 = AND_TABLE[B][Bin];
  const Bo = OR_TABLE[OR_TABLE[t1][t2]][t3];

  return { outputs: [D, Bo], state: null };
};

export const evalCmp4 = (i: SignalValue[]): EvaluateResult => {
  const normalized = normalizeBus(i.slice(0, 8));

  for (let k = 0; k < 8; k += 1) {
    if (normalized[k] === X) return { outputs: [X, X, X], state: null };
  }

  const a =
    (normalized[3] === O ? 8 : 0) |
    (normalized[2] === O ? 4 : 0) |
    (normalized[1] === O ? 2 : 0) |
    (normalized[0] === O ? 1 : 0);
  const bv =
    (normalized[7] === O ? 8 : 0) |
    (normalized[6] === O ? 4 : 0) |
    (normalized[5] === O ? 2 : 0) |
    (normalized[4] === O ? 1 : 0);

  return {
    outputs: [a < bv ? O : Z, a === bv ? O : Z, a > bv ? O : Z],
    state: null,
  };
};

// ── Utility ──────────────────────────────────────────────────────────────────

export const evalSplitter = (i: SignalValue[]): EvaluateResult => {
  const v = BUFFER_TABLE[i[0]];

  return { outputs: [v, v, v, v], state: null };
};

export const evalComment = (): EvaluateResult => ({
  outputs: [],
  state: null,
});

export const evalPassthrough = (inputs: SignalValue[]): EvaluateResult => ({
  outputs: inputs.slice(),
  state: null,
});

export const evalUreg4 = (
  inputs: SignalValue[],
  state: Record<string, unknown> | null,
): EvaluateResult => {
  const we = isAsserted(inputs[4]);

  if (we) {
    const normalized = normalizeBus(inputs.slice(0, 4));
    const val = normalized.reduce(
      (acc: number, bit, idx) => (bit === O ? acc | (1 << idx) : acc),
      0,
    );

    return { outputs: normalized.slice(), state: { val } };
  }

  const val = (state?.val as number) ?? 0;
  const outputs: LogicValue[] = Array.from({ length: 4 }, (_, idx) =>
    (val >> idx) & 1 ? O : Z,
  );

  return { outputs, state };
};

export const evalUreg8 = (
  inputs: SignalValue[],
  state: Record<string, unknown> | null,
): EvaluateResult => {
  const we = isAsserted(inputs[8]);

  if (we) {
    const normalized = normalizeBus(inputs.slice(0, 8));
    const val = normalized.reduce(
      (acc: number, bit, idx) => (bit === O ? acc | (1 << idx) : acc),
      0,
    );

    return { outputs: normalized.slice(), state: { val } };
  }

  const val = (state?.val as number) ?? 0;
  const outputs: LogicValue[] = Array.from({ length: 8 }, (_, idx) =>
    (val >> idx) & 1 ? O : Z,
  );

  return { outputs, state };
};
