/**
 * ComponentLibrary — authoritative registry of all component definitions.
 *
 * Each definition is a pure description: no mutable state, no side effects.
 * The evaluate() function is a pure function of (inputs, state) → (outputs, state).
 * The tick() function (clock-only) is a pure function of (state, dt) → (outputs, state).
 */

import type { ComponentDefinition, SignalValue, EvaluateResult } from "./types";

const b = (v: unknown): boolean => !!v;

// ── Helpers ───────────────────────────────────────────────────────────────────

function combinational(
  fields: Omit<
    ComponentDefinition,
    "isSequential" | "isClock" | "isInput" | "isOutput" | "initialState"
  > & {
    evaluate: (inputs: SignalValue[], state: null) => EvaluateResult;
  },
): ComponentDefinition {
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
  combinational({
    type: "AND",
    label: "AND",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "&",
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  }),
  combinational({
    type: "OR",
    label: "OR",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "≥1",
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  }),
  combinational({
    type: "XOR",
    label: "XOR",
    category: "Logic Gates",
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
  combinational({
    type: "XNOR",
    label: "XNOR",
    category: "Logic Gates",
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
  combinational({
    type: "NAND",
    label: "NAND",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "&̄",
    evaluate: (i) => ({ outputs: [!i.every(b)], state: null }),
  }),
  combinational({
    type: "NOR",
    label: "NOR",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "≥1̄",
    evaluate: (i) => ({ outputs: [!i.some(b)], state: null }),
  }),
  combinational({
    type: "NOT",
    label: "NOT",
    category: "Logic Gates",
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "!",
    evaluate: (i) => ({ outputs: [!b(i[0])], state: null }),
  }),
  combinational({
    type: "BUFFER",
    label: "Buffer",
    category: "Logic Gates",
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "1",
    evaluate: (i) => ({ outputs: [b(i[0])], state: null }),
  }),
  // 3-input AND/OR/XOR
  combinational({
    type: "AND3",
    label: "AND-3",
    category: "Logic Gates",
    inputs: 3,
    outputs: 1,
    width: 70,
    height: 70,
    symbol: "&3",
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  }),
  combinational({
    type: "OR3",
    label: "OR-3",
    category: "Logic Gates",
    inputs: 3,
    outputs: 1,
    width: 70,
    height: 70,
    symbol: "≥1·3",
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  }),

  // ── Inputs ───────────────────────────────────────────────────────────────────
  {
    type: "TOGGLE",
    label: "Toggle",
    category: "Inputs",
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
    type: "BUTTON",
    label: "Button",
    category: "Inputs",
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
    type: "CONST",
    label: "Constant",
    category: "Inputs",
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
    type: "CLOCK",
    label: "Clock",
    category: "Inputs",
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
    type: "LED",
    label: "LED",
    category: "Outputs",
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
    type: "LAMP",
    label: "Lamp",
    category: "Outputs",
    inputs: 1,
    outputs: 0,
    width: 60,
    height: 60,
    symbol: "☀",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    initialState: () => ({ on: false }),
    evaluate: (i) => ({ outputs: [], state: { on: b(i[0]) } }),
  },
  {
    type: "DISPLAY7",
    label: "7-Seg",
    category: "Outputs",
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
    type: "SR_LATCH",
    label: "SR Latch",
    category: "Sequential",
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
      if (S && !R) q = true;
      else if (!S && R) q = false;
      // S=1 R=1 is an invalid state; hold
      return { outputs: [q, !q], state: { q } };
    },
  },
  {
    type: "DFF",
    label: "D Flip-Flop",
    category: "Sequential",
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
      const clk = b(i[1]);
      let q = !!s?.q;
      // Sample D on rising clock edge
      if (clk && !s?.prevClk) q = b(i[0]);
      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  },
  {
    type: "JKFF",
    label: "JK Flip-Flop",
    category: "Sequential",
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
        if (J && !K) q = true;
        else if (!J && K) q = false;
        else if (J && K) q = !q; // toggle
      }
      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  },
  {
    type: "TIFF",
    label: "T Flip-Flop",
    category: "Sequential",
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
      const clk = b(i[1]);
      let q = !!s?.q;
      if (clk && !s?.prevClk && b(i[0])) q = !q;
      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  },
  {
    type: "REG8",
    label: "Register-8",
    category: "Sequential",
    inputs: 9,
    outputs: 8,
    width: 90,
    height: 120,
    symbol: "REG",
    isSequential: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ bits: new Array(8).fill(false), prevClk: false }),
    evaluate: (i, s) => {
      const clk = b(i[8]);
      let bits: boolean[] = (s?.bits as boolean[]) ?? new Array(8).fill(false);
      if (clk && !s?.prevClk) bits = i.slice(0, 8).map(b);
      return { outputs: [...bits], state: { bits, prevClk: clk } };
    },
  },

  // ── Arithmetic ────────────────────────────────────────────────────────────────
  combinational({
    type: "HALF_ADDER",
    label: "Half Adder",
    category: "Arithmetic",
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
  combinational({
    type: "FULL_ADDER",
    label: "Full Adder",
    category: "Arithmetic",
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
  combinational({
    type: "MUX2",
    label: "MUX 2:1",
    category: "Arithmetic",
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 70,
    symbol: "M",
    evaluate: (i) => ({ outputs: [b(i[2]) ? b(i[1]) : b(i[0])], state: null }),
  }),
  combinational({
    type: "MUX4",
    label: "MUX 4:1",
    category: "Arithmetic",
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
  combinational({
    type: "DEMUX2",
    label: "DEMUX 1:2",
    category: "Arithmetic",
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
  combinational({
    type: "DECODER2",
    label: "Decoder 2:4",
    category: "Arithmetic",
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
  combinational({
    type: "ENCODER4",
    label: "Encoder 4:2",
    category: "Arithmetic",
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
  combinational({
    type: "COMPARATOR",
    label: "Comparator",
    category: "Arithmetic",
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
  private byType: Map<string, ComponentDefinition> = new Map();

  constructor(defs: ComponentDefinition[] = DEFINITIONS) {
    for (const d of defs) this.byType.set(d.type, d);
  }

  get(type: string): ComponentDefinition {
    const def = this.byType.get(type);

    if (!def) {
      throw new Error(`Unknown component type: "${type}"`);
    }

    return def;
  }

  has(type: string): boolean {
    return this.byType.has(type);
  }

  getAll(): ComponentDefinition[] {
    return Array.from(this.byType.values());
  }

  /** Register a custom component definition (for future custom components) */
  register(def: ComponentDefinition): void {
    this.byType.set(def.type, def);
  }

  /** Category → sorted list of types */
  getCategories(): Array<{ name: string; gates: string[] }> {
    const groups = new Map<string, string[]>();

    for (const def of this.byType.values()) {
      if (!groups.has(def.category)) {
        groups.set(def.category, []);
      }

      groups.get(def.category)!.push(def.type);
    }

    const ORDER = [
      "Logic Gates",
      "Inputs",
      "Outputs",
      "Sequential",
      "Arithmetic",
    ];
    const result: Array<{ name: string; gates: string[] }> = [];

    for (const cat of ORDER) {
      if (groups.has(cat)) {
        result.push({ name: cat, gates: groups.get(cat)! });
      }
    }

    // Append any categories not in ORDER
    for (const [cat, gates] of groups) {
      if (!ORDER.includes(cat)) {
        result.push({ name: cat, gates });
      }
    }

    return result;
  }
}

/** Singleton library used across the engine */
export const library = new ComponentLibrary();
