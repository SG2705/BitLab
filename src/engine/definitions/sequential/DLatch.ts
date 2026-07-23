import {
  GATE_CATEGORY_SEQUENTIAL,
  GATE_TYPE_DLATCH,
  PINC2,
} from "../../constants";
import { evalDlatch } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const DLatch: ComponentDefinition = hw({
  type: GATE_TYPE_DLATCH,
  label: "",
  category: GATE_CATEGORY_SEQUENTIAL,
  inputs: PINC2,
  outputs: PINC2,
  width: 80,
  height: 70,
  symbol: "DL",
  isSequential: false,
  isClock: false,
  isInput: false,
  isOutput: false,
  inputLabels: ["D", "E"],
  outputLabels: ["Q", "Q'"],
  initialState: () => ({ q: false }),
  evaluate: evalDlatch,
});

export default DLatch;
