import {
  GATE_CATEGORY_INPUT,
  GATE_TYPE_GND,
  PINC0,
  PINC1,
} from "../../constants";
import { evalGnd } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const GndRail: ComponentDefinition = hw({
  type: GATE_TYPE_GND,
  label: "",
  category: GATE_CATEGORY_INPUT,
  inputs: PINC0,
  outputs: PINC1,
  width: 50,
  height: 40,
  symbol: "⏚",
  isSequential: false,
  isClock: false,
  isInput: false,
  isOutput: false,
  initialState: () => ({ on: false }),
  evaluate: evalGnd,
});

export default GndRail;
