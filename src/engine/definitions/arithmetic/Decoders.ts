import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_TYPE_DECODER2,
  GATE_TYPE_DECODER3,
  GATE_TYPE_ENCODER4,
  PINC2,
  PINC3,
  PINC4,
  PINC8,
} from "../../constants";
import { evalDecoder2, evalDecoder3, evalEncoder4 } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const Decoders: ComponentDefinition[] = [
  cb({
    type: GATE_TYPE_DECODER2,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC2,
    outputs: PINC4,
    width: 80,
    height: 80,
    symbol: "DEC",
    inputLabels: ["A", "B"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: evalDecoder2,
  }),
  cb({
    type: GATE_TYPE_DECODER3,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC3,
    outputs: PINC8,
    width: 80,
    height: 120,
    symbol: "3:8",
    inputLabels: ["A", "B", "C"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: evalDecoder3,
  }),
  cb({
    type: GATE_TYPE_ENCODER4,
    label: "",
    category: GATE_CATEGORY_ARITHMETIC,
    inputs: PINC4,
    outputs: PINC2,
    width: 80,
    height: 80,
    symbol: "ENC",
    inputLabels: ["D0", "D1", "D2", "D3"],
    outputLabels: ["A", "B"],
    evaluate: evalEncoder4,
  }),
];

export default Decoders;
