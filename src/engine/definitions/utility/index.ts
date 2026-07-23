/**
 * Utility component definitions — Splitter, Comment, Bus routing, Bus logic, URegs.
 */
import type { ComponentDefinition } from "../../types";

import { BusLogicGates } from "./BusLogicGates";
import { BusPassthrough } from "./BusPassthrough";
import { Comment } from "./Comment";
import { Debus } from "./Debus";
import { Splitter } from "./Splitter";
import { URegs } from "./URegs";

export const UTILITY_DEFINITIONS: ComponentDefinition[] = [
  Splitter,
  Comment,
  ...BusPassthrough,
  ...Debus,
  ...BusLogicGates,
  ...URegs,
];

export default UTILITY_DEFINITIONS;
