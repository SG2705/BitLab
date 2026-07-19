/* eslint-disable no-bitwise */
/**
 * logic.ts — Component evaluation functions and four-state logic utilities.
 *
 * All evaluate() logic from DEFINITIONS lives here as named exports.
 * ComponentLibrary references these by name in each definition.
 *
 * Provides:
 *   - LogicValue truth tables for all primitive gates
 *   - Signal resolution for multi-driver nets
 *   - Conversion helpers between LogicValue and boolean
 *   - All component evaluate functions using four-state logic
 */

import { DEFAULT_PROBE_SAMPLES } from "./constants";
import { type EvaluateResult, LogicValue, type SignalValue } from "./types";

const { ZERO, ONE, UNKNOWN, HIGH_IMPEDANCE } = LogicValue;

const Z = ZERO;
const O = ONE;
const U = UNKNOWN;
const H = HIGH_IMPEDANCE;

// ══════════════════════════════════════════════════════════════════════════════
// FOUR-STATE LOGIC UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

// ── Conversion helpers ───────────────────────────────────────────────────────

export const fromBool = (v: boolean): LogicValue => (v ? O : Z);
export const toBool = (v: LogicValue): boolean => v === O;
export const isHigh = (v: LogicValue): boolean => v === O;
export const isLow = (v: LogicValue): boolean => v === Z;

// ── Truth tables ─────────────────────────────────────────────────────────────
// Indexed as TABLE[a][b] where a,b ∈ {Z=0, O=1, U=2, H=3}

export const AND_TABLE: LogicValue[][] = [
  /*        Z  O  X  Z    */
  /* Z  */ [Z, Z, Z, Z],
  /* O  */ [Z, O, U, U],
  /* X  */ [Z, U, U, U],
  /* Z  */ [Z, U, U, U],
];

export const OR_TABLE: LogicValue[][] = [
  /*        Z  O  X  Z    */
  /* Z  */ [Z, O, U, U],
  /* O  */ [O, O, O, O],
  /* X  */ [U, O, U, U],
  /* Z  */ [U, O, U, U],
];

export const XOR_TABLE: LogicValue[][] = [
  /*        Z  O  X  Z    */
  /* Z  */ [Z, O, U, U],
  /* O  */ [O, Z, U, U],
  /* X  */ [U, U, U, U],
  /* Z  */ [U, U, U, U],
];

export const NOT_TABLE: LogicValue[] = [O, Z, U, U];

export const BUFFER_TABLE: LogicValue[] = [Z, O, U, H];

// Derived tables (computed from primitives for correctness)
export const NAND_TABLE: LogicValue[][] = AND_TABLE.map((row) =>
  row.map((v) => NOT_TABLE[v]),
);

export const NOR_TABLE: LogicValue[][] = OR_TABLE.map((row) =>
  row.map((v) => NOT_TABLE[v]),
);

export const XNOR_TABLE: LogicValue[][] = XOR_TABLE.map((row) =>
  row.map((v) => NOT_TABLE[v]),
);

// ── Multi-input gate helpers ─────────────────────────────────────────────────

/** Fold a list of inputs through a 2-input truth table (left to right). */
const foldTable = (
  table: LogicValue[][],
  inputs: SignalValue[],
): LogicValue => {
  if (inputs.length === 0) return U;
  let result = inputs[0];

  for (let i = 1; i < inputs.length; i += 1) result = table[result][inputs[i]];

  return result;
};

// ── Signal resolution ────────────────────────────────────────────────────────

export const resolveSignal = (drivers: LogicValue[]): LogicValue => {
  let resolved: LogicValue | null = null;

  for (const d of drivers) {
    if (d === H) continue;

    if (resolved === null) resolved = d;
    else if (resolved !== d) return U;
  }

  return resolved ?? H;
};

export const migrateSignal = (v: unknown): LogicValue => {
  if (typeof v === "boolean") return v ? O : Z;
  if (typeof v === "number" && v >= 0 && v <= 3) return v;

  return U;
};

