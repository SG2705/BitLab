import {
  GATE_CATEGORY_INPUT,
  GATE_TYPE_VCC,
  PINC0,
  PINC1,
} from "../../constants";
import { evalVcc } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const VccRail: ComponentDefinition = hw({
  type: GATE_TYPE_VCC,
  label: "",
  category: GATE_CATEGORY_INPUT,
  inputs: PINC0,
  outputs: PINC1,
  width: 50,
  height: 40,
  symbol: "5V",
  isSequential: false,
  isClock: false,
  isInput: false,
  isOutput: false,
  initialState: () => ({ on: true }),
  evaluate: evalVcc,
});

export default VccRail;
