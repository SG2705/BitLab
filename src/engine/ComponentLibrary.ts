/* eslint-disable no-bitwise */
/**
 * ComponentLibrary — authoritative registry of all component definitions.
 *
 * Each definition is a pure description: no mutable state, no side effects.
 * The evaluate() function is a pure function of (inputs, state) → (outputs, state).
 * The tick() function (clock-only) is a pure function of (state, dt) → (outputs, state).
 */
import { v4 as uuidv4 } from "uuid";

import {
  DEFAULT_PROBE_SAMPLES,
  GATE_CATEGORY_ARITHMETIC,
  GATE_CATEGORY_CUSTOM,
  GATE_CATEGORY_INPUT,
  GATE_CATEGORY_LOGIC,
  GATE_CATEGORY_OUTPUT,
  GATE_CATEGORY_SEQUENTIAL,
  GATE_CATEGORY_UTILITY,
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
  KEY_SEPARATOR,
  LB_MAP,
  PINC0,
  PINC1,
  PINC2,
  PINC3,
  PINC4,
  PINC5,
  PINC6,
  PINC8,
  PINC9,
  PINC11,
  PINC16,
} from "./constants";
import type {
  CircuitSnapshot,
  ComponentDefinition,
  EvaluateResult,
  SignalValue,
} from "./types";
import { getHeightForPinCount } from "./utils";

export interface CustomGateMeta {
  type: string;
  name: string;
  inputLabels: string[];
  outputLabels: string[];
  circuit: CircuitSnapshot;
}

const b = (v: unknown): boolean => Boolean(v);

// ── Helpers ───────────────────────────────────────────────────────────────────

const H_OVERRIDES = [GATE_TYPE_PROBE];

const hw = (c: ComponentDefinition): ComponentDefinition => {
  return {
    ...c,
    label: LB_MAP[c.type],
    height: H_OVERRIDES.includes(c.type)
      ? c.height
      : getHeightForPinCount(Math.max(c.inputs, c.outputs)),
  };
};

type CbFields = Omit<
  ComponentDefinition,
  "isSequential" | "isClock" | "isInput" | "isOutput" | "initialState"
> & {
  evaluate: (inputs: SignalValue[], state: null) => EvaluateResult;
};

const cb = (fields: CbFields): ComponentDefinition =>
  hw({
    ...fields,
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => null,
  });

// ── Definition table ──────────────────────────────────────────────────────────

