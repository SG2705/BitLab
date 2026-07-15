import { defineMessages } from "react-intl";

import { type CircuitSnapshot } from "@/engine";

// Localization
export const MESSAGES = defineMessages({
  lb_custom: { id: "Sjo1P4", defaultMessage: "Custom" },
  lb_logic_gates: { id: "M+am2n", defaultMessage: "Logic Gates" },
  lb_inputs: { id: "wS/QCK", defaultMessage: "Inputs" },
  lb_outputs: { id: "+VMoL/", defaultMessage: "Outputs" },
  lb_sequential: { id: "KWFusF", defaultMessage: "Sequential" },
  lb_arithmetic: { id: "qEOrHH", defaultMessage: "Arithmetic" },
  lb_and: { id: "UGU8kA", defaultMessage: "AND" },
  lb_or: { id: "INlWvJ", defaultMessage: "OR" },
  lb_xor: { id: "0t4zU/", defaultMessage: "XOR" },
  lb_xnor: { id: "rS8jJE", defaultMessage: "XNOR" },
  lb_nand: { id: "ocyr/d", defaultMessage: "NAND" },
  lb_nor: { id: "cwHYMN", defaultMessage: "NOR" },
  lb_not: { id: "jOgiMP", defaultMessage: "NOT" },
  lb_buffer: { id: "k5fiSA", defaultMessage: "Buffer" },
  lb_and_3: { id: "uPTSs/", defaultMessage: "AND-3" },
  lb_or_3: { id: "kjUTRa", defaultMessage: "OR-3" },
  lb_toggle: { id: "LaoRGw", defaultMessage: "Toggle" },
  lb_button: { id: "KP63fg", defaultMessage: "Button" },
  lb_const: { id: "G3+QfR", defaultMessage: "Constant" },
  lb_clock: { id: "qCyPKf", defaultMessage: "Clock" },
  lb_led: { id: "sPjOJQ", defaultMessage: "LED" },
  lb_7_seg: { id: "Qu+roW", defaultMessage: "7 Seg" },
  lb_sr_latch: { id: "a3I/Dc", defaultMessage: "SR Latch" },
  lb_d_flip_flop: { id: "PJTLiq", defaultMessage: "D Flip-Flop" },
  lb_jk_flip_flop: { id: "0s79PB", defaultMessage: "JK Flip-Flop" },
  lb_t_flip_flop: { id: "hxKJOS", defaultMessage: "T Flip-Flop" },
  lb_halfadder: { id: "m0Naku", defaultMessage: "Half Adder" },
  lb_adder: { id: "aUbg5p", defaultMessage: "Full Adder" },
  lb_mux_2_1: { id: "uEqOPm", defaultMessage: "Mux 2:1" },
  lb_mux_4_1: { id: "DYWVqY", defaultMessage: "Mux 4:1" },
  lb_dmux_1_2: { id: "oX0iuy", defaultMessage: "Demux 1:2" },
  lb_dcode_2_4: { id: "UVS4sK", defaultMessage: "Decoder 2:4" },
  lb_ecode_4_2: { id: "/VTiBR", defaultMessage: "Encoder 4:2" },
  lb_comparator: {
    id: "VAZneg",
    defaultMessage: "Comparator",
  },
  lb_dlatch: { id: "DPeP5H", defaultMessage: "D Latch" },
  lb_reg4: { id: "n+hlL2", defaultMessage: "Register 4" },
  lb_counter4: { id: "+ObDCx", defaultMessage: "Counter 4" },
  lb_shreg4: { id: "H63+mc", defaultMessage: "Shift Reg 4" },
  lb_decoder3: { id: "2uOC49", defaultMessage: "Decoder 3:8" },
  lb_mux8: { id: "e7nK/h", defaultMessage: "Mux 8:1" },
  lb_half_sub: { id: "X/SJAt", defaultMessage: "Half Sub" },
  lb_full_sub: { id: "oNcdXR", defaultMessage: "Full Sub" },
  lb_cmp4: { id: "2I9fUV", defaultMessage: "Comparator 4" },
  lb_tribuf: { id: "/Hbmdf", defaultMessage: "Tri-State" },
});

export type Messages = keyof typeof MESSAGES;

// Gates
export const GATE_CATEGORY_LOGIC = "gate_category-logic";
export const GATE_CATEGORY_INPUT = "gate_category-input";
export const GATE_CATEGORY_OUTPUT = "gate_category-output";
export const GATE_CATEGORY_SEQUENTIAL = "gate_category-sequential";
export const GATE_CATEGORY_ARITHMETIC = "gate_category-arithmetic";
export const GATE_CATEGORY_CUSTOM = "gate_category-custom";

