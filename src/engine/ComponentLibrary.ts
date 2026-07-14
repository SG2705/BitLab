/**
 * ComponentLibrary — authoritative registry of all component definitions.
 *
 * Each definition is a pure description: no mutable state, no side effects.
 * The evaluate() function is a pure function of (inputs, state) → (outputs, state).
 * The tick() function (clock-only) is a pure function of (state, dt) → (outputs, state).
 */

import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_CATEGORY_INPUT,
  GATE_CATEGORY_LOGIC,
  GATE_CATEGORY_OUTPUT,
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_AND,
  GATE_TYPE_AND3,
  GATE_TYPE_BUFFER,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CLOCK,
  GATE_TYPE_COMPARATOR,
  GATE_TYPE_CONST,
  GATE_TYPE_DECODER2,
  GATE_TYPE_DEMUX2,
  GATE_TYPE_DFF,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_ENCODER4,
  GATE_TYPE_FULL_ADDER,
  GATE_TYPE_HALF_ADDER,
  GATE_TYPE_JKFF,
  GATE_TYPE_LED,
  GATE_TYPE_MUX2,
  GATE_TYPE_MUX4,
  GATE_TYPE_NAND,
  GATE_TYPE_NOR,
  GATE_TYPE_NOT,
  GATE_TYPE_OR,
  GATE_TYPE_OR3,
  GATE_TYPE_SR_LATCH,
  GATE_TYPE_TIFF,
  GATE_TYPE_TOGGLE,
  GATE_TYPE_XNOR,
  GATE_TYPE_XOR,
} from "@/constants";
import type { ComponentDefinition, SignalValue, EvaluateResult } from "./types";
import { fm } from "@/utils";

const b = (v: unknown): boolean => !!v;

// ── Helpers ───────────────────────────────────────────────────────────────────

type CbFields = Omit<
  ComponentDefinition,
  "isSequential" | "isClock" | "isInput" | "isOutput" | "initialState"
> & {
  evaluate: (inputs: SignalValue[], state: null) => EvaluateResult;
};

function cb(fields: CbFields): ComponentDefinition {
  return {
    ...fields,
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => null,
  } as ComponentDefinition;
}

// ── Definition table ──────────────────────────────────────────────────────────

