/**
 * Logic gate definitions — AND, OR, XOR, NAND, NOR, NOT, BUFFER, and multi-input variants.
 */
import type { ComponentDefinition } from "../../types";

import { AndGates } from "./AndGates";
import { BufferGate } from "./BufferGate";
import { CtrlAndGates } from "./CtrlAndGates";
import { NandGate } from "./NandGate";
import { NorGate } from "./NorGate";
import { NotGates } from "./NotGates";
import { OrGates } from "./OrGates";
import { XnorGate } from "./XnorGate";
import { XorGate } from "./XorGate";

export const LOGIC_DEFINITIONS: ComponentDefinition[] = [
  ...AndGates,
  ...OrGates,
  XorGate,
  XnorGate,
  NandGate,
  NorGate,
  ...NotGates,
  BufferGate,
  ...CtrlAndGates,
];

export default LOGIC_DEFINITIONS;
