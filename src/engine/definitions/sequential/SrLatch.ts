import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_SR_LATCH,
  PINC2,
} from "../../constants";
import { evalSrLatch } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const SrLatch: ComponentDefinition = hw({
  type: GATE_TYPE_SR_LATCH,
  label: "",
  category: GATE_CATEGORY_SEQUENTIAL,
  inputs: PINC2,
  outputs: PINC2,
  width: 80,
  height: 70,
  symbol: "SR",
  isSequential: false,
  isClock: false,
  isInput: false,
  isOutput: false,
  inputLabels: ["S", "R"],
  outputLabels: ["Q", "Q'"],
  initialState: () => ({ q: false }),
  evaluate: evalSrLatch,
});

export default SrLatch;
