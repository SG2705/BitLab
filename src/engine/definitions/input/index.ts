/**
 * Input component definitions — Toggle, Button, Const, Clock, DigitBin, VCC, GND, Bus Inputs.
 */
import type { ComponentDefinition } from "../../types";

import { BusInputs } from "./BusInputs";
import { ButtonInput } from "./ButtonInput";
import { ClockInput } from "./ClockInput";
import { ConstInput } from "./ConstInput";
import { DigitBinInput } from "./DigitBinInput";
import { GndRail } from "./GndRail";
import { ToggleInput } from "./ToggleInput";
import { VccRail } from "./VccRail";

export const INPUT_DEFINITIONS: ComponentDefinition[] = [
  ToggleInput,
  ButtonInput,
  ConstInput,
  ClockInput,
  DigitBinInput,
  VccRail,
  GndRail,
  ...BusInputs,
];

export default INPUT_DEFINITIONS;
