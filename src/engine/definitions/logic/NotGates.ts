/**
 * NOT gate family: 1-input, 2-channel, 4-channel, 8-channel.
 */
import {
  GATE_CATEGORY_LOGIC,
  GATE_TYPE_NOT,
  GATE_TYPE_NOT2,
  GATE_TYPE_NOT4,
  GATE_TYPE_NOT8,
  PINC1,
  PINC2,
  PINC4,
  PINC8,
} from "../../constants";
import { evalGateNot, evalGateNotMulti } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const NotGates: ComponentDefinition[] = [
  cb({
    type: GATE_TYPE_NOT,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC1,
    outputs: PINC1,
    width: 60,
    height: 50,
    symbol: "!",
    inputLabels: ["A"],
    outputLabels: ["Y"],
    evaluate: evalGateNot,
  }),
  cb({
    type: GATE_TYPE_NOT2,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC2,
    outputs: PINC2,
    width: 60,
    height: 60,
    symbol: "!2",
    inputLabels: ["A", "B"],
    outputLabels: ["Y0", "Y1"],
    evaluate: evalGateNotMulti,
  }),
  cb({
    type: GATE_TYPE_NOT4,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC4,
    outputs: PINC4,
    width: 60,
    height: 80,
    symbol: "!4",
    inputLabels: ["A", "B", "C", "D"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3"],
    evaluate: evalGateNotMulti,
  }),
  cb({
    type: GATE_TYPE_NOT8,
    label: "",
    category: GATE_CATEGORY_LOGIC,
    inputs: PINC8,
    outputs: PINC8,
    width: 60,
    height: 120,
    symbol: "!8",
    inputLabels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    outputLabels: ["Y0", "Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7"],
    evaluate: evalGateNotMulti,
  }),
];

export default NotGates;
