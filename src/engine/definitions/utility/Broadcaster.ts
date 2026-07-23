/**
 * Broadcaster — a named signal source via component.
 *
 * Places a labeled broadcast point on the canvas. Any Receiver subscribed
 * to this broadcaster's channel name will receive its output signal via
 * the ViaService (which directly copies the broadcaster's input signal
 * to each subscribed receiver's output).
 *
 * Pins:
 *   IN [0] — signal input (user wires into this)
 *
 * Properties:
 *   channel — unique broadcaster name (auto-generated, user-editable)
 */
import {
  GATE_CATEGORY_UTILITY,
  GATE_TYPE_BROADCASTER,
  PINC0,
  PINC1,
} from "../../constants";
import type { ComponentDefinition } from "../../types";
import { hw } from "../helpers";

export const Broadcaster: ComponentDefinition[] = [
  hw({
    type: GATE_TYPE_BROADCASTER,
    label: "",
    category: GATE_CATEGORY_UTILITY,
    inputs: PINC1,
    outputs: PINC0,
    width: 35,
    height: 35,
    symbol: "📡",
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    inputLabels: ["IN"],
    initialState: () => ({ channel: "" }),
    evaluate: () => ({ outputs: [], state: null }),
  }),
];

export default Broadcaster;
