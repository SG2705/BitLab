import {
  GATE_CATEGORY_LOGIC,
  GATE_TYPE_XNOR,
  PINC1,
  PINC2,
} from "../../constants";
import { evalGateXnor } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const XnorGate: ComponentDefinition = cb({
  type: GATE_TYPE_XNOR,
  label: "",
  category: GATE_CATEGORY_LOGIC,
  inputs: PINC2,
  outputs: PINC1,
  width: 60,
  height: 60,
  symbol: "=",
  inputLabels: ["A", "B"],
  outputLabels: ["Y"],
  evaluate: evalGateXnor,
});

export default XnorGate;
