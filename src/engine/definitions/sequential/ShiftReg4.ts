import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_SHREG4,
  PINC3,
  PINC4,
} from "../../constants";
import { evalShreg4 } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const ShiftReg4: ComponentDefinition = hw({
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
  initialState: () => ({ bits: 0, prevClk: LogicValue.ZERO }),
  evaluate: evalShreg4,
});

export default ShiftReg4;
