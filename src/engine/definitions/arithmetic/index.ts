/**
 * Arithmetic component definitions — Adders, Subtractors, Muxes, Decoders, Comparators.
 */
import type { ComponentDefinition } from "../../types";
import { Adders } from "./Adders";
import { Comparators } from "./Comparators";
import { Decoders } from "./Decoders";
import { Muxes } from "./Muxes";
import { Subtractors } from "./Subtractors";

export const ARITHMETIC_DEFINITIONS: ComponentDefinition[] = [
  ...Adders,
  ...Subtractors,
  ...Muxes,
  ...Decoders,
  ...Comparators,
];

export default ARITHMETIC_DEFINITIONS;