export const GATE_TYPE_AND = "AND";
export const GATE_TYPE_OR = "OR";
export const GATE_TYPE_XOR = "XOR";
export const GATE_TYPE_XNOR = "XNOR";
export const GATE_TYPE_NAND = "NAND";
export const GATE_TYPE_NOR = "NOR";
export const GATE_TYPE_NOT = "NOT";
export const GATE_TYPE_BUFFER = "BUFFER";
export const GATE_TYPE_AND3 = "AND3";
export const GATE_TYPE_OR3 = "OR3";
export const GATE_TYPE_TOGGLE = "TOGGLE";
export const GATE_TYPE_BUTTON = "BUTTON";
export const GATE_TYPE_CONST = "CONST";
export const GATE_TYPE_CLOCK = "CLOCK";
export const GATE_TYPE_LED = "LED";
export const GATE_TYPE_DISPLAY7 = "DISPLAY7";
export const GATE_TYPE_SR_LATCH = "SR_LATCH";
export const GATE_TYPE_DFF = "DFF";
export const GATE_TYPE_JKFF = "JKFF";
export const GATE_TYPE_TIFF = "TIFF";
export const GATE_TYPE_HALF_ADDER = "HALF_ADDER";
export const GATE_TYPE_FULL_ADDER = "FULL_ADDER";
export const GATE_TYPE_MUX2 = "MUX2";
export const GATE_TYPE_MUX4 = "MUX4";
export const GATE_TYPE_DEMUX2 = "DEMUX2";
export const GATE_TYPE_DECODER2 = "DECODER2";
export const GATE_TYPE_ENCODER4 = "ENCODER4";
export const GATE_TYPE_COMPARATOR = "COMPARATOR";
export const GATE_TYPE_DLATCH = "DLATCH";
export const GATE_TYPE_REG4 = "REG4";
export const GATE_TYPE_COUNTER4 = "COUNTER4";
export const GATE_TYPE_SHREG4 = "SHREG4";
export const GATE_TYPE_DECODER3 = "DECODER3";
export const GATE_TYPE_MUX8 = "MUX8";
export const GATE_TYPE_HALF_SUB = "HALF_SUB";
export const GATE_TYPE_FULL_SUB = "FULL_SUB";
export const GATE_TYPE_CMP4 = "CMP4";
export const GATE_TYPE_TRIBUF = "TRIBUF";

// Wires
export const WIRE_TYPE = {
  BEZIER: "bezier",
  ORTHO: "ortho",
};

// Engine
export const ENGINE_EVENT_TYPE = {
  SNAPSHOT_CHANGED: "snapshot-changed",
  SIGNAL_CHANGED: "signal-changed",
  COMPONENT_ADDED: "component-added",
  COMPONENT_REMOVED: "component-removed",
  WIRE_ADDED: "wire-added",
  WIRE_REMOVED: "wire-removed",
  TICK: "tick",
  STARTED: "started",
  PAUSED: "paused",
  RESET: "reset",
  OSCILLATION: "oscillation",
  ERROR: "error",
};

export const SIMULATION_STATUS = {
  IDLE: "idle",
  RUNNING: "running",
  PAUSED: "paused",
};

// Circuit

export const PIN_KIND = {
  IN: "in",
  OUT: "out",
};

// Project
export const VERSION = 1;
export const MAX_HISTORY = 100;
export const CURR_CIR_KEY = "current-circuit-key";
export const CUSTOM_CIR_KEYS = "custom-circuit-keys";
export const DEFAULT_CLOCK = 4;
export const EMPTY_SNAPSHOT: CircuitSnapshot = { components: {}, wires: {} };

// App
export const THEME = {
  DARK: "dark",
  LIGHT: "light",
};
export const CONSOLE_TAB = {
  LOG: "log",
  ERROR: "err",
  WARN: "warn",
  TIMELINE: "timeline",
  PERF: "perf",
};
export const BASE_LOG = {
  t: 0,
  kind: CONSOLE_TAB.LOG,
  msg: "BitLab ready. Drag components from the toolbox to get started.",
};
export const GRID = 20;
export const TOOL = {
  SELECT: "select",
  PAN: "pan",
};

// Labels
export const GATE_CATEGORY_LABELS: Record<
  string,
  { en: string; messageKey: Messages }
