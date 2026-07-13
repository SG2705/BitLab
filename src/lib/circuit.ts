/* eslint-disable @typescript-eslint/no-explicit-any */
// Digital Gate — circuit engine and component definitions
export type PinKind = "in" | "out";

export interface GateDef {
  type: string;
  label: string;
  category: string;
  inputs: number;
  outputs: number;
  width: number;
  height: number;
  evaluate: (
    inputs: boolean[],
    state: any,
    dt: number,
  ) => { outputs: boolean[]; state: any };
  initialState?: () => any;
  symbol?: string;
}

const b = (v: any) => !!v;

export const GATES: Record<string, GateDef> = {
  AND: {
    type: "AND",
    label: "AND",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "&",
    evaluate: (i) => ({ outputs: [i.every(b)], state: null }),
  },
  OR: {
    type: "OR",
    label: "OR",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "≥1",
    evaluate: (i) => ({ outputs: [i.some(b)], state: null }),
  },
  XOR: {
    type: "XOR",
    label: "XOR",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "=1",
    evaluate: (i) => ({
      outputs: [i.reduce((a, v) => a !== b(v), false)],
      state: null,
    }),
  },
  XNOR: {
    type: "XNOR",
    label: "XNOR",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "=",
    evaluate: (i) => ({
      outputs: [!i.reduce((a, v) => a !== b(v), false)],
      state: null,
    }),
  },
  NAND: {
    type: "NAND",
    label: "NAND",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "&̄",
    evaluate: (i) => ({ outputs: [!i.every(b)], state: null }),
  },
  NOR: {
    type: "NOR",
    label: "NOR",
    category: "Logic Gates",
    inputs: 2,
    outputs: 1,
    width: 70,
    height: 60,
    symbol: "≥1̄",
    evaluate: (i) => ({ outputs: [!i.some(b)], state: null }),
  },
  NOT: {
    type: "NOT",
    label: "NOT",
    category: "Logic Gates",
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "!",
    evaluate: (i) => ({ outputs: [!b(i[0])], state: null }),
  },
  BUFFER: {
    type: "BUFFER",
    label: "Buffer",
    category: "Logic Gates",
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "1",
    evaluate: (i) => ({ outputs: [b(i[0])], state: null }),
  },

  TOGGLE: {
    type: "TOGGLE",
    label: "Toggle",
    category: "Inputs",
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "T",
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
  },
  BUTTON: {
    type: "BUTTON",
    label: "Button",
    category: "Inputs",
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "B",
    initialState: () => ({ on: false }),
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
  },
  CLOCK: {
    type: "CLOCK",
    label: "Clock",
    category: "Inputs",
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 50,
    symbol: "⏲",
    initialState: () => ({ on: false, acc: 0 }),
    evaluate: (_i, s, dt) => {
      const period = 500; // ms; toggled by props.frequency
      const acc = (s?.acc ?? 0) + dt;
      if (acc >= period)
        return { outputs: [!s.on], state: { on: !s.on, acc: 0 } };
      return { outputs: [!!s?.on], state: { ...s, acc } };
    },
  },
  CONST: {
    type: "CONST",
    label: "Constant",
    category: "Inputs",
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    symbol: "1",
    evaluate: (_i, s) => ({ outputs: [!!s?.on], state: s }),
    initialState: () => ({ on: true }),
  },

  LED: {
    type: "LED",
    label: "LED",
    category: "Outputs",
    inputs: 1,
    outputs: 0,
    width: 50,
    height: 50,
    symbol: "◉",
    evaluate: (i, s) => ({ outputs: [], state: { on: b(i[0]) } }),
  },
  LAMP: {
    type: "LAMP",
    label: "Lamp",
    category: "Outputs",
    inputs: 1,
    outputs: 0,
    width: 60,
    height: 60,
    symbol: "☀",
    evaluate: (i, s) => ({ outputs: [], state: { on: b(i[0]) } }),
  },

  SR_LATCH: {
    type: "SR_LATCH",
    label: "SR Latch",
    category: "Sequential",
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 70,
    symbol: "SR",
    initialState: () => ({ q: false }),
    evaluate: (i, s) => {
      let q = !!s?.q;
      if (b(i[0]) && !b(i[1])) q = true;
      else if (!b(i[0]) && b(i[1])) q = false;
      return { outputs: [q, !q], state: { q } };
    },
  },
  DFF: {
    type: "DFF",
    label: "D Flip-Flop",
    category: "Sequential",
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 70,
    symbol: "D",
    initialState: () => ({ q: false, prevClk: false }),
    evaluate: (i, s) => {
      const clk = b(i[1]);
      let q = !!s?.q;
      if (clk && !s.prevClk) q = b(i[0]);
      return { outputs: [q, !q], state: { q, prevClk: clk } };
    },
  },

  HALF_ADDER: {
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
  },
  FULL_ADDER: {
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
  },
  MUX2: {
    type: "MUX2",
    label: "MUX 2:1",
    category: "Arithmetic",
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 70,
    symbol: "M",
    evaluate: (i) => ({ outputs: [b(i[2]) ? b(i[1]) : b(i[0])], state: null }),
  },
};

export const CATEGORIES = [
  {
    name: "Logic Gates",
    gates: ["AND", "OR", "XOR", "XNOR", "NAND", "NOR", "NOT", "BUFFER"],
  },
  { name: "Inputs", gates: ["TOGGLE", "BUTTON", "CLOCK", "CONST"] },
  { name: "Outputs", gates: ["LED", "LAMP"] },
  { name: "Sequential", gates: ["SR_LATCH", "DFF"] },
  { name: "Arithmetic", gates: ["HALF_ADDER", "FULL_ADDER", "MUX2"] },
];

export interface CircuitComp {
  id: string;
  type: string;
  x: number;
  y: number;
  label?: string;
  state: any;
  outputs: boolean[];
  color?: string;
}

export interface Wire {
  id: string;
  from: { comp: string; pin: number };
  to: { comp: string; pin: number };
}

export interface Circuit {
  components: Record<string, CircuitComp>;
  wires: Record<string, Wire>;
}

export function pinPos(comp: CircuitComp, kind: PinKind, idx: number) {
  const def = GATES[comp.type];
  const count = kind === "in" ? def.inputs : def.outputs;
  const spacing = def.height / (count + 1);
  const y = comp.y + spacing * (idx + 1);
  const x = kind === "in" ? comp.x : comp.x + def.width;
  return { x, y };
}

// Simulate one tick
export function simulate(circuit: Circuit, dt: number): Circuit {
  const comps = { ...circuit.components };
  // Build input values per component from wires (previous outputs)
  const nextComps: Record<string, CircuitComp> = {};
  for (const id of Object.keys(comps)) {
    const c = comps[id];
    const def = GATES[c.type];
    const inputs: boolean[] = new Array(def.inputs).fill(false);
    for (const w of Object.values(circuit.wires)) {
      if (w.to.comp === id) {
        const src = comps[w.from.comp];
        if (src) inputs[w.to.pin] = !!src.outputs[w.from.pin];
      }
    }
    const { outputs, state } = def.evaluate(inputs, c.state, dt);
    nextComps[id] = { ...c, outputs, state: state ?? c.state };
  }
  return { components: nextComps, wires: circuit.wires };
}
