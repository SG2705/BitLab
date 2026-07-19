/**
 * ComponentLibrary — authoritative registry of all component definitions.
 *
 * Each definition is a pure description: no mutable state, no side effects.
 * The evaluate() function is a pure function of (inputs, state) → (outputs, state).
 * The tick() function (clock-only) is a pure function of (state, dt) → (outputs, state).
 */
import { v4 as uuidv4 } from "uuid";

import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_CATEGORY_CUSTOM,
  GATE_CATEGORY_INPUT,
  GATE_CATEGORY_LOGIC,
  GATE_CATEGORY_OUTPUT,
  GATE_CATEGORY_SEQUENTIAL,
  GATE_CATEGORY_UTILITY,
  GATE_TYPE_AND,
  GATE_TYPE_AND3,
  GATE_TYPE_AND4,
  GATE_TYPE_AND8,
  GATE_TYPE_AND16,
  GATE_TYPE_BUFFER,
  GATE_TYPE_BUS_AND4,
  GATE_TYPE_BUS_AND8,
  GATE_TYPE_BUS_AND16,
  GATE_TYPE_BUS_DISPLAY,
  GATE_TYPE_BUS_DISPLAY8,
  GATE_TYPE_BUS_DISPLAY16,
  GATE_TYPE_BUS_INPUT4,
  GATE_TYPE_BUS_INPUT8,
  GATE_TYPE_BUS_INPUT16,
  GATE_TYPE_BUS_NOT4,
  GATE_TYPE_BUS_NOT8,
  GATE_TYPE_BUS_NOT16,
  GATE_TYPE_BUS_OR4,
  GATE_TYPE_BUS_OR8,
  GATE_TYPE_BUS_OR16,
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
  GATE_TYPE_GND,
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
  GATE_TYPE_NOT2,
  GATE_TYPE_NOT4,
  GATE_TYPE_NOT8,
  GATE_TYPE_OR,
  GATE_TYPE_OR3,
  GATE_TYPE_OR4,
  GATE_TYPE_OR8,
  GATE_TYPE_OR16,
  GATE_TYPE_PROBE,
  GATE_TYPE_REG4,
  GATE_TYPE_SHREG4,
  GATE_TYPE_SPLITTER,
  GATE_TYPE_SR_LATCH,
  GATE_TYPE_TIFF,
  GATE_TYPE_TOGGLE,
  GATE_TYPE_UREG4,
  GATE_TYPE_UREG8,
  GATE_TYPE_VCC,
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
import {
  evalBusAnd,
  evalBusDisplay,
  evalBusInput,
  evalBusNot,
  evalBusOr,
  evalClockTick,
  evalCmp4,
  evalComment,
  evalComparator,
  evalCounter4,
  evalDecoder2,
  evalDecoder3,
  evalDemux2,
  evalDff,
  evalDigitBin,
  evalDisplay7,
  evalDlatch,
  evalEncoder4,
  evalFullAdder,
  evalFullSub,
  evalGateAnd,
  evalGateBuffer,
  evalGateNand,
  evalGateNor,
  evalGateNot,
  evalGateNotMulti,
  evalGateOr,
  evalGateXnor,
  evalGateXor,
  evalGnd,
  evalHalfAdder,
  evalHalfSub,
  evalInput,
  evalJkff,
  evalLed,
  evalMux2,
  evalMux4,
  evalMux8,
  evalPassthrough,
  evalProbe,
  evalReg4,
  evalShreg4,
  evalSplitter,
  evalSrLatch,
  evalTiff,
  evalUreg4,
  evalUreg8,
  evalVcc,
} from "./logic";
import type {
  CircuitSnapshot,
  ComponentDefinition,
  EvaluateResult,
  SignalValue,
} from "./types";
import { LogicValue } from "./types";
import { getHeightForPinCount } from "./utils";

const { ZERO } = LogicValue;

