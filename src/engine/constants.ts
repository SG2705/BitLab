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