> = {
  [GATE_CATEGORY_LOGIC]: { en: "Logic Gates", messageKey: "lb_logic_gates" },
  [GATE_CATEGORY_INPUT]: { en: "Inputs", messageKey: "lb_inputs" },
  [GATE_CATEGORY_OUTPUT]: { en: "Outputs", messageKey: "lb_outputs" },
  [GATE_CATEGORY_SEQUENTIAL]: { en: "Sequential", messageKey: "lb_sequential" },
  [GATE_CATEGORY_ARITHMETIC]: { en: "Arithmetic", messageKey: "lb_arithmetic" },
  [GATE_CATEGORY_CUSTOM]: { en: "Custom", messageKey: "lb_custom" },
};

export const GATE_TYPE_LABELS: Record<
  string,
  { en: string; messageKey: Messages }
> = {
  [GATE_TYPE_AND]: { en: "AND", messageKey: "lb_and" },
  [GATE_TYPE_OR]: { en: "OR", messageKey: "lb_or" },
  [GATE_TYPE_XOR]: { en: "XOR", messageKey: "lb_xor" },
  [GATE_TYPE_XNOR]: { en: "XNOR", messageKey: "lb_xnor" },
  [GATE_TYPE_NAND]: { en: "NAND", messageKey: "lb_nand" },
  [GATE_TYPE_NOR]: { en: "NOR", messageKey: "lb_nor" },
  [GATE_TYPE_NOT]: { en: "NOT", messageKey: "lb_not" },
  [GATE_TYPE_BUFFER]: { en: "Buffer", messageKey: "lb_buffer" },
  [GATE_TYPE_AND3]: { en: "AND-3", messageKey: "lb_and_3" },
  [GATE_TYPE_OR3]: { en: "OR-3", messageKey: "lb_or_3" },
  [GATE_TYPE_TOGGLE]: { en: "Toggle", messageKey: "lb_toggle" },
  [GATE_TYPE_BUTTON]: { en: "Button", messageKey: "lb_button" },
  [GATE_TYPE_CONST]: { en: "Constant", messageKey: "lb_const" },
  [GATE_TYPE_CLOCK]: { en: "Clock", messageKey: "lb_clock" },
  [GATE_TYPE_LED]: { en: "LED", messageKey: "lb_led" },
  [GATE_TYPE_DISPLAY7]: { en: "7 Seg", messageKey: "lb_7_seg" },
  [GATE_TYPE_SR_LATCH]: { en: "SR Latch", messageKey: "lb_sr_latch" },
  [GATE_TYPE_DFF]: { en: "D Flip-Flop", messageKey: "lb_d_flip_flop" },
  [GATE_TYPE_JKFF]: { en: "JK Flip-Flop", messageKey: "lb_jk_flip_flop" },
  [GATE_TYPE_TIFF]: { en: "T Flip-Flop", messageKey: "lb_t_flip_flop" },
  [GATE_TYPE_HALF_ADDER]: { en: "Half Adder", messageKey: "lb_halfadder" },
  [GATE_TYPE_FULL_ADDER]: { en: "Full Adder", messageKey: "lb_adder" },
  [GATE_TYPE_MUX2]: { en: "Mux 2:1", messageKey: "lb_mux_2_1" },
  [GATE_TYPE_MUX4]: { en: "Mux 4:1", messageKey: "lb_mux_4_1" },
  [GATE_TYPE_DEMUX2]: { en: "Demux 1:2", messageKey: "lb_dmux_1_2" },
  [GATE_TYPE_DECODER2]: { en: "Decoder 2:4", messageKey: "lb_dcode_2_4" },
  [GATE_TYPE_ENCODER4]: { en: "Encoder 4:2", messageKey: "lb_ecode_4_2" },
  [GATE_TYPE_COMPARATOR]: { en: "Comparator", messageKey: "lb_comparator" },
  [GATE_TYPE_DLATCH]: { en: "D Latch", messageKey: "lb_dlatch" },
  [GATE_TYPE_REG4]: { en: "Register 4", messageKey: "lb_reg4" },
  [GATE_TYPE_COUNTER4]: { en: "Counter 4", messageKey: "lb_counter4" },
  [GATE_TYPE_SHREG4]: { en: "Shift Reg 4", messageKey: "lb_shreg4" },
  [GATE_TYPE_DECODER3]: { en: "Decoder 3:8", messageKey: "lb_decoder3" },
  [GATE_TYPE_MUX8]: { en: "Mux 8:1", messageKey: "lb_mux8" },
  [GATE_TYPE_HALF_SUB]: { en: "Half Sub", messageKey: "lb_half_sub" },
  [GATE_TYPE_FULL_SUB]: { en: "Full Sub", messageKey: "lb_full_sub" },
  [GATE_TYPE_CMP4]: { en: "Comparator 4", messageKey: "lb_cmp4" },
  [GATE_TYPE_TRIBUF]: { en: "Tri-State", messageKey: "lb_tribuf" },
};
