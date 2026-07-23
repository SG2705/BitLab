import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_TYPE_FULL_SUB,
  GATE_TYPE_HALF_SUB,
  PINC2,
  PINC3,
} from "../../constants";
import { evalFullSub, evalHalfSub } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const Subtractors: ComponentDefinition[] = [
  cb({
    type: GATE_TYPE_HALF_SUB,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 60,
    symbol: "½−",
    inputLabels: ["A", "B"],
    outputLabels: ["D", "Bo"],
    evaluate: evalHalfSub,
  }),
  cb({
    type: GATE_TYPE_FULL_SUB,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "Σ−",
    inputLabels: ["A", "B", "Bin"],
    outputLabels: ["D", "Bo"],
    evaluate: evalFullSub,
  }),
];

export default Subtractors;