const DEFINITIONS: ComponentDefinition[] = [
  // ── Logic Gates ─────────────────────────────────────────────────────────────
  cb({
    type: GATE_TYPE_AND,
    label: fm("lb_and"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "&",
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_OR,
    label: fm("lb_or"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "≥1",
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_XOR,
    label: fm("lb_xor"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "=1",
    evaluate: (i) => ({
      outputs: [i.reduce((a: boolean, v) => a !== b(v), false)],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_XNOR,
    label: fm("lb_xnor"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "=",
    evaluate: (i) => ({
      outputs: [!i.reduce((a: boolean, v) => a !== b(v), false)],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_NAND,
    label: fm("lb_nand"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "&̄",
    evaluate: (i) => ({ outputs: [!i.every(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_NOR,
    label: fm("lb_nor"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "≥1̄",
    evaluate: (i) => ({ outputs: [!i.some(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_NOT,
    label: fm("lb_not"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "!",
    evaluate: (i) => ({ outputs: [!b(i[0])], state: null }),
  }),
  cb({
    type: GATE_TYPE_BUFFER,
    label: fm("lb_buffer"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "1",
    evaluate: (i) => ({ outputs: [b(i[0])], state: null }),
  }),
  cb({
    type: GATE_TYPE_AND3,
    label: fm("lb_and_3"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 3,
    outputs: 1,
    width: 70,
    height: 70,
    symbol: "&3",
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  }),
  cb({
    type: GATE_TYPE_OR3,
    label: fm("lb_or_3"),
    category: GATE_CATEGORY_LOGIC,
    inputs: 3,
    outputs: 1,
    width: 70,
    height: 70,
    symbol: "≥1·3",
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  }),

  // ── Inputs ───────────────────────────────────────────────────────────────────
  {
    type: GATE_TYPE_TOGGLE,
    label: fm("lb_toggle"),
    category: GATE_CATEGORY_INPUT,
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "T",
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
  },
  {
    type: GATE_TYPE_BUTTON,
    label: fm("lb_button"),
    category: GATE_CATEGORY_INPUT,
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "B",
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
  },
  {
    type: GATE_TYPE_CONST,
    label: fm("lb_const"),
    category: GATE_CATEGORY_INPUT,
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    symbol: "1",
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ on: true }),
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
  },
  {
    type: GATE_TYPE_CLOCK,
    label: fm("lb_clock"),
    category: GATE_CATEGORY_INPUT,
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "⏲",
    isSequential: false,
    isClock: true,
    isInput: false,
    isOutput: false,
    initialState: () => ({ on: false, acc: 0, period: 500 }),
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
    tick(state, dt) {
      const period = (state?.period as number) ?? 500;
      const acc = ((state?.acc as number) ?? 0) + dt;

      if (acc >= period) {
        const on = !(state?.on as boolean);

        return {
          outputs: [on],
          state: { ...(state ?? {}), on, acc: acc - period },
        };
      }

      return { outputs: [!!state?.on], state: { ...(state ?? {}), acc } };
    },
  },

  // ── Outputs ──────────────────────────────────────────────────────────────────
  {
    type: GATE_TYPE_LED,
    label: fm("lb_led"),
    category: GATE_CATEGORY_OUTPUT,
    inputs: 1,
    outputs: 0,
    width: 50,
    height: 50,
    symbol: "◉",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    initialState: () => ({ on: false }),
    evaluate: (i) => ({ outputs: [], state: { on: b(i[0]) } }),
  },
  {
    type: GATE_TYPE_DISPLAY7,
    label: fm("lb_7_seg"),
    category: GATE_CATEGORY_OUTPUT,
    inputs: 4,
    outputs: 0,
    width: 70,
    height: 80,
    symbol: "7",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    initialState: () => ({ value: 0 }),
    evaluate: (i) => {
      const value =
        (b(i[3]) ? 8 : 0) |
        (b(i[2]) ? 4 : 0) |
        (b(i[1]) ? 2 : 0) |
        (b(i[0]) ? 1 : 0);

      return { outputs: [], state: { value } };
    },
  },

  // ── Sequential ────────────────────────────────────────────────────────────────
  {
    type: GATE_TYPE_SR_LATCH,
    label: fm("lb_sr_latch"),
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 70,
    symbol: "SR",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ q: false }),
    evaluate: (i, s) => {
      let q = !!s?.q;
      const S = b(i[0]),
        R = b(i[1]);

      if (S && !R) {
        q = true;
      } else if (!S && R) {
        q = false;
      }

      // S=1 R=1 is an invalid state; hold
      return { outputs: [q, !q], state: { q } };
    },
  },
  {
    type: GATE_TYPE_DFF,
    label: fm("lb_d_flip_flop"),
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 70,
    symbol: "D",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      let q = !!s?.q;
      const clk = b(i[1]);

      // Sample D on rising clock edge
      if (clk && !s?.prevClk) {
        q = b(i[0]);
      }

      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  },
  {
    type: GATE_TYPE_JKFF,
    label: fm("lb_jk_flip_flop"),
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    symbol: "JK",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      const clk = b(i[2]);
      let q = !!s?.q;

      if (clk && !s?.prevClk) {
        const J = b(i[0]),
          K = b(i[1]);
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
  },
  {
    type: GATE_TYPE_TIFF,
    label: fm("lb_t_flip_flop"),
    category: GATE_CATEGORY_SEQUENTIAL,
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 70,
    symbol: "T",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      let q = !!s?.q;
      const clk = b(i[1]);

      if (clk && !s?.prevClk && b(i[0])) {
        q = !q;
      }

      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  },

  // ── Arithmetic ────────────────────────────────────────────────────────────────
  cb({
    type: GATE_TYPE_HALF_ADDER,
    label: fm("lb_halfadder"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 60,
    symbol: "½+",
    evaluate: (i) => ({
      outputs: [b(i[0]) !== b(i[1]), b(i[0]) && b(i[1])],
      state: null,
    }),
  }),
  cb({
    type: GATE_TYPE_FULL_ADDER,
    label: fm("lb_adder"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 70,
    symbol: "Σ",
    evaluate: (i) => {
      const s = (b(i[0]) ? 1 : 0) + (b(i[1]) ? 1 : 0) + (b(i[2]) ? 1 : 0);

      return { outputs: [s % 2 === 1, s >= 2], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_MUX2,
    label: fm("lb_mux_2_1"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 70,
    symbol: "M",
    evaluate: (i) => ({ outputs: [b(i[2]) ? b(i[1]) : b(i[0])], state: null }),
  }),
  cb({
    type: GATE_TYPE_MUX4,
    label: fm("lb_mux_4_1"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 6,
    outputs: 1,
    width: 80,
    height: 90,
    symbol: "M4",
    evaluate: (i) => {
      const sel = (b(i[5]) ? 2 : 0) | (b(i[4]) ? 1 : 0);
      return { outputs: [b(i[sel])], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_DEMUX2,
    label: fm("lb_dmux_1_2"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 60,
    symbol: "DM",
    evaluate: (i) => {
      const sel = b(i[1]);
      return { outputs: [!sel && b(i[0]), sel && b(i[0])], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_DECODER2,
    label: fm("lb_dcode_2_4"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 2,
    outputs: 4,
    width: 80,
    height: 80,
    symbol: "DEC",
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
    label: fm("lb_ecode_4_2"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 4,
    outputs: 2,
    width: 80,
    height: 80,
    symbol: "ENC",
    evaluate: (i) => {
      let idx = 0;

      for (let j = 3; j >= 0; j--) {
        if (b(i[j])) {
          idx = j;

          break;
        }
      }

      return { outputs: [!!(idx & 1), !!(idx & 2)], state: null };
    },
  }),
  cb({
    type: GATE_TYPE_COMPARATOR,
    label: fm("lb_comparator"),
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: 2,
    outputs: 3,
    width: 80,
    height: 70,
    symbol: "CMP",
    evaluate: (i) => {
      const a = b(i[0]) ? 1 : 0,
        bv = b(i[1]) ? 1 : 0;

      return { outputs: [a < bv, a === bv, a > bv], state: null };
    },
  }),
];

// ── Registry class ────────────────────────────────────────────────────────────

export class ComponentLibrary {
  private typeMap: Map<string, ComponentDefinition> = new Map();

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

  getAll(): ComponentDefinition[] {
    return Array.from(this.typeMap.values());
  }

  /** Register a custom component definition (for future custom components) */
  register(def: ComponentDefinition): void {
    this.typeMap.set(def.type, def);
  }

  /** Category → sorted list of types */
  getCategories(): Array<{ name: string; gates: string[] }> {
    const ORDER = [
      GATE_CATEGORY_LOGIC,
      GATE_CATEGORY_INPUT,
      GATE_CATEGORY_OUTPUT,
      GATE_CATEGORY_SEQUENTIAL,
      GATE_CATEGORY_ARITHMETIC,
    ];
    const groups = new Map<string, string[]>();
    const result: Array<{ name: string; gates: string[] }> = [];

    for (const def of this.typeMap.values()) {
      if (!groups.has(def.category)) groups.set(def.category, []);

      groups.get(def.category)!.push(def.type);
    }

    for (const cat of ORDER) {
      if (groups.has(cat))
        result.push({ name: cat, gates: groups.get(cat) ?? [] });
    }

    // Append any categories not in ORDER
    for (const [cat, gates] of groups) {
      if (!ORDER.includes(cat)) result.push({ name: cat, gates });
    }

    return result;
  }
}

/** Singleton library used across the engine */
export const library = new ComponentLibrary();
