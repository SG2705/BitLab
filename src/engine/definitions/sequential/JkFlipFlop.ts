import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_JKFF,
  PINC2,
  PINC3,
} from "../../constants";
import { evalJkff } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const JkFlipFlop: ComponentDefinition = hw({
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
  initialState: () => ({ q: false, prevClk: LogicValue.ZERO }),
  evaluate: evalJkff,
});

export default JkFlipFlop;
