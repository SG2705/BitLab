import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_TIFF,
  PINC2,
} from "../../constants";
import { evalTiff } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const TFlipFlop: ComponentDefinition = hw({
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
  initialState: () => ({ q: false, prevClk: LogicValue.ZERO }),
  evaluate: evalTiff,
});

export default TFlipFlop;
