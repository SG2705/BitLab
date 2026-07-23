/**
 * definitions/index.ts — Assembles all component definitions from category modules.
 *
 * This is the single import point for the DEFINITIONS array used by ComponentLibrary.
 */
import type { ComponentDefinition } from "../types";

import { ARITHMETIC_DEFINITIONS } from "./arithmetic";
import { INPUT_DEFINITIONS } from "./input";
import { LOGIC_DEFINITIONS } from "./logic";
import { OUTPUT_DEFINITIONS } from "./output";
import { SEQUENTIAL_DEFINITIONS } from "./sequential";
import { UTILITY_DEFINITIONS } from "./utility";

export { cb, hw } from "./helpers";

export const DEFINITIONS: ComponentDefinition[] = [
  ...LOGIC_DEFINITIONS,
  ...INPUT_DEFINITIONS,
  ...OUTPUT_DEFINITIONS,
  ...SEQUENTIAL_DEFINITIONS,
  ...ARITHMETIC_DEFINITIONS,
  ...UTILITY_DEFINITIONS,
];