// ── Internal helper: interpret a SignalValue as a boolean for sequential logic ─
// Used by sequential components for edge detection and state transitions.
// Treats U and H as logic low (conservative).
const asBool = (v: SignalValue): boolean => v === O;

// ══════════════════════════════════════════════════════════════════════════════
// EVALUATE FUNCTIONS — extracted from ComponentLibrary DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

// ── Logic Gates ──────────────────────────────────────────────────────────────

export const evalGateAnd = (i: SignalValue[]): EvaluateResult => ({
  outputs: [foldTable(AND_TABLE, i)],
  state: null,
});

export const evalGateOr = (i: SignalValue[]): EvaluateResult => ({
  outputs: [foldTable(OR_TABLE, i)],
  state: null,
});

export const evalGateXor = (i: SignalValue[]): EvaluateResult => ({
  outputs: [foldTable(XOR_TABLE, i)],
  state: null,
});

export const evalGateXnor = (i: SignalValue[]): EvaluateResult => ({
  outputs: [foldTable(XNOR_TABLE, i)],
  state: null,
});

export const evalGateNand = (i: SignalValue[]): EvaluateResult => ({
  outputs: [foldTable(NAND_TABLE, i)],
  state: null,
});

export const evalGateNor = (i: SignalValue[]): EvaluateResult => ({
  outputs: [foldTable(NOR_TABLE, i)],
  state: null,
});

export const evalGateNot = (i: SignalValue[]): EvaluateResult => ({
  outputs: [NOT_TABLE[i[0]]],
  state: null,
});

export const evalGateBuffer = (i: SignalValue[]): EvaluateResult => ({
  outputs: [BUFFER_TABLE[i[0]]],
  state: null,
});

// ── Bus Logic Gates ─────────────────────────────────────────────────────────

/** Bus AND: inputs [A0..An-1, B0..Bn-1], outputs [Y0..Yn-1] where Yi = AND(Ai, Bi) */
export const evalBusAnd = (i: SignalValue[]): EvaluateResult => {
  const width = i.length / 2;

  return {
    outputs: Array.from(
      { length: width },
      (_, idx) => AND_TABLE[i[idx]][i[idx + width]],
    ),
    state: null,
  };
};

/** Bus OR: inputs [A0..An-1, B0..Bn-1], outputs [Y0..Yn-1] where Yi = OR(Ai, Bi) */
export const evalBusOr = (i: SignalValue[]): EvaluateResult => {
  const width = i.length / 2;

  return {
    outputs: Array.from(
      { length: width },
      (_, idx) => OR_TABLE[i[idx]][i[idx + width]],
    ),
    state: null,
  };
};

/** Bus NOT: inputs [A0..An-1], outputs [Y0..Yn-1] where Yi = NOT(Ai) */
export const evalBusNot = (i: SignalValue[]): EvaluateResult => ({
  outputs: i.map((v) => NOT_TABLE[v]),
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
  state: { on: i[0] === O },
});

export const evalBusDisplay = (i: SignalValue[]): EvaluateResult => {
  const value = i.reduce(
    (acc, bit, idx) => acc | (bit === O ? 1 << idx : 0),
    0,
  );

  return { outputs: [], state: { value } };
};

export const evalDisplay7 = (i: SignalValue[]): EvaluateResult => {
  const value =
    (i[3] === O ? 8 : 0) |
    (i[2] === O ? 4 : 0) |
    (i[1] === O ? 2 : 0) |
    (i[0] === O ? 1 : 0);

  return { outputs: [], state: { value } };
};

export const evalProbe = (
  inputs: SignalValue[],
  state: Record<string, unknown> | null,
  context?: { tick: number; snapshotInputs?: SignalValue[] },
): EvaluateResult => {
  const v = inputs[0] === O;
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

// ── Sequential ───────────────────────────────────────────────────────────────

export const evalSrLatch = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = Boolean(s?.q);
  const S = i[0];
  const R = i[1];

  // If both inputs are UNKNOWN/Hi-Z, output is UNKNOWN
  if ((S === U || S === H) && (R === U || R === H)) {
    return { outputs: [U, U], state: { q } };
  }

  if (S === O && R !== O) q = true;
  else if (S !== O && R === O) q = false;
  // S=1 R=1 is invalid; hold. S=0 R=0 hold.

  return { outputs: [q ? O : Z, q ? Z : O], state: { q } };
};

