/**
 * Utility registers: UREG4, UREG8 (write-enabled bus registers).
 */
import {
  GATE_CATEGORY_UTILITY,
  GATE_TYPE_UREG4,
  GATE_TYPE_UREG8,
  PINC4,
  PINC5,
  PINC8,
  PINC9,
} from "../../constants";
import { evalUreg4, evalUreg8 } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const URegs: ComponentDefinition[] = [
  hw({
    type: GATE_TYPE_UREG4,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC5,
    outputs: PINC4,
    width: 80,
    height: 90,
    inputLabels: ["D0", "D1", "D2", "D3", "WE"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3"],
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ val: 0 }),
    evaluate: evalUreg4,
  }),
  hw({
    type: GATE_TYPE_UREG8,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC9,
    outputs: PINC8,
    width: 80,
    height: 130,
    inputLabels: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "WE"],
    outputLabels: ["Q0", "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"],
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => ({ val: 0 }),
    evaluate: evalUreg8,
  }),
];

export default URegs;
