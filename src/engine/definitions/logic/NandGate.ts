import {
  GATE_CATEGORY_LOGIC,
  GATE_TYPE_NAND,
  PINC1,
  PINC2,
} from "../../constants";
import { evalGateNand } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const NandGate: ComponentDefinition = cb({
  type: GATE_TYPE_NAND,
  label: "",
  category: GATE_CATEGORY_LOGIC,
  inputs: PINC2,
  outputs: PINC1,
  width: 60,
  height: 60,
  symbol: "&̄",
  inputLabels: ["A", "B"],
  outputLabels: ["Y"],
  evaluate: evalGateNand,
});

export default NandGate;