export interface CustomGateMeta {
  type: string;
  name: string;
  inputLabels: string[];
  outputLabels: string[];
  circuit: CircuitSnapshot;
}

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
    width: 60,
    height: 60,
    symbol: "&",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: evalGateAnd,
  }),
  cb({
    type: GATE_TYPE_OR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 60,
    height: 60,
    symbol: "≥1",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: evalGateOr,
  }),
  cb({
    type: GATE_TYPE_XOR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 60,
    height: 60,
    symbol: "=1",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: evalGateXor,
  }),
  cb({
    type: GATE_TYPE_XNOR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 60,
    height: 60,
    symbol: "=",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: evalGateXnor,
  }),
  cb({
    type: GATE_TYPE_NAND,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 60,
    height: 60,
    symbol: "&̄",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: evalGateNand,
  }),
  cb({
    type: GATE_TYPE_NOR,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC1,
    width: 60,
    height: 60,
    symbol: "≥1̄",
    inputLabels: ["A", "B"],
    outputLabels: ["Y"],
    evaluate: evalGateNor,
  }),
  cb({
    type: GATE_TYPE_NOT,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC1,
    outputs: PINC1,
    width: 60,
    height: 50,
    symbol: "!",
    inputLabels: ["A"],
    outputLabels: ["Y"],
    evaluate: evalGateNot,
  }),
  cb({
    type: GATE_TYPE_BUFFER,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC1,
    outputs: PINC1,
    width: 60,
    height: 50,
    symbol: "1",
    inputLabels: ["A"],
    outputLabels: ["Y"],
    evaluate: evalGateBuffer,
  }),
  cb({
    type: GATE_TYPE_AND3,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC3,
    outputs: PINC1,
    width: 60,
    height: 70,
    symbol: "&3",
    inputLabels: ["A", "B", "C"],
    outputLabels: ["Y"],
    evaluate: evalGateAnd,
  }),
  cb({
    type: GATE_TYPE_OR3,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC3,
    outputs: PINC1,
    width: 60,
    height: 70,
    symbol: "≥1·3",
    inputLabels: ["A", "B", "C"],
    outputLabels: ["Y"],
    evaluate: evalGateOr,
  }),

  // ── Multi-input gate variants ─────────────────────────────────────────────
  cb({
    type: GATE_TYPE_AND4,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC4,
    outputs: PINC1,
    width: 60,
    height: 80,
    symbol: "&4",
    inputLabels: ["A", "B", "C", "D"],
    outputLabels: ["Y"],
    evaluate: evalGateAnd,
  }),
  cb({
    type: GATE_TYPE_AND8,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC8,
    outputs: PINC1,
    width: 60,
    height: 120,
    symbol: "&8",
    inputLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    outputLabels: ["Y"],
    evaluate: evalGateAnd,
  }),
  cb({
    type: GATE_TYPE_AND16,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC16,
    outputs: PINC1,
    width: 60,
    height: 200,
    symbol: "&16",
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
      "A11",
      "A12",
      "A13",
      "A14",
      "A15",
    ],
    outputLabels: ["Y"],
    evaluate: evalGateAnd,
  }),
  cb({
    type: GATE_TYPE_OR4,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC4,
    outputs: PINC1,
    width: 60,
    height: 80,
    symbol: "≥1·4",
    inputLabels: ["A", "B", "C", "D"],
    outputLabels: ["Y"],
    evaluate: evalGateOr,
  }),
  cb({
    type: GATE_TYPE_OR8,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC8,
    outputs: PINC1,
    width: 60,
    height: 120,
    symbol: "≥1·8",
    inputLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    outputLabels: ["Y"],
    evaluate: evalGateOr,
  }),
  cb({
    type: GATE_TYPE_OR16,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC16,
    outputs: PINC1,
    width: 60,
    height: 200,
    symbol: "≥1·16",
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
      "A11",
      "A12",
      "A13",
      "A14",
      "A15",
    ],
    outputLabels: ["Y"],
    evaluate: evalGateOr,
  }),
  cb({
    type: GATE_TYPE_NOT2,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 60,
    height: 60,
    symbol: "!2",
    inputLabels: ["A", "B"],
    outputLabels: ["Y0", "Y1"],
    evaluate: evalGateNotMulti,
  }),
  cb({
    type: GATE_TYPE_NOT4,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC4,
    outputs: PINC4,
    width: 60,
    height: 80,
    symbol: "!4",
    inputLabels: ["A", "B", "C", "D"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: evalGateNotMulti,
  }),
  cb({
    type: GATE_TYPE_NOT8,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC8,
    outputs: PINC8,
    width: 60,
    height: 120,
    symbol: "!8",
    inputLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: evalGateNotMulti,
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
    evaluate: evalInput,
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
    evaluate: evalInput,
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
    evaluate: evalInput,
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
    evaluate: evalInput,
    tick: evalClockTick,
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
    outputLabels: ["B0", "B1", "B2", "B3"],
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    initialState: () => ({ digit: 0 }),
    evaluate: evalDigitBin,
  }),

  // ── Power Rails (no port in custom circuits) ─────────────────────────────────
  hw({
    type: GATE_TYPE_VCC,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC1,
    width: 50,
    height: 40,
    symbol: "5V",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ on: true }),
    evaluate: evalVcc,
  }),
  hw({
    type: GATE_TYPE_GND,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC1,
    width: 50,
    height: 40,
    symbol: "⏚",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ on: false }),
    evaluate: evalGnd,
  }),

  // ── Bus Inputs ────────────────────────────────────────────────────────────────
  hw({
    type: GATE_TYPE_BUS_INPUT4,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "⇐4",
    isBusOutput: true,
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    outputLabels: ["B0", "B1", "B2", "B3"],
    initialState: () => ({ signal: 0, width: 4 }),
    evaluate: evalBusInput,
  }),
  hw({
    type: GATE_TYPE_BUS_INPUT8,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC8,
    width: 80,
    height: 110,
    symbol: "⇐8",
    isBusOutput: true,
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
    outputLabels: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    initialState: () => ({ signal: 0, width: 8 }),
    evaluate: evalBusInput,
  }),
  hw({
    type: GATE_TYPE_BUS_INPUT16,
    label: "",
    category: GATE_CATEGORY_INPUT,
    inputs: PINC0,
    outputs: PINC16,
    width: 80,
    height: 200,
    symbol: "⇐16",
    isBusOutput: true,
    isSequential: false,
    isClock: false,
    isInput: true,
    isOutput: false,
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
    initialState: () => ({ signal: 0, width: 16 }),
    evaluate: evalBusInput,
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
    evaluate: evalLed,
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
    evaluate: evalDisplay7,
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
    isSequential: false,
    samplesEveryTick: true,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({
      history: [] as Array<{ v: boolean; t: number }>,
    }),
    evaluate: evalProbe,
  }),
  hw({
    type: GATE_TYPE_BUS_DISPLAY,
    label: "",
    category: GATE_CATEGORY_OUTPUT,
    inputs: PINC4,
    outputs: PINC0,
    width: 80,
    height: 80,
    symbol: "◉4",
    isBusInput: true,
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    inputLabels: ["B0", "B1", "B2", "B3"],
    initialState: () => ({ value: 0 }),
    evaluate: evalBusDisplay,
  }),
  hw({
    type: GATE_TYPE_BUS_DISPLAY8,
    label: "",
    category: GATE_CATEGORY_OUTPUT,
    inputs: PINC8,
    outputs: PINC0,
    width: 80,
    height: 110,
    symbol: "◉8",
    isBusInput: true,
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
    inputLabels: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    initialState: () => ({ value: 0 }),
    evaluate: evalBusDisplay,
  }),
  hw({
    type: GATE_TYPE_BUS_DISPLAY16,
    label: "",
    category: GATE_CATEGORY_OUTPUT,
    inputs: PINC16,
    outputs: PINC0,
    width: 80,
    height: 200,
    symbol: "◉16",
    isBusInput: true,
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: true,
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
    initialState: () => ({ value: 0 }),
    evaluate: evalBusDisplay,
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
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["S", "R"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false }),
    evaluate: evalSrLatch,
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
    evaluate: evalDff,
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
    evaluate: evalJkff,
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
    evaluate: evalTiff,
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
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["D", "E"],
    outputLabels: ["Q", "Q'"],
    initialState: () => ({ q: false }),
    evaluate: evalDlatch,
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
    evaluate: evalReg4,
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
    evaluate: evalCounter4,
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
    evaluate: evalShreg4,
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
    evaluate: evalHalfAdder,
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
    evaluate: evalFullAdder,
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
    evaluate: evalMux2,
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
    evaluate: evalMux4,
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
    evaluate: evalDemux2,
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
    evaluate: evalDecoder2,
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
    evaluate: evalEncoder4,
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
    evaluate: evalComparator,
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
    evaluate: evalDecoder3,
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
    evaluate: evalMux8,
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
    evaluate: evalHalfSub,
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
    evaluate: evalFullSub,
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
    evaluate: evalCmp4,
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
    evaluate: evalSplitter,
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
    evaluate: evalComment,
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
    evaluate: evalPassthrough,
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
    evaluate: evalPassthrough,
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
    evaluate: evalPassthrough,
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
    evaluate: evalPassthrough,
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
    evaluate: evalPassthrough,
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
    evaluate: evalPassthrough,
  }),

  // ── Bus Logic Gates ────────────────────────────────────────────────────────
  cb({
    type: GATE_TYPE_BUS_AND4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC8,
    outputs: PINC4,
    width: 80,
    height: 110,
    symbol: "&4",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: evalBusAnd,
  }),
  cb({
    type: GATE_TYPE_BUS_AND8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC16,
    outputs: PINC8,
    width: 80,
    height: 200,
    symbol: "&8",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
    ],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: evalBusAnd,
  }),
  cb({
    type: GATE_TYPE_BUS_AND16,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: 32,
    outputs: PINC16,
    width: 80,
    height: 200,
    symbol: "&16",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
      "A11",
      "A12",
      "A13",
      "A14",
      "A15",
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
      "Y0",
      "Y1",
      "Y2",
      "Y3",
      "Y4",
      "Y5",
      "Y6",
      "Y7",
      "Y8",
      "Y9",
      "Y10",
      "Y11",
      "Y12",
      "Y13",
      "Y14",
      "Y15",
    ],
    evaluate: evalBusAnd,
  }),
  cb({
    type: GATE_TYPE_BUS_OR4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC8,
    outputs: PINC4,
    width: 80,
    height: 110,
    symbol: "≥4",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: evalBusOr,
  }),
  cb({
    type: GATE_TYPE_BUS_OR8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC16,
    outputs: PINC8,
    width: 80,
    height: 200,
    symbol: "≥8",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "B0",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
    ],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: evalBusOr,
  }),
  cb({
    type: GATE_TYPE_BUS_OR16,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: 32,
    outputs: PINC16,
    width: 80,
    height: 200,
    symbol: "≥16",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
      "A11",
      "A12",
      "A13",
      "A14",
      "A15",
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
      "Y0",
      "Y1",
      "Y2",
      "Y3",
      "Y4",
      "Y5",
      "Y6",
      "Y7",
      "Y8",
      "Y9",
      "Y10",
      "Y11",
      "Y12",
      "Y13",
      "Y14",
      "Y15",
    ],
    evaluate: evalBusOr,
  }),
  cb({
    type: GATE_TYPE_BUS_NOT4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC4,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "!4",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: ["A0", "A1", "A2", "A3"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: evalBusNot,
  }),
  cb({
    type: GATE_TYPE_BUS_NOT8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC8,
    outputs: PINC8,
    width: 80,
    height: 110,
    symbol: "!8",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: evalBusNot,
  }),
  cb({
    type: GATE_TYPE_BUS_NOT16,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC16,
    outputs: PINC16,
    width: 80,
    height: 200,
    symbol: "!16",
    isBusInput: true,
    isBusOutput: true,
    inputLabels: [
      "A0",
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8",
      "A9",
      "A10",
      "A11",
      "A12",
      "A13",
      "A14",
      "A15",
    ],
    outputLabels: [
      "Y0",
      "Y1",
      "Y2",
      "Y3",
      "Y4",
      "Y5",
      "Y6",
      "Y7",
      "Y8",
      "Y9",
      "Y10",
      "Y11",
      "Y12",
      "Y13",
      "Y14",
      "Y15",
    ],
    evaluate: evalBusNot,
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
    evaluate: evalUreg4,
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
    evaluate: evalUreg8,
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
      if (!comp.type.startsWith("CUSTOM_")) continue;
      if (comp.type === type) continue;
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
   * becomes an output port.
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
    const createInitialOutputs = (): Record<string, SignalValue[]> =>
      Object.fromEntries(
        executable.map(({ component, def }) => [
          component.id,
          new Array<SignalValue>(def.outputs).fill(ZERO),
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
        compOutputs?: Record<string, SignalValue[]>;
      } | null;
      const compStates = {
        ...createInitialStates(),
        ...(saved?.compStates ?? {}),
      };
      const savedOutputs = saved?.compOutputs ?? {};
      const signals: Record<string, SignalValue[]> = {};
      const priorSignals: Record<string, SignalValue[]> = {};

      for (const { component, def } of knownComps) {
        const prior = savedOutputs[component.id];
        const outputs =
          prior?.slice() ?? new Array<SignalValue>(def.outputs).fill(ZERO);

        signals[component.id] = outputs;
        priorSignals[component.id] = outputs.slice();
      }

      inputPorts.forEach((port, index) => {
        if (port.compId === "__CLK__") {
          const clkVal = externalInputs[index];
          const clkPrior = snapshotInputs?.[index] ?? externalInputs[index];

          for (const { component, def: clkDef } of clockComps) {
            for (let p = 0; p < clkDef.outputs; p += 1) {
              signals[component.id][p] = clkVal;
              priorSignals[component.id][p] = clkPrior;
            }
          }

          return;
        }

        signals[port.compId][port.pin] = externalInputs[index];
        priorSignals[port.compId][port.pin] =
          snapshotInputs?.[index] ?? externalInputs[index];
      });

      const readInputs = (
        compId: string,
        useSnapshot: boolean,
      ): SignalValue[] => {
        const target = compById.get(compId);

        if (!target) return [];

        const inputs = new Array<SignalValue>(target.def.inputs).fill(
          LogicValue.HIGH_IMPEDANCE,
        );
        const sourceSignals = useSnapshot ? priorSignals : signals;

        for (let pin = 0; pin < target.def.inputs; pin += 1) {
          const wire = inputWires.get(`${compId}${KEY_SEPARATOR}${pin}`);

          if (wire)
            inputs[pin] = sourceSignals[wire.fromComp]?.[wire.fromPin] ?? ZERO;
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
        (port) => readInputs(port.compId, false)[port.pin] ?? ZERO,
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
      isSequential: false,
      needsInputSnapshot: hasSequentialInternals,
      isClock: false,
      isInput: false,
      isOutput: false,
      isBusOutput: sinkComps.some(({ def: sinkDef }) => sinkDef.isBusInput),
      isBusInput: nonClockSourceComps.some(
        ({ def: srcDef }) => srcDef.isBusOutput,
      ),
      inputLabels,
      outputLabels,
      initialState: () => {
        const blankState = {
          compStates: createInitialStates(),
          compOutputs: createInitialOutputs(),
        };

        return evaluateCompiled(
          new Array<SignalValue>(numInputs).fill(LogicValue.HIGH_IMPEDANCE),
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

    for (const [cat, gates] of groups) {
      if (!ORDER.includes(cat)) result.push({ name: cat, gates });
    }

    return result;
  }
}

/** Singleton library used across the engine */
export const library = new ComponentLibrary();
