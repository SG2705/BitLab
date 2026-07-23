import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_TYPE_FULL_ADDER,
  GATE_TYPE_HALF_ADDER,
  PINC2,
  PINC3,
} from "../../constants";
import { evalFullAdder, evalHalfAdder } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const Adders: ComponentDefinition[] = [
  cb({
    type: GATE_TYPE_HALF_ADDER,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 80,
    height: 60,
    symbol: "½+",
    inputLabels: ["A", "B"],
    outputLabels: ["S", "C"],
    evaluate: evalHalfAdder,
  }),
  cb({
    type: GATE_TYPE_FULL_ADDER,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC2,
    width: 80,
    height: 70,
    symbol: "Σ",
    inputLabels: ["A", "B", "Cin"],
    outputLabels: ["S", "Co"],
    evaluate: evalFullAdder,
  }),
];

export default Adders;
