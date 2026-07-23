import {
  GATE_CATEGORY_OUTPUT,
  GATE_TYPE_PROBE,
  PINC0,
  PINC1,
} from "../../constants";
import { evalProbe } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const Probe: ComponentDefinition = hw({
  type: GATE_TYPE_PROBE,
  label: "",
  category: GATE_CATEGORY_OUTPUT,
  inputs: PINC1,
  outputs: PINC0,
  width: 120,
  height: 70,
  inputLabels: ["IN"],
  isSequential: false,
  samplesEveryTick: true,
  isClock: false,
  isInput: false,
  isOutput: true,
  initialState: () => ({ history: [] as Array<{ v: boolean; t: number }> }),
  evaluate: evalProbe,
});

export default Probe;
