import {
  GATE_CATEGORY_LOGIC,
  GATE_TYPE_XOR,
  PINC1,
  PINC2,
} from "../../constants";
import { evalGateXor } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const XorGate: ComponentDefinition = cb({
  type: GATE_TYPE_XOR,
  label: "",
  category: GATE_CATEGORY_LOGIC,
  inputs: PINC2,
  outputs: PINC1,
  width: 60,
  height: 60,
  symbol: "=1",
  inputLabels: ["A", "B"],
  outputLabels: ["Y"],
  evaluate: evalGateXor,
});

export default XorGate;
