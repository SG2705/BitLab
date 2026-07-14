import { defineMessages } from "react-intl";

// Localization
export const MESSAGES = defineMessages({
  lb_logic_gates: { id: "lb_logic_gates", defaultMessage: "Logic Gates" },
  lb_inputs: { id: "lb_inputs", defaultMessage: "Inputs" },
  lb_outputs: { id: "lb_outputs", defaultMessage: "Outputs" },
  lb_sequential: { id: "lb_sequential", defaultMessage: "Sequential" },
  lb_arithmetic: { id: "lb_arithmetic", defaultMessage: "Arithmetic" },
  lb_and: { id: "lb_and", defaultMessage: "AND" },
  lb_or: { id: "lb_or", defaultMessage: "OR" },
  lb_xor: { id: "lb_xor", defaultMessage: "XOR" },
  lb_xnor: { id: "lb_xnor", defaultMessage: "XNOR" },
  lb_nand: { id: "lb_nand", defaultMessage: "NAND" },
  lb_nor: { id: "lb_nor", defaultMessage: "NOR" },
  lb_not: { id: "lb_not", defaultMessage: "NOT" },
  lb_buffer: { id: "lb_buffer", defaultMessage: "Buffer" },
  lb_and_3: { id: "lb_and_3", defaultMessage: "AND-3" },
  lb_or_3: { id: "lb_or_3", defaultMessage: "OR-3" },
  lb_toggle: { id: "lb_toggle", defaultMessage: "Toggle" },
  lb_button: { id: "lb_button", defaultMessage: "Button" },
  lb_const: { id: "lb_const", defaultMessage: "Constant" },
  lb_clock: { id: "lb_clock", defaultMessage: "Clock" },
  lb_led: { id: "lb_led", defaultMessage: "LED" },
  lb_7_seg: { id: "lb_7_seg", defaultMessage: "7 Seg" },
  lb_sr_latch: { id: "lb_sr_latch", defaultMessage: "SR Latch" },
  lb_d_flip_flop: { id: "lb_d_flip_flop", defaultMessage: "D Flip-Flop" },
  lb_jk_flip_flop: { id: "lb_jk_flip_flop", defaultMessage: "JK Flip-Flop" },
  lb_t_flip_flop: { id: "lb_t_flip_flop", defaultMessage: "T Flip-Flop" },
  lb_halfadder: { id: "lb_halfadder", defaultMessage: "Half Adder" },
  lb_adder: { id: "lb_adder", defaultMessage: "Full Adder" },
  lb_mux_2_1: { id: "lb_mux_2_1", defaultMessage: "Mux 2:1" },
  lb_mux_4_1: { id: "lb_mux_4_1", defaultMessage: "Mux 4:1" },
  lb_dmux_1_2: { id: "lb_dmux_1_2", defaultMessage: "Demux 1:2" },
  lb_dcode_2_4: { id: "lb_dcode_2_4", defaultMessage: "Decoder 2:4" },
  lb_ecode_4_2: { id: "lb_ecode_4_2", defaultMessage: "Encoder 4:2" },
  lb_comparator: {
    id: "lb_comparator",
    defaultMessage: "Comparator",
  },
});

export type Messages = keyof typeof MESSAGES;

// Gates
export const GATE_CATEGORY_LOGIC = "gate_category-logic";
export const GATE_CATEGORY_INPUT = "gate_category-input";
export const GATE_CATEGORY_OUTPUT = "gate_category-output";
export const GATE_CATEGORY_SEQUENTIAL = "gate_category-sequential";
export const GATE_CATEGORY_ARITHMETIC = "gate_category-arithmetic";

export const GATE_CATEGORY_LABELS: Record<
  string,
  { en: string; messageKey: Messages }
> = {
  LOGIC: { en: "Logic Gates", messageKey: "lb_logic_gates" },
  INPUTS: { en: "Inputs", messageKey: "lb_inputs" },
  OUTPUTS: { en: "Outputs", messageKey: "lb_outputs" },
  SEQUENTIAL: { en: "Sequential", messageKey: "lb_sequential" },
  ARITHMETIC: { en: "Arithmetic", messageKey: "lb_arithmetic" },
};

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

// Project
export const FORMAT_VERSION = 1;
export const MAX_HISTORY = 100;
export const STORAGE_KEY = "digital-gate-project";
