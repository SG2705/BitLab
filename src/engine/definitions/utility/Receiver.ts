/**
 * Receiver — a named signal sink via component.
 *
 * Subscribes to a broadcaster's channel name. The ViaService copies the
 * broadcaster's input signal to this receiver's output. No physical wire
 * is drawn on canvas.
 *
 * Pins:
 *   OUT [0] — outputs the broadcaster's signal (user wires from this to downstream gates)
 *
 * Properties:
 *   channel — the broadcaster name this receiver subscribes to
 */
import {
  GATE_CATEGORY_UTILITY,
  GATE_TYPE_RECEIVER,
  PINC0,
  PINC1,
} from "../../constants";
import type { ComponentDefinition } from "../../types";
import { LogicValue } from "../../types";
import { hw } from "../helpers";

export const Receiver: ComponentDefinition[] = [
  hw({
    type: GATE_TYPE_RECEIVER,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC0,
    outputs: PINC1,
    width: 35,
    height: 35,
    symbol: "📻",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    outputLabels: ["OUT"],
    initialState: () => ({ channel: "" }),
    evaluate: () => ({ outputs: [LogicValue.HIGH_IMPEDANCE], state: null }),
  }),
];

export default Receiver;
