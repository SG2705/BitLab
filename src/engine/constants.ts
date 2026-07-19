/**
 * Engine-level constants used by the simulation engine and its components.
 * These have zero UI/framework dependencies.
 */

// ── Gate Categories ──────────────────────────────────────────────────────────

export const GATE_CATEGORY_LOGIC = "gate_category-logic";
export const GATE_CATEGORY_INPUT = "gate_category-input";
export const GATE_CATEGORY_OUTPUT = "gate_category-output";
export const GATE_CATEGORY_SEQUENTIAL = "gate_category-sequential";
export const GATE_CATEGORY_ARITHMETIC = "gate_category-arithmetic";
export const GATE_CATEGORY_CUSTOM = "gate_category-custom";
export const GATE_CATEGORY_UTILITY = "gate_category-utility";

// ── Gate Types ───────────────────────────────────────────────────────────────

export const GATE_TYPE_AND = "AND";
export const GATE_TYPE_OR = "OR";
export const GATE_TYPE_XOR = "XOR";
export const GATE_TYPE_XNOR = "XNOR";
export const GATE_TYPE_NAND = "NAND";
export const GATE_TYPE_NOR = "NOR";
export const GATE_TYPE_NOT = "NOT";
export const GATE_TYPE_BUFFER = "BUFFER";
export const GATE_TYPE_AND3 = "AND3";
export const GATE_TYPE_AND4 = "AND4";
export const GATE_TYPE_AND8 = "AND8";
export const GATE_TYPE_AND16 = "AND16";
export const GATE_TYPE_OR3 = "OR3";
export const GATE_TYPE_OR4 = "OR4";
export const GATE_TYPE_OR8 = "OR8";
export const GATE_TYPE_OR16 = "OR16";
export const GATE_TYPE_NOT2 = "NOT2";
export const GATE_TYPE_NOT4 = "NOT4";
export const GATE_TYPE_NOT8 = "NOT8";
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
export const GATE_TYPE_PROBE = "PROBE";
export const GATE_TYPE_SPLITTER = "SPLITTER";
export const GATE_TYPE_COMMENT = "COMMENT";
export const GATE_TYPE_DIGIT_BIN = "DIGIT_BIN";
export const GATE_TYPE_BUS4 = "BUS4";
export const GATE_TYPE_BUS8 = "BUS8";
export const GATE_TYPE_BUS16 = "BUS16";
export const GATE_TYPE_DEBUS4 = "DEBUS4";
export const GATE_TYPE_DEBUS8 = "DEBUS8";
export const GATE_TYPE_DEBUS16 = "DEBUS16";
export const GATE_TYPE_UREG4 = "UREG4";
export const GATE_TYPE_UREG8 = "UREG8";
export const GATE_TYPE_BUS_DISPLAY = "BUS_DISPLAY";
export const GATE_TYPE_BUS_DISPLAY8 = "BUS_DISPLAY8";
export const GATE_TYPE_BUS_DISPLAY16 = "BUS_DISPLAY16";
export const GATE_TYPE_VCC = "VCC";
export const GATE_TYPE_GND = "GND";
export const GATE_TYPE_BUS_INPUT4 = "BUS_INPUT4";
export const GATE_TYPE_BUS_INPUT8 = "BUS_INPUT8";
export const GATE_TYPE_BUS_INPUT16 = "BUS_INPUT16";
export const GATE_TYPE_BUS_AND4 = "BUS_AND4";
export const GATE_TYPE_BUS_AND8 = "BUS_AND8";
export const GATE_TYPE_BUS_AND16 = "BUS_AND16";
export const GATE_TYPE_BUS_OR4 = "BUS_OR4";
export const GATE_TYPE_BUS_OR8 = "BUS_OR8";
export const GATE_TYPE_BUS_OR16 = "BUS_OR16";
export const GATE_TYPE_BUS_NOT4 = "BUS_NOT4";
export const GATE_TYPE_BUS_NOT8 = "BUS_NOT8";
export const GATE_TYPE_BUS_NOT16 = "BUS_NOT16";

// ── Engine Events & Status ───────────────────────────────────────────────────

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

// ── Simulation ───────────────────────────────────────────────────────────────

export const TICKS_PER_CYCLE = 2;
export const DEFAULT_PROBE_SAMPLES = 16;

// ── Project / Persistence ────────────────────────────────────────────────────

export const VERSION = 1;
export const MAX_HISTORY = 100;
export const CURR_CIR_KEY = "current-circuit-key";

// ── Internal ─────────────────────────────────────────────────────────────────

export const KEY_SEPARATOR = ":";

/** Separator marker used in GATE_ORDER to insert a visual divider in the category panel */
export const GATE_SEPARATOR = "---";

// ── Pin Count Constants ──────────────────────────────────────────────────────

export const PINC0 = 0;
export const PINC1 = 1;
export const PINC2 = 2;
export const PINC3 = 3;
export const PINC4 = 4;
export const PINC5 = 5;
export const PINC6 = 6;
export const PINC8 = 8;
export const PINC9 = 9;
export const PINC11 = 11;
export const PINC16 = 16;

export const PIN_COUNT_HEIGHT: Record<number, number> = {
  [PINC0]: 35,
  [PINC1]: 50,
  [PINC2]: 65,
  [PINC3]: 70,
  [PINC4]: 85,
  [PINC5]: 95,
  [PINC6]: 90,
  [PINC8]: 115,
  [PINC9]: 130,
  [PINC11]: 160,
  [PINC16]: 200,
};

