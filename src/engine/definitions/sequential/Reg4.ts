import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_REG4,
  PINC4,
  PINC5,
} from "../../constants";
import { evalReg4 } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const Reg4: ComponentDefinition = hw({
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
  initialState: () => ({ q: 0, prevClk: LogicValue.ZERO }),
  evaluate: evalReg4,
});

export default Reg4;
