import {
  GATE_CATEGORY_INPUT,
  GATE_TYPE_CONST,
  PINC0,
  PINC1,
} from "../../constants";
import { evalInput } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const ConstInput: ComponentDefinition = hw({
  type: GATE_TYPE_CONST,
  label: "",
  category: GATE_CATEGORY_INPUT,
  inputs: PINC0,
  outputs: PINC1,
  width: 50,
  height: 40,
  symbol: "1",
  isSequential: false,
  isClock: false,
  isInput: true,
  isOutput: false,
  initialState: () => ({ on: true }),
  evaluate: evalInput,
});

export default ConstInput;
