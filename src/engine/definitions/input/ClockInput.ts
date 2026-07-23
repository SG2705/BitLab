import {
  GATE_CATEGORY_INPUT,
  GATE_TYPE_CLOCK,
  PINC0,
  PINC1,
} from "../../constants";
import { evalClockTick, evalInput } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const ClockInput: ComponentDefinition = hw({
  type: GATE_TYPE_CLOCK,
  label: "",
  category: GATE_CATEGORY_INPUT,
  inputs: PINC0,
  outputs: PINC1,
  width: 50,
  height: 50,
  symbol: "⏲",
  isSequential: false,
  isClock: true,
  isInput: false,
  isOutput: false,
  initialState: () => ({ on: false }),
  evaluate: evalInput,
  tick: evalClockTick,
});

export default ClockInput;
