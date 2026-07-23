/**
 * Output component definitions — LED, 7-Segment Display, Probe, Bus Displays.
 */
import type { ComponentDefinition } from "../../types";

import { BusDisplays } from "./BusDisplays";
import { Display7 } from "./Display7";
import { Led } from "./Led";
import { Probe } from "./Probe";

export const OUTPUT_DEFINITIONS: ComponentDefinition[] = [
  Led,
  Display7,
  Probe,
  ...BusDisplays,
];

export default OUTPUT_DEFINITIONS;
