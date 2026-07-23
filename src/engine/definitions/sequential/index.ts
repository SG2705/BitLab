/**
 * Sequential component definitions — Flip-flops, Latches, Registers, Counters, Shift Registers.
 */
import type { ComponentDefinition } from "../../types";

import { Counter4 } from "./Counter4";
import { DFlipFlop } from "./DFlipFlop";
import { DLatch } from "./DLatch";
import { JkFlipFlop } from "./JkFlipFlop";
import { Reg4 } from "./Reg4";
import { ShiftReg4 } from "./ShiftReg4";
import { SrLatch } from "./SrLatch";
import { TFlipFlop } from "./TFlipFlop";

export const SEQUENTIAL_DEFINITIONS: ComponentDefinition[] = [
  SrLatch,
  DFlipFlop,
  JkFlipFlop,
  TFlipFlop,
  DLatch,
  Reg4,
  Counter4,
  ShiftReg4,
];

export default SEQUENTIAL_DEFINITIONS;