export const evalDff = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = Boolean(s?.q);
  const clk = i[1];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  // Rising edge: previous was definitively ZERO, now is definitively ONE
  if (clk === O && prevClk === Z) {
    q = asBool(i[0]);
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

  // Rising edge: previous was definitively ZERO, now is definitively ONE
  if (clk === O && prevClk === Z) {
    const J = asBool(i[0]);
    const K = asBool(i[1]);

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

  // Rising edge: previous was definitively ZERO, now is definitively ONE
  if (clk === O && prevClk === Z && asBool(i[0])) q = !q;

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

  // Transparent when enable is definitively ONE
  if (i[1] === O) q = asBool(i[0]);

  return { outputs: [q ? O : Z, q ? Z : O], state: { q } };
};

export const evalReg4 = (
  i: SignalValue[],
  s: Record<string, unknown> | null,
): EvaluateResult => {
  let q = (s?.q as number) ?? 0;
  const clk = i[4];
  const prevClk = (s?.prevClk as SignalValue) ?? Z;

  // Rising edge: previous was definitively ZERO, now is definitively ONE
  if (clk === O && prevClk === Z) {
    q =
      (asBool(i[3]) ? 8 : 0) |
      (asBool(i[2]) ? 4 : 0) |
      (asBool(i[1]) ? 2 : 0) |
      (asBool(i[0]) ? 1 : 0);
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

  if (asBool(i[1])) count = 0;
  else if (clk === O && prevClk === Z) count = (count + 1) & 0xf;

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

  if (asBool(i[2])) bits = 0;
  else if (clk === O && prevClk === Z)
    bits = ((bits << 1) | (asBool(i[0]) ? 1 : 0)) & 0xf;

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

// ── Arithmetic ───────────────────────────────────────────────────────────────

export const evalHalfAdder = (i: SignalValue[]): EvaluateResult => ({
  outputs: [XOR_TABLE[i[0]][i[1]], AND_TABLE[i[0]][i[1]]],
  state: null,
});

export const evalFullAdder = (i: SignalValue[]): EvaluateResult => {
  // S = A ⊕ B ⊕ Cin, Co = (A·B) | (Cin·(A⊕B))
  const axorb = XOR_TABLE[i[0]][i[1]];
  const s = XOR_TABLE[axorb][i[2]];
  const aandb = AND_TABLE[i[0]][i[1]];
  const cinAndAxorb = AND_TABLE[i[2]][axorb];
  const co = OR_TABLE[aandb][cinAndAxorb];

  return { outputs: [s, co], state: null };
};

export const evalMux2 = (i: SignalValue[]): EvaluateResult => {
  // Y = S ? D1 : D0
  const sel = i[2];

  if (sel === Z) return { outputs: [BUFFER_TABLE[i[0]]], state: null };
  if (sel === O) return { outputs: [BUFFER_TABLE[i[1]]], state: null };
  // If select is unknown, output is unknown unless both data inputs agree
  if (i[0] === i[1] && (i[0] === Z || i[0] === O))
    return { outputs: [i[0]], state: null };

  return { outputs: [U], state: null };
};

export const evalMux4 = (i: SignalValue[]): EvaluateResult => {
  // inputs: D0..D3 (0-3), S0 (4), S1 (5)
  const s0 = i[4];
  const s1 = i[5];

  if (s0 === U || s0 === H || s1 === U || s1 === H)
    return { outputs: [U], state: null };

  const sel = (s1 === O ? 2 : 0) | (s0 === O ? 1 : 0);

  return { outputs: [BUFFER_TABLE[i[sel]]], state: null };
};

export const evalDemux2 = (i: SignalValue[]): EvaluateResult => {
  const data = i[0];
  const sel = i[1];

  if (sel === U || sel === H) return { outputs: [U, U], state: null };
  if (sel === Z) return { outputs: [BUFFER_TABLE[data], Z], state: null };

  return { outputs: [Z, BUFFER_TABLE[data]], state: null };
};

export const evalDecoder2 = (i: SignalValue[]): EvaluateResult => {
  const a = i[0];
  const bv = i[1];

  if (a === U || a === H || bv === U || bv === H)
    return { outputs: [U, U, U, U], state: null };

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
  let idx = 0;

  for (let j = 3; j >= 0; j -= 1) {
    if (i[j] === O) {
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
  const a = i[0];
  const bv = i[1];

  if (a === U || a === H || bv === U || bv === H)
    return { outputs: [U, U, U], state: null };

  const av = a === O ? 1 : 0;
  const bvn = bv === O ? 1 : 0;

  return {
    outputs: [av < bvn ? O : Z, av === bvn ? O : Z, av > bvn ? O : Z],
    state: null,
  };
};

export const evalDecoder3 = (i: SignalValue[]): EvaluateResult => {
  if (
    i[0] === U ||
    i[0] === H ||
    i[1] === U ||
    i[1] === H ||
    i[2] === U ||
    i[2] === H
  )
    return {
      outputs: [U, U, U, U, U, U, U, U],
      state: null,
    };

  const idx =
    (i[2] === O ? 4 : 0) | (i[1] === O ? 2 : 0) | (i[0] === O ? 1 : 0);

  return {
    outputs: [0, 1, 2, 3, 4, 5, 6, 7].map((j) => (idx === j ? O : Z)),
    state: null,
  };
};

export const evalMux8 = (i: SignalValue[]): EvaluateResult => {
  // inputs: D0..D7 (0-7), S0 (8), S1 (9), S2 (10)
  const s0 = i[8];
  const s1 = i[9];
  const s2 = i[10];

  if (s0 === U || s0 === H || s1 === U || s1 === H || s2 === U || s2 === H)
    return { outputs: [U], state: null };

  const sel = (s2 === O ? 4 : 0) | (s1 === O ? 2 : 0) | (s0 === O ? 1 : 0);

  return { outputs: [BUFFER_TABLE[i[sel]]], state: null };
};

export const evalHalfSub = (i: SignalValue[]): EvaluateResult => {
  // D = A ⊕ B, Bo = !A & B
  const D = XOR_TABLE[i[0]][i[1]];
  const notA = NOT_TABLE[i[0]];
  const Bo = AND_TABLE[notA][i[1]];

  return { outputs: [D, Bo], state: null };
};

export const evalFullSub = (i: SignalValue[]): EvaluateResult => {
  // D = (A ⊕ B) ⊕ Bin
  // Bo = (!A & B) | (!A & Bin) | (B & Bin)
  const A = i[0];
  const B = i[1];
  const Bin = i[2];
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
  // Check if any input is unknown/high-z
  for (let k = 0; k < 8; k += 1) {
    if (i[k] === U || i[k] === H) return { outputs: [U, U, U], state: null };
  }

  const a =
    (i[3] === O ? 8 : 0) |
    (i[2] === O ? 4 : 0) |
    (i[1] === O ? 2 : 0) |
    (i[0] === O ? 1 : 0);
  const bv =
    (i[7] === O ? 8 : 0) |
    (i[6] === O ? 4 : 0) |
    (i[5] === O ? 2 : 0) |
    (i[4] === O ? 1 : 0);

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
  const we = inputs[4] === O;

  if (we) {
    const data = inputs.slice(0, 4);
    const val = data.reduce(
      (acc: number, bit, idx) => (bit === O ? acc | (1 << idx) : acc),
      0,
    );

    return { outputs: data.slice(), state: { val } };
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
  const we = inputs[8] === O;

  if (we) {
    const data = inputs.slice(0, 8);
    const val = data.reduce(
      (acc: number, bit, idx) => (bit === O ? acc | (1 << idx) : acc),
      0,
    );

    return { outputs: data.slice(), state: { val } };
  }

  const val = (state?.val as number) ?? 0;
  const outputs: LogicValue[] = Array.from({ length: 8 }, (_, idx) =>
    (val >> idx) & 1 ? O : Z,
  );

  return { outputs, state };
};
