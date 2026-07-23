import {
  GATE_CATEGORY_UTILITY,
  GATE_TYPE_SPLITTER,
  PINC1,
  PINC4,
} from "../../constants";
import { evalSplitter } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const Splitter: ComponentDefinition = cb({
  type: GATE_TYPE_SPLITTER,
  label: "",
  category: GATE_CATEGORY_UTILITY,
  inputs: PINC1,
  outputs: PINC4,
  width: 80,
  height: 80,
  symbol: "1:4",
  inputLabels: ["IN"],
  outputLabels: ["Q0", "Q1", "Q2", "Q3"],
  evaluate: evalSplitter,
});

export default Splitter;