const DEFINITIONS: ComponentDefinition[] = [
  // ── Logic Gates ─────────────────────────────────────────────────────────────
  cb({
    type: GATE_TYPE_AND,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 80,
    height: 60,
    symbol: "&",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_OR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 80,
    height: 60,
    symbol: "≥1",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_XOR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 80,
    height: 60,
    symbol: "=1",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: (i) => ({
      outputs: [i.reduce((a: boolean, v) => a !== b(v), false)],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_XNOR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 80,
    height: 60,
    symbol: "=",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: (i) => ({
      outputs: [!i.reduce((a: boolean, v) => a !== b(v), false)],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_NAND,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 80,
    height: 60,
    symbol: "&̄",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [!i.every(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_NOR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 80,
    height: 60,
    symbol: "≥1̄",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [!i.some(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_NOT,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC1,
    outputs: PINC1,
    width: 80,
    height: 50,
    symbol: "!",
    inputLabels: ["A"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [!b(i[0])], state: null }),
  }),
  cb({
    type: GATE_TYPE_BUFFER,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC1,
    outputs: PINC1,
    width: 80,
    height: 50,
    symbol: "1",
    inputLabels: ["A"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [b(i[0])], state: null }),
  }),
  cb({
    type: GATE_TYPE_AND3,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC3,
    outputs: PINC1,
    width: 80,
    height: 70,
    symbol: "&3",
    inputLabels: ["A", "B", "C"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_OR3,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC3,
    outputs: PINC1,
    width: 80,
    height: 70,
    symbol: "≥1·3",
    inputLabels: ["A", "B", "C"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  }),

  // ── Inputs ───────────────────────────────────────────────────────────────────
  hw({
    type: GATE_TYPE_TOGGLE,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC1,
    width: 50,
    height: 50,
    symbol: "T",
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [Boolean(s?.on)], state: s }),
  }),
  hw({
    type: GATE_TYPE_BUTTON,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC1,
    width: 50,
    height: 50,
    symbol: "B",
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [Boolean(s?.on)], state: s }),
  }),
  hw({
    type: GATE_TYPE_CONST,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC1,
    width: 50,
    height: 40,
    symbol: "1",
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ on: true }),
    evaluate: (_i, s) => ({ outputs: [Boolean(s?.on)], state: s }),
  }),
  hw({
    type: GATE_TYPE_CLOCK,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC1,
    width: 50,
    height: 50,
    symbol: "⏲",
    isSequential: false,
    isClock: true,
    isInput: false,
    isOutput: false,
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [Boolean(s?.on)], state: s }),
    tick(state) {
      const on = !(state?.on as boolean);

      return { outputs: [on], state: { on } };
    },
  }),

  // ── Digit→Binary input ───────────────────────────────────────────────────────
  hw({
    type: GATE_TYPE_DIGIT_BIN,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC4,
    width: 80,
    height: 80,
    outputLabels: ["B3", "B2", "B1", "B0"],
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ digit: 0 }),
    evaluate: (_i, s) => {
      const digit = s?.digit as number | null | undefined;
      const zero: boolean[] = Array<boolean>(4).fill(false);

      if (
        typeof digit !== "number" ||
        !Number.isInteger(digit) ||
        digit < 0 ||
        digit > 9
      ) {
        return { outputs: zero, state: s };
      }

      return {
        outputs: Array.from({ length: 4 }, (_, bit) =>
          Boolean((digit >> (3 - bit)) & 1),
        ),
        state: s,
      };
    },
  }),

  // ── Outputs ──────────────────────────────────────────────────────────────────
  hw({
    type: GATE_TYPE_LED,
    label: "",
    category: GATE_CATEGORY_OUTPUT,
    inputs: PINC1,
    outputs: PINC0,
    width: 50,
    height: 50,
    symbol: "◉",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    initialState: () => ({ on: false }),
    evaluate: (i) => ({ outputs: [], state: { on: b(i[0]) } }),
  }),
  hw({
    type: GATE_TYPE_DISPLAY7,
    label: "",
    category: GATE_CATEGORY_OUTPUT,
    inputs: PINC4,
    outputs: PINC0,
    width: 80,
    height: 90,
    symbol: "7",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    inputLabels: ["D0", "D1", "D2", "D3"],
    initialState: () => ({ value: 0 }),
    evaluate: (i) => {
      const value =
        (b(i[3]) ? 8 : 0) |
        (b(i[2]) ? 4 : 0) |
        (b(i[1]) ? 2 : 0) |
        (b(i[0]) ? 1 : 0);

      return { outputs: [], state: { value } };
    },
  }),
  hw({
    type: GATE_TYPE_PROBE,
    label: "",
    category: GATE_CATEGORY_OUTPUT,
    inputs: PINC1,
    outputs: PINC0,
    width: 120,
    height: 70,
    inputLabels: ["IN"],
    // A probe records the signal that has settled in the current pass. It is
    // stateful history, not edge-triggered storage.
    isSequential: false,
    samplesEveryTick: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({
      history: [] as Array<{ v: boolean; t: number }>,
    }),
    evaluate: (inputs, state, context) => {
      const v = Boolean(inputs[0]);
      const t = context?.tick ?? 0;

      // Migrate from old boolean[] format gracefully
      const raw = state?.history as unknown[] | undefined;
      const prev: Array<{ v: boolean; t: number }> =
        Array.isArray(raw) &&
        raw.length > 0 &&
        typeof raw[0] === "object" &&
        raw[0] !== null
          ? (raw as Array<{ v: boolean; t: number }>)
          : [];

      // Keep one extra entry beyond the visible window so the renderer can
      // always look up the signal value at the window's left edge.
      const history = [...prev, { v, t }].slice(-(DEFAULT_PROBE_SAMPLES + 1));

      return { outputs: [], state: { history } };
    },
  }),

  // ── Sequential ────────────────────────────────────────────────────────────────
  hw({
    type: GATE_TYPE_SR_LATCH,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "SR",
    // An SR latch is stateful but level-sensitive: it must observe inputs
    // settled during this propagation pass, rather than the pre-pass snapshot
    // reserved for edge-triggered storage.
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["S", "R"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false }),
    evaluate: (i, s) => {
      let q = Boolean(s?.q);
      const S = b(i[0]);
      const R = b(i[1]);

      if (S && !R) {
        q = true;
      } else if (!S && R) {
        q = false;
      }

      // S=1 R=1 is an invalid state; hold
      return { outputs: [q, !q], state: { q } };
    },
  }),
  hw({
    type: GATE_TYPE_DFF,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "D",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["D", "CLK"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      let q = Boolean(s?.q);
      const clk = b(i[1]);

      // Sample D on rising clock edge
      if (clk && !s?.prevClk) {
        q = b(i[0]);
      }

      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  }),
  hw({
    type: GATE_TYPE_JKFF,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC3,
    outputs: PINC2,
    width: 80,
    height: 80,
    symbol: "JK",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["J", "K", "CLK"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      const clk = b(i[2]);
      let q = Boolean(s?.q);

      if (clk && !s?.prevClk) {
        const J = b(i[0]);
        const K = b(i[1]);

        if (J && !K) {
          q = true;
        } else if (!J && K) {
          q = false;
        } else if (J && K) {
          q = !q; // toggle
        }
      }

      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  }),
  hw({
    type: GATE_TYPE_TIFF,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "T",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["T", "CLK"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      let q = Boolean(s?.q);
      const clk = b(i[1]);

      if (clk && !s?.prevClk && b(i[0])) {
        q = !q;
      }

      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  }),

  hw({
    type: GATE_TYPE_DLATCH,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "DL",
    // A D latch is transparent while E is high, so it must read live inputs.
    // Only edge-triggered storage uses the pre-pass input snapshot.
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["D", "E"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false }),
    evaluate: (i, s) => {
      let q = Boolean(s?.q);

      if (b(i[1])) q = b(i[0]);

      return { outputs: [q, !q], state: { q } };
    },
  }),
  hw({
    type: GATE_TYPE_REG4,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC5,
    outputs: PINC4,
    width: 80,
    height: 100,
    symbol: "REG",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["D0", "D1", "D2", "D3", "CLK"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3"],
    initialState: () => ({ q: 0, prevClk: false }),
    evaluate: (i, s) => {
      let q = (s?.q as number) ?? 0;
      const clk = b(i[4]);

      if (clk && !s?.prevClk) {
        q =
          (b(i[3]) ? 8 : 0) |
          (b(i[2]) ? 4 : 0) |
          (b(i[1]) ? 2 : 0) |
          (b(i[0]) ? 1 : 0);
      }

      return {
        outputs: [
          Boolean(q & 1),
          Boolean(q & 2),
          Boolean(q & 4),
          Boolean(q & 8),
        ],
        state: { q, prevClk: clk },
      };
    },
  }),
  hw({
    type: GATE_TYPE_COUNTER4,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC2,
    outputs: PINC4,
    width: 80,
    height: 90,
    symbol: "CTR",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["CLK", "RST"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3"],
    initialState: () => ({ count: 0, prevClk: false }),
    evaluate: (i, s) => {
      let count = (s?.count as number) ?? 0;
      const clk = b(i[0]);

      if (b(i[1])) {
        count = 0;
      } else if (clk && !s?.prevClk) {
        count = (count + 1) & 0xf;
      }

      return {
        outputs: [
          Boolean(count & 1),
          Boolean(count & 2),
          Boolean(count & 4),
          Boolean(count & 8),
        ],
        state: { count, prevClk: clk },
      };
    },
  }),
  hw({
    type: GATE_TYPE_SHREG4,
    label: "",
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: PINC3,
    outputs: PINC4,
    width: 80,
    height: 90,
    symbol: "SHR",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["SI", "CLK", "RST"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3"],
    initialState: () => ({ bits: 0, prevClk: false }),
    evaluate: (i, s) => {
      let bits = (s?.bits as number) ?? 0;
      const clk = b(i[1]);

      if (b(i[2])) {
        bits = 0;
      } else if (clk && !s?.prevClk) {
        bits = ((bits << 1) | (b(i[0]) ? 1 : 0)) & 0xf;
      }

      return {
        outputs: [
          Boolean(bits & 1),
          Boolean(bits & 2),
          Boolean(bits & 4),
          Boolean(bits & 8),
        ],
        state: { bits, prevClk: clk },
      };
    },
  }),

  // ── Arithmetic ────────────────────────────────────────────────────────────────
  cb({
    type: GATE_TYPE_HALF_ADDER,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 60,
    symbol: "½+",
    inputLabels: ["A", "B"],
    outputLabels: ["S", "C"],
    evaluate: (i) => ({
      outputs: [b(i[0]) !== b(i[1]), b(i[0]) && b(i[1])],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_FULL_ADDER,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "Σ",
    inputLabels: ["A", "B", "Cin"],
    outputLabels: ["S", "Co"],
    evaluate: (i) => {
      const s = (b(i[0]) ? 1 : 0) + (b(i[1]) ? 1 : 0) + (b(i[2]) ? 1 : 0);

      return { outputs: [s % 2 === 1, s >= 2], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_MUX2,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC1,
    width: 80,
    height: 70,
    symbol: "M",
    inputLabels: ["D0", "D1", "S"],
    outputLabels: ["Y"],
    evaluate: (i) => ({ outputs: [b(i[2]) ? b(i[1]) : b(i[0])], state: null }),
  }),
  cb({
    type: GATE_TYPE_MUX4,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC6,
    outputs: PINC1,
    width: 80,
    height: 90,
    symbol: "M4",
    inputLabels: ["D0", "D1", "D2", "D3", "S0", "S1"],
    outputLabels: ["Y"],
    evaluate: (i) => {
      const sel = (b(i[5]) ? 2 : 0) | (b(i[4]) ? 1 : 0);

      return { outputs: [b(i[sel])], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_DEMUX2,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 60,
    symbol: "DM",
    inputLabels: ["D", "S"],
    outputLabels: ["Y0", "Y1"],
    evaluate: (i) => {
      const sel = b(i[1]);

      return { outputs: [!sel && b(i[0]), sel && b(i[0])], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_DECODER2,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "DEC",
    inputLabels: ["A", "B"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: (i) => {
      const idx = (b(i[1]) ? 2 : 0) | (b(i[0]) ? 1 : 0);

      return {
        outputs: [idx === 0, idx === 1, idx === 2, idx === 3],
        state: null,
      };
    },
  }),
  cb({
    type: GATE_TYPE_ENCODER4,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC4,
    outputs: PINC2,
    width: 80,
    height: 80,
    symbol: "ENC",
    inputLabels: ["D0", "D1", "D2", "D3"],
    outputLabels: ["A", "B"],
    evaluate: (i) => {
      let idx = 0;

      for (let j = 3; j >= 0; j -= 1) {
        if (b(i[j])) {
          idx = j;

          break;
        }
      }

      return { outputs: [Boolean(idx & 1), Boolean(idx & 2)], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_COMPARATOR,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC3,
    width: 80,
    height: 70,
    symbol: "CMP",
    inputLabels: ["A", "B"],
    outputLabels: ["<", "=", ">"],
    evaluate: (i) => {
      const a = b(i[0]) ? 1 : 0;
      const bv = b(i[1]) ? 1 : 0;

      return { outputs: [a < bv, a === bv, a > bv], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_DECODER3,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC8,
    width: 80,
    height: 120,
    symbol: "3:8",
    inputLabels: ["A", "B", "C"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: (i) => {
      const idx = (b(i[2]) ? 4 : 0) | (b(i[1]) ? 2 : 0) | (b(i[0]) ? 1 : 0);

      return {
        outputs: [0, 1, 2, 3, 4, 5, 6, 7].map((j) => idx === j),
        state: null,
      };
    },
  }),
  cb({
    type: GATE_TYPE_MUX8,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC11,
    outputs: PINC1,
    width: 80,
    height: 160,
    symbol: "M8",
    inputLabels: [
      "D0",
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "S0",
      "S1",
      "S2",
    ],
    outputLabels: ["Y"],
    evaluate: (i) => {
      const sel = (b(i[10]) ? 4 : 0) | (b(i[9]) ? 2 : 0) | (b(i[8]) ? 1 : 0);

      return { outputs: [b(i[sel])], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_HALF_SUB,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 60,
    symbol: "½−",
    inputLabels: ["A", "B"],
    outputLabels: ["D", "Bo"],
    evaluate: (i) => ({
      outputs: [b(i[0]) !== b(i[1]), !b(i[0]) && b(i[1])],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_FULL_SUB,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "Σ−",
    inputLabels: ["A", "B", "Bin"],
    outputLabels: ["D", "Bo"],
    evaluate: (i) => {
      const A = b(i[0]);
      const B = b(i[1]);
      const Bin = b(i[2]);
      const D = (A !== B) !== Bin;
      const Bo = (!A && B) || (!A && Bin) || (B && Bin);

      return { outputs: [D, Bo], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_CMP4,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC8,
    outputs: PINC3,
    width: 80,
    height: 120,
    symbol: "≥≤",
    inputLabels: ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3"],
    outputLabels: ["<", "=", ">"],
    evaluate: (i) => {
      const a =
        (b(i[3]) ? 8 : 0) |
        (b(i[2]) ? 4 : 0) |
        (b(i[1]) ? 2 : 0) |
        (b(i[0]) ? 1 : 0);
      const bv =
        (b(i[7]) ? 8 : 0) |
        (b(i[6]) ? 4 : 0) |
        (b(i[5]) ? 2 : 0) |
        (b(i[4]) ? 1 : 0);

      return { outputs: [a < bv, a === bv, a > bv], state: null };
    },
  }),
  // ── Utility ──────────────────────────────────────────────────────────────────
  cb({
    type: GATE_TYPE_SPLITTER,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC1,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "1:4",
    inputLabels: ["IN"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3"],
    evaluate: (i) => {
      const v = b(i[0]);

      return { outputs: [v, v, v, v], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_COMMENT,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: 0,
    outputs: 0,
    width: 120,
    height: 34,
    isAnnotation: true,
    evaluate: () => ({ outputs: [], state: null }),
  }),
  cb({
    type: GATE_TYPE_BUS4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC4,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "⇒4",
    isBusOutput: true,
    inputLabels: ["B0", "B1", "B2", "B3"],
    outputLabels: ["B0", "B1", "B2", "B3"],
    evaluate: (inputs) => ({
      outputs: inputs.slice(),
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_BUS8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC8,
    outputs: PINC8,
    width: 80,
    height: 110,
    symbol: "⇒8",
    isBusOutput: true,
    inputLabels: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    outputLabels: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    evaluate: (inputs) => ({
      outputs: inputs.slice(),
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_BUS16,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC16,
    outputs: PINC16,
    width: 80,
    height: 200,
    symbol: "⇒16",
    isBusOutput: true,
    inputLabels: [
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
      "B10",
      "B11",
      "B12",
      "B13",
      "B14",
      "B15",
    ],
    outputLabels: [
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
      "B10",
      "B11",
      "B12",
      "B13",
      "B14",
      "B15",
    ],
    evaluate: (inputs) => ({
      outputs: inputs.slice(),
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_DEBUS4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC4,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "⇐4",
    isBusInput: true,
    inputLabels: ["B0", "B1", "B2", "B3"],
    outputLabels: ["B0", "B1", "B2", "B3"],
    evaluate: (inputs) => ({
      outputs: inputs.slice(),
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_DEBUS8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC8,
    outputs: PINC8,
    width: 80,
    height: 110,
    symbol: "⇐8",
    isBusInput: true,
    inputLabels: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    outputLabels: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    evaluate: (inputs) => ({
      outputs: inputs.slice(),
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_DEBUS16,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC16,
    outputs: PINC16,
    width: 80,
    height: 200,
    symbol: "⇐16",
    isBusInput: true,
    inputLabels: [
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
      "B10",
      "B11",
      "B12",
      "B13",
      "B14",
      "B15",
    ],
    outputLabels: [
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
      "B10",
      "B11",
      "B12",
      "B13",
      "B14",
      "B15",
    ],
    evaluate: (inputs) => ({
      outputs: inputs.slice(),
      state: null,
    }),
  }),
  hw({
    type: GATE_TYPE_UREG4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC5,
    outputs: PINC4,
    width: 80,
    height: 90,
    inputLabels: ["D0", "D1", "D2", "D3", "WE"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3"],
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ val: 0 }),
    evaluate: (inputs, state) => {
      const we = Boolean(inputs[4]);

      if (we) {
        const data = inputs.slice(0, 4);
        const val = data.reduce(
          (acc: number, bit, i) => (bit ? acc | (1 << i) : acc),
          0,
        );

        return { outputs: data.slice(), state: { val } };
      }

      const val = (state?.val as number) ?? 0;
      const outputs = Array.from({ length: 4 }, (_, i) =>
        Boolean((val >> i) & 1),
      );

      return { outputs, state };
    },
  }),
  hw({
    type: GATE_TYPE_UREG8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC9,
    outputs: PINC8,
    width: 80,
    height: 130,
    inputLabels: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "WE"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"],
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ val: 0 }),
    evaluate: (inputs, state) => {
      const we = Boolean(inputs[8]);

      if (we) {
        const data = inputs.slice(0, 8);
        const val = data.reduce(
          (acc: number, bit, i) => (bit ? acc | (1 << i) : acc),
          0,
        );

        return { outputs: data.slice(), state: { val } };
      }

      const val = (state?.val as number) ?? 0;
      const outputs = Array.from({ length: 8 }, (_, i) =>
        Boolean((val >> i) & 1),
      );

      return { outputs, state };
    },
  }),
];

// ── Registry class ────────────────────────────────────────────────────────────

export class ComponentLibrary {
  private typeMap: Map<string, ComponentDefinition> = new Map();
  private customTypes: Set<string> = new Set();
  private customMeta: Map<string, CustomGateMeta> = new Map();

  constructor(defs: ComponentDefinition[] = DEFINITIONS) {
    for (const d of defs) {
      this.typeMap.set(d.type, d);
    }
  }

  get(type: string): ComponentDefinition {
    const def = this.typeMap.get(type);

    if (!def) throw new Error(`Unknown component type: "${type}"`);

    return def;
  }

  has(type: string): boolean {
    return this.typeMap.has(type);
  }

  isCustom(type: string): boolean {
    return this.customTypes.has(type);
  }

  getCustomMeta(type: string): CustomGateMeta | undefined {
    return this.customMeta.get(type);
  }

  getCustomGates(): CustomGateMeta[] {
    return Array.from(this.customMeta.values());
  }

  getAll(): ComponentDefinition[] {
    return Array.from(this.typeMap.values());
  }

  /** Register a component definition. */
  register(def: ComponentDefinition): void {
    this.typeMap.set(def.type, def);
  }

  /**
   * Returns a list of custom gate type strings that depend on the given type
   * (i.e. their internal circuit contains a component of this type).
   */
  getDependents(type: string): string[] {
    const dependents: string[] = [];

    for (const [depType, meta] of this.customMeta) {
      if (depType === type) continue;

      const usesType = Object.values(meta.circuit.components).some(
        (c) => c.type === type,
      );

      if (usesType) dependents.push(depType);
    }

    return dependents;
  }

  /**
   * Returns true if all custom gate dependencies of the given type are
   * currently registered in the library. Returns false if any component in
   * the gate's circuit references an unknown custom type.
   */
  hasValidDependencies(type: string): boolean {
    const meta = this.customMeta.get(type);

    if (!meta) return true;

    for (const comp of Object.values(meta.circuit.components)) {
      if (!this.has(comp.type)) return false;
    }

    return true;
  }

  /**
   * Remove a previously registered component (custom gates only).
   * Returns an error message if the type has dependents, null on success.
   * Pass force=true to bypass the dependency check (used during remapping).
   */
  unregister(type: string, force = false): string | null {
    if (!force) {
      const dependents = this.getDependents(type);

      if (dependents.length > 0) {
        const names = dependents
          .map((t) => this.customMeta.get(t)?.name ?? t)
          .join(", ");

        return `Cannot delete: used by ${names}`;
      }
    }

    this.typeMap.delete(type);
    this.customTypes.delete(type);
    this.customMeta.delete(type);

    return null;
  }

  /**
   * Compile `circuit` into a reusable black-box component.
   *
   * Each source output becomes an input port and each output-sink input
   * becomes an output port. This preserves multi-bit sources and displays,
   * unlike the former one-pin-per-component representation.
   */
  registerCustomCircuit(
    name: string,
    circuit: CircuitSnapshot,
    existingType?: string,
  ): string | null {
    const knownComps = Object.values(circuit.components)
      .flatMap((component) => {
        if (!this.has(component.type)) return [];

        return [{ component, def: this.get(component.type) }];
      })
      .sort(
        (left, right) =>
          left.component.y - right.component.y ||
          left.component.x - right.component.x,
      );
    const compById = new Map(
      knownComps.map(({ component, def }) => [
        component.id,
        { component, def },
      ]),
    );
    const sourceComps = knownComps.filter(
      ({ def }) => def.isInput || def.isClock,
    );
    const sinkComps = knownComps.filter(({ def }) => def.isOutput);

    if (sourceComps.length === 0 && sinkComps.length === 0) return null;

    // Separate clock components from regular input sources. All internal
    // clocks are consolidated into a single external "CLK" input port so the
    // clock signal is driven externally rather than by the internal tick().
    const clockComps = sourceComps.filter(({ def }) => def.isClock);
    const nonClockSourceComps = sourceComps.filter(({ def }) => !def.isClock);
    const hasInternalClocks = clockComps.length > 0;

    const sourceIds = new Set(sourceComps.map(({ component }) => component.id));
    const sinkIds = new Set(sinkComps.map(({ component }) => component.id));
    const executable = knownComps.filter(
      ({ component }) =>
        !sourceIds.has(component.id) && !sinkIds.has(component.id),
    );
    const executableIds = new Set(
      executable.map(({ component }) => component.id),
    );

    const portLabel = (
      label: string | undefined,
      pinLabel: string | undefined,
      pin: number,
      pinCount: number,
      fallback: string,
    ) => {
      const base = label || fallback;

      return pinCount === 1 ? base : `${base}.${pinLabel ?? `P${pin}`}`;
    };

    const inputPorts = nonClockSourceComps.flatMap(
      ({ component, def }, componentIndex) =>
        Array.from({ length: def.outputs }, (_, pin) => ({
          compId: component.id,
          pin,
          label: portLabel(
            component.label,
            def.outputLabels?.[pin],
            pin,
            def.outputs,
            `IN${componentIndex}`,
          ),
        })),
    );

    // If the sub-circuit contains clock components, append a single "CLK"
    // input port. During evaluation, this port's signal is broadcast to all
    // internal clock component outputs.
    if (hasInternalClocks) {
      inputPorts.push({
        compId: "__CLK__",
        pin: PINC0,
        label: "CLK",
      });
    }

    const outputPorts = sinkComps.flatMap(
      ({ component, def }, componentIndex) =>
        Array.from({ length: def.inputs }, (_, pin) => ({
          compId: component.id,
          pin,
          label: portLabel(
            component.label,
            def.inputLabels?.[pin],
            pin,
            def.inputs,
            `OUT${componentIndex}`,
          ),
        })),
    );
    const inputLabels = inputPorts.map((port) => port.label);
    const outputLabels = outputPorts.map((port) => port.label);
    const inputWires = new Map<string, { fromComp: string; fromPin: number }>();

    for (const wire of Object.values(circuit.wires)) {
      const from = compById.get(wire.from.comp);
      const to = compById.get(wire.to.comp);

      if (!from || !to) continue;
      if (wire.from.pin < 0 || wire.from.pin >= from.def.outputs) continue;
      if (wire.to.pin < 0 || wire.to.pin >= to.def.inputs) continue;

      inputWires.set(`${wire.to.comp}${KEY_SEPARATOR}${wire.to.pin}`, {
        fromComp: wire.from.comp,
        fromPin: wire.from.pin,
      });
    }

    // Edge-triggered components are source nodes in this order: they read the
    // previous signal snapshot, then their new outputs feed the live
    // combinational paths below.
    const downstream = new Map<string, Set<string>>(
      executable.map(({ component }) => [component.id, new Set()]),
    );
    const inDegree = new Map<string, number>(
      executable.map(({ component }) => [component.id, 0]),
    );

    for (const { component, def } of executable) {
      if (def.isSequential) continue;

      for (let pin = 0; pin < def.inputs; pin += 1) {
        const wire = inputWires.get(`${component.id}${KEY_SEPARATOR}${pin}`);

        if (!wire || !executableIds.has(wire.fromComp)) continue;

        const targets = downstream.get(wire.fromComp);

        if (targets?.has(component.id)) continue;

        targets?.add(component.id);
        inDegree.set(component.id, (inDegree.get(component.id) ?? 0) + 1);
      }
    }

    const queue = executable
      .filter(({ component }) => (inDegree.get(component.id) ?? 0) === 0)
      .map(({ component }) => component.id);
    const executionOrder: string[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];

      executionOrder.push(id);

      for (const target of downstream.get(id) ?? []) {
        const nextDegree = (inDegree.get(target) ?? 0) - 1;

        inDegree.set(target, nextDegree);
        if (nextDegree === 0) queue.push(target);
      }
    }

    const cyclicIds = new Set(
      executable
        .map(({ component }) => component.id)
        .filter((id) => !executionOrder.includes(id)),
    );
    const cyclicOrder = executable
      .map(({ component }) => component.id)
      .filter((id) => cyclicIds.has(id));
    const numInputs = inputPorts.length;
    const numOutputs = outputPorts.length;
    const safeName = name.replace(/\W+/g, "_").toUpperCase();
    const type =
      existingType ??
      `CUSTOM_${safeName}_${uuidv4().toUpperCase().replace(/-/g, "")}`;
    const hasSequentialInternals =
      hasInternalClocks ||
      executable.some(({ def }) => def.isSequential || def.needsInputSnapshot);
    const createInitialStates = (): Record<
      string,
      Record<string, unknown> | null
    > =>
      Object.fromEntries(
        executable.map(({ component, def }) => [
          component.id,
          def.initialState(),
        ]),
      );
    const createInitialOutputs = (): Record<string, boolean[]> =>
      Object.fromEntries(
        executable.map(({ component, def }) => [
          component.id,
          new Array<boolean>(def.outputs).fill(false),
        ]),
      );

    const evaluateCompiled = (
      externalInputs: SignalValue[],
      state: Record<string, unknown> | null,
      snapshotInputs: SignalValue[] | undefined,
      tick: number,
    ): EvaluateResult => {
      const saved = state as {
        compStates?: Record<string, Record<string, unknown> | null>;
        compOutputs?: Record<string, boolean[]>;
      } | null;
      const compStates = {
        ...createInitialStates(),
        ...(saved?.compStates ?? {}),
      };
      const savedOutputs = saved?.compOutputs ?? {};
      const signals: Record<string, boolean[]> = {};
      const priorSignals: Record<string, boolean[]> = {};

      for (const { component, def } of knownComps) {
        const prior = savedOutputs[component.id];
        const outputs =
          prior?.slice() ?? new Array<boolean>(def.outputs).fill(false);

        signals[component.id] = outputs;
        priorSignals[component.id] = outputs.slice();
      }

      inputPorts.forEach((port, index) => {
        if (port.compId === "__CLK__") {
          // Broadcast the external CLK signal to all internal clock components
          const clkVal = Boolean(externalInputs[index]);
          const clkPrior = Boolean(
            snapshotInputs?.[index] ?? externalInputs[index],
          );

          for (const { component, def: clkDef } of clockComps) {
            for (let p = 0; p < clkDef.outputs; p += 1) {
              signals[component.id][p] = clkVal;
              priorSignals[component.id][p] = clkPrior;
            }
          }

          return;
        }

        signals[port.compId][port.pin] = Boolean(externalInputs[index]);
        priorSignals[port.compId][port.pin] = Boolean(
          snapshotInputs?.[index] ?? externalInputs[index],
        );
      });

      const readInputs = (compId: string, useSnapshot: boolean): boolean[] => {
        const target = compById.get(compId);

        if (!target) return [];

        const inputs = new Array<boolean>(target.def.inputs).fill(false);
        const sourceSignals = useSnapshot ? priorSignals : signals;

        for (let pin = 0; pin < target.def.inputs; pin += 1) {
          const wire = inputWires.get(`${compId}${KEY_SEPARATOR}${pin}`);

          if (wire)
            inputs[pin] = sourceSignals[wire.fromComp]?.[wire.fromPin] ?? false;
        }

        return inputs;
      };

      const evaluateComponent = (id: string): boolean => {
        const entry = compById.get(id);

        if (!entry) return false;

        const liveInputs = readInputs(id, false);
        const priorInputs = readInputs(id, true);
        const inputs = entry.def.isSequential ? priorInputs : liveInputs;
        const previousOutputs = signals[id];
        const result = entry.def.evaluate(inputs, compStates[id], {
          tick,
          snapshotInputs: priorInputs,
        });

        signals[id] = result.outputs;
        compStates[id] = result.state;

        return (
          previousOutputs.length !== result.outputs.length ||
          previousOutputs.some((value, pin) => value !== result.outputs[pin])
        );
      };

      for (const id of executionOrder) evaluateComponent(id);

      // Combinational cycles are not part of the topological plan. Resolve
      // them event-by-event, with the same per-component guard as the main
      // propagator, instead of relying on a fixed number of whole-circuit
      // passes.
      if (cyclicOrder.length > 0) {
        const pending = [...cyclicOrder];
        const queued = new Set(cyclicOrder);
        const evaluations = new Map<string, number>();

        for (let index = 0; index < pending.length; index += 1) {
          const id = pending[index];

          queued.delete(id);

          const count = (evaluations.get(id) ?? 0) + 1;

          evaluations.set(id, count);
          if (count > 64) continue;

          if (!evaluateComponent(id)) continue;

          for (const target of downstream.get(id) ?? []) {
            if (!cyclicIds.has(target) || queued.has(target)) continue;

            queued.add(target);
            pending.push(target);
          }
        }
      }

      const outputs = outputPorts.map(
        (port) => readInputs(port.compId, false)[port.pin] ?? false,
      );
      const compOutputs = Object.fromEntries(
        executable.map(({ component }) => [
          component.id,
          signals[component.id].slice(),
        ]),
      );

      return { outputs, state: { compStates, compOutputs } };
    };

    const def: ComponentDefinition = {
      type,
      label: name,
      category: GATE_CATEGORY_CUSTOM,
      inputs: numInputs,
      outputs: numOutputs,
      width: 90,
      height: Math.max(60, Math.max(numInputs, numOutputs) * 22 + 20),
      symbol: name.slice(0, 4),
      // A composite receives live signals so its combinational outputs settle
      // in the current pass. It separately consumes snapshotInputs for any
      // internal edge-triggered components.
      isSequential: false,
      needsInputSnapshot: hasSequentialInternals,
      isClock: false,
      isInput: false,
      isOutput: false,
      inputLabels,
      outputLabels,
      initialState: () => {
        const blankState = {
          compStates: createInitialStates(),
          compOutputs: createInitialOutputs(),
        };

        return evaluateCompiled(
          new Array<boolean>(numInputs).fill(false),
          blankState,
          undefined,
          0,
        ).state;
      },
      evaluate(externalInputs, state, context) {
        return evaluateCompiled(
          externalInputs,
          state,
          context?.snapshotInputs,
          context?.tick ?? 0,
        );
      },
    };

    this.typeMap.set(type, def);
    this.customTypes.add(type);
    this.customMeta.set(type, {
      type,
      name,
      inputLabels,
      outputLabels,
      circuit,
    });

    return type;
  }

  /** Category → sorted list of types */
  getCategories(): Array<{ name: string; gates: string[] }> {
    const ORDER = [
      GATE_CATEGORY_LOGIC,
      GATE_CATEGORY_INPUT,
      GATE_CATEGORY_OUTPUT,
      GATE_CATEGORY_SEQUENTIAL,
      GATE_CATEGORY_ARITHMETIC,
      GATE_CATEGORY_UTILITY,
    ];
    const groups = new Map<string, string[]>();
    const result: Array<{ name: string; gates: string[] }> = [];

    for (const def of this.typeMap.values()) {
      if (!groups.has(def.category)) groups.set(def.category, []);

      groups.get(def.category)?.push(def.type);
    }

    for (const cat of ORDER) {
      if (groups.has(cat))
        result.push({ name: cat, gates: groups.get(cat) ?? [] });
    }

    // Append any categories not in ORDER (e.g. Custom)
    for (const [cat, gates] of groups) {
      if (!ORDER.includes(cat)) result.push({ name: cat, gates });
    }

    return result;
  }
}

/** Singleton library used across the engine */
export const library = new ComponentLibrary();