// ── Label map ──────────────────────────────────────────────────────
export const LB_MAP: Record<string, string> = {
  [GATE_TYPE_AND]: "lb_and",
  [GATE_TYPE_AND3]: "lb_and_3",
  [GATE_TYPE_AND4]: "lb_and_4",
  [GATE_TYPE_AND8]: "lb_and_8",
  [GATE_TYPE_AND16]: "lb_and_16",
  [GATE_TYPE_OR]: "lb_or",
  [GATE_TYPE_OR3]: "lb_or_3",
  [GATE_TYPE_OR4]: "lb_or_4",
  [GATE_TYPE_OR8]: "lb_or_8",
  [GATE_TYPE_OR16]: "lb_or_16",
  [GATE_TYPE_XOR]: "lb_xor",
  [GATE_TYPE_XNOR]: "lb_xnor",
  [GATE_TYPE_NAND]: "lb_nand",
  [GATE_TYPE_NOR]: "lb_nor",
  [GATE_TYPE_NOT]: "lb_not",
  [GATE_TYPE_NOT2]: "lb_not_2",
  [GATE_TYPE_NOT4]: "lb_not_4",
  [GATE_TYPE_NOT8]: "lb_not_8",
  [GATE_TYPE_BUFFER]: "lb_buffer",
  [GATE_TYPE_TOGGLE]: "lb_toggle",
  [GATE_TYPE_BUTTON]: "lb_button",
  [GATE_TYPE_CONST]: "lb_const",
  [GATE_TYPE_CLOCK]: "lb_clock",
  [GATE_TYPE_DIGIT_BIN]: "lb_digit_bin",
  [GATE_TYPE_LED]: "lb_led",
  [GATE_TYPE_DISPLAY7]: "lb_7_seg",
  [GATE_TYPE_PROBE]: "lb_probe",
  [GATE_TYPE_SR_LATCH]: "lb_sr_latch",
  [GATE_TYPE_DFF]: "lb_d_flip_flop",
  [GATE_TYPE_JKFF]: "lb_jk_flip_flop",
  [GATE_TYPE_TIFF]: "lb_t_flip_flop",
  [GATE_TYPE_DLATCH]: "lb_dlatch",
  [GATE_TYPE_REG4]: "lb_reg4",
  [GATE_TYPE_COUNTER4]: "lb_counter4",
  [GATE_TYPE_SHREG4]: "lb_shreg4",
  [GATE_TYPE_HALF_ADDER]: "lb_halfadder",
  [GATE_TYPE_FULL_ADDER]: "lb_adder",
  [GATE_TYPE_MUX2]: "lb_mux_2_1",
  [GATE_TYPE_MUX4]: "lb_mux_4_1",
  [GATE_TYPE_MUX8]: "lb_mux8",
  [GATE_TYPE_DEMUX2]: "lb_dmux_1_2",
  [GATE_TYPE_DECODER2]: "lb_dcode_2_4",
  [GATE_TYPE_DECODER3]: "lb_decoder3",
  [GATE_TYPE_ENCODER4]: "lb_ecode_4_2",
  [GATE_TYPE_COMPARATOR]: "lb_comparator",
  [GATE_TYPE_CMP4]: "lb_cmp4",
  [GATE_TYPE_HALF_SUB]: "lb_half_sub",
  [GATE_TYPE_FULL_SUB]: "lb_full_sub",
  [GATE_TYPE_SPLITTER]: "lb_splitter",
  [GATE_TYPE_COMMENT]: "lb_comment",
  [GATE_TYPE_BUS4]: "lb_bus4",
  [GATE_TYPE_BUS8]: "lb_bus8",
  [GATE_TYPE_BUS16]: "lb_bus16",
  [GATE_TYPE_DEBUS4]: "lb_debus4",
  [GATE_TYPE_DEBUS8]: "lb_debus8",
  [GATE_TYPE_DEBUS16]: "lb_debus16",
  [GATE_TYPE_UREG4]: "lb_ureg4",
  [GATE_TYPE_UREG8]: "lb_ureg8",
  [GATE_TYPE_VCC]: "lb_vcc",
  [GATE_TYPE_GND]: "lb_gnd",
  [GATE_TYPE_BUS_INPUT4]: "lb_bus_input4",
  [GATE_TYPE_BUS_INPUT8]: "lb_bus_input8",
  [GATE_TYPE_BUS_INPUT16]: "lb_bus_input16",
  [GATE_TYPE_BUS_AND4]: "lb_bus_and4",
  [GATE_TYPE_BUS_AND8]: "lb_bus_and8",
  [GATE_TYPE_BUS_AND16]: "lb_bus_and16",
  [GATE_TYPE_BUS_OR4]: "lb_bus_or4",
  [GATE_TYPE_BUS_OR8]: "lb_bus_or8",
  [GATE_TYPE_BUS_OR16]: "lb_bus_or16",
  [GATE_TYPE_BUS_NOT4]: "lb_bus_not4",
  [GATE_TYPE_BUS_NOT8]: "lb_bus_not8",
  [GATE_TYPE_BUS_NOT16]: "lb_bus_not16",
  [GATE_TYPE_BUS_DISPLAY]: "lb_bus_display",
  [GATE_TYPE_BUS_DISPLAY8]: "lb_bus_display8",
  [GATE_TYPE_BUS_DISPLAY16]: "lb_bus_display16",
} as const;
