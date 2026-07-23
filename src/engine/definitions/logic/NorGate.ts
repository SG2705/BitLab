import {
  GATE_CATEGORY_LOGIC,
  GATE_TYPE_NOR,
  PINC1,
  PINC2,
} from "../../constants";
import { evalGateNor } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const NorGate: ComponentDefinition = cb({
  type: GATE_TYPE_NOR,
  label: "",
  category: GATE_CATEGORY_LOGIC,
  inputs: PINC2,
  outputs: PINC1,
  width: 60,
  height: 60,
  symbol: "≥1̄",
  inputLabels: ["A", "B"],
  outputLabels: ["Y"],
  evaluate: evalGateNor,
});

export default NorGate;
