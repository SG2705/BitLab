import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_DFF,
  PINC2,
} from "../../constants";
import { evalDff } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const DFlipFlop: ComponentDefinition = hw({
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
  initialState: () => ({ q: false, prevClk: LogicValue.ZERO }),
  evaluate: evalDff,
});

export default DFlipFlop;
