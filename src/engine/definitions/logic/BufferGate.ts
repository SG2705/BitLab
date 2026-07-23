import { GATE_CATEGORY_LOGIC, GATE_TYPE_BUFFER, PINC1 } from "../../constants";
import { evalGateBuffer } from "../../logic";
import type { ComponentDefinition } from "../../types";
import { cb } from "../helpers";

export const BufferGate: ComponentDefinition = cb({
  type: GATE_TYPE_BUFFER,
  label: "",
  category: GATE_CATEGORY_LOGIC,
  inputs: PINC1,
  outputs: PINC1,
  width: 60,
  height: 50,
  symbol: "1",
  inputLabels: ["A"],
  outputLabels: ["Y"],
  evaluate: evalGateBuffer,
});

export default BufferGate;
