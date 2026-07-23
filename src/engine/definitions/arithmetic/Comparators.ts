import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_TYPE_CMP4,
  GATE_TYPE_COMPARATOR,
  PINC2,
  PINC3,
  PINC8,
} from "../../constants";
import { evalCmp4, evalComparator } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const Comparators: ComponentDefinition[] = [
  cb({
    type: GATE_TYPE_COMPARATOR,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC3,
    width: 80,
    height: 70,
    symbol: "CMP",
    inputLabels: ["A", "B"],
    outputLabels: ["<", "=", ">"],
    evaluate: evalComparator,
  }),
  cb({
    type: GATE_TYPE_CMP4,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC8,
    outputs: PINC3,
    width: 80,
    height: 120,
    symbol: "≥≤",
    inputLabels: ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3"],
    outputLabels: ["<", "=", ">"],
    evaluate: evalCmp4,
  }),
];

export default Comparators;
