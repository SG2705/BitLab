import {
  GATE_CATEGORY_INPUT,
  GATE_TYPE_BUTTON,
  PINC0,
  PINC1,
} from "../../constants";
import { evalInput } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const ButtonInput: ComponentDefinition = hw({
  type: GATE_TYPE_BUTTON,
  label: "",
  category: GATE_CATEGORY_INPUT,
  inputs: PINC0,
  outputs: PINC1,
  width: 50,
  height: 50,
  symbol: "B",
  isSequential: false,
  isClock: false,
  isInput: true,
  isOutput: false,
  initialState: () => ({ on: false }),
  evaluate: evalInput,
});

export default ButtonInput;
