import {
  GATE_CATEGORY_OUTPUT,
  GATE_TYPE_LED,
  PINC0,
  PINC1,
} from "../../constants";
import { evalLed } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const Led: ComponentDefinition = hw({
  type: GATE_TYPE_LED,
  label: "",
  category: GATE_CATEGORY_OUTPUT,
  inputs: PINC1,
  outputs: PINC0,
  width: 50,
  height: 50,
  symbol: "◉",
  isSequential: false,
  isClock: false,
  isInput: false,
  isOutput: true,
  initialState: () => ({ on: false }),
  evaluate: evalLed,
});

export default Led;
