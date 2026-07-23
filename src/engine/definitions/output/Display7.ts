import {
  GATE_CATEGORY_OUTPUT,
  GATE_TYPE_DISPLAY7,
  PINC0,
  PINC4,
} from "../../constants";
import { evalDisplay7 } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const Display7: ComponentDefinition = hw({
  type: GATE_TYPE_DISPLAY7,
  label: "",
  category: GATE_CATEGORY_OUTPUT,
  inputs: PINC4,
  outputs: PINC0,
  width: 80,
  height: 90,
  symbol: "7",
  isSequential: false,
  isClock: false,
  isInput: false,
  isOutput: true,
  inputLabels: ["D0", "D1", "D2", "D3"],
  initialState: () => ({ value: 0 }),
  evaluate: evalDisplay7,
});

export default Display7;
