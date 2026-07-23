/**
 * Utility component definitions — Splitter, Comment, Bus routing, Bus logic, URegs, Vias.
 */
import type { ComponentDefinition } from "../../types";

import { Broadcaster } from "./Broadcaster";
import { BusLogicGates } from "./BusLogicGates";
import { BusPassthrough } from "./BusPassthrough";
import { Comment } from "./Comment";
import { Debus } from "./Debus";
import { Receiver } from "./Receiver";
import { Splitter } from "./Splitter";
import { URegs } from "./URegs";

export const UTILITY_DEFINITIONS: ComponentDefinition[] = [
  ...Splitter,
  ...Comment,
  ...BusPassthrough,
  ...Debus,
  ...BusLogicGates,
  ...URegs,
  ...Broadcaster,
  ...Receiver,
];

export default UTILITY_DEFINITIONS;
