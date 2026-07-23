import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_COUNTER4,
  PINC2,
  PINC4,
} from "../../constants";
import { evalCounter4 } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const Counter4: ComponentDefinition = hw({
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
  initialState: () => ({ count: 0, prevClk: LogicValue.ZERO }),
  evaluate: evalCounter4,
});

export default Counter4;
