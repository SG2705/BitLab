import {
  GATE_CATEGORY_INPUT,
  GATE_TYPE_DIGIT_BIN,
  PINC0,
  PINC4,
} from "../../constants";
import { evalDigitBin } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const DigitBinInput: ComponentDefinition = hw({
  type: GATE_TYPE_DIGIT_BIN,
  label: "",
  category: GATE_CATEGORY_INPUT,
  inputs: PINC0,
  outputs: PINC4,
  width: 80,
  height: 80,
  outputLabels: ["B0", "B1", "B2", "B3"],
  isSequential: false,
  isClock: false,
  isInput: true,
  isOutput: false,
  initialState: () => ({ digit: 0 }),
  evaluate: evalDigitBin,
});

export default DigitBinInput;
