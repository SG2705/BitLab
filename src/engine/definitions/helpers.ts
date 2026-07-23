/**
 * helpers.ts — Shared helpers for component definitions.
 *
 * The `hw()` helper applies height auto-sizing and i18n label mapping.
 * The `cb()` helper creates combinational (stateless) component definitions.
 */
import { MIN_COMP_SIZE } from "@/globals";

import {
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_PROBE,
  LB_MAP,
} from "../constants";
import type {
  ComponentDefinition,
  EvaluateResult,
  SignalValue,
} from "../types";
import { getHeightForPinCount } from "../utils";

const H_OVERRIDES = [GATE_TYPE_PROBE, GATE_TYPE_DISPLAY7, GATE_TYPE_DIGIT_BIN];

/**
 * `hw()` — "hardware" helper: applies height auto-sizing based on pin count
 * and maps the label through the i18n label map.
 */
export const hw = (c: ComponentDefinition): ComponentDefinition => {
  const skipResize = H_OVERRIDES.includes(c.type);

  if (skipResize) {
    return { ...c, label: LB_MAP[c.type] };
  }

  // Count bus slots per side to pass to height calculation
  const inputBusSlots = c.busInputGroups?.length ?? 0;
  const outputBusSlots = c.busOutputGroups?.length ?? 0;

  // Determine which side has more slots (accounting for bus grouping)
  const inputSlotCount = c.busInputGroups
    ? c.inputs -
      c.busInputGroups.reduce((sum, [s, e]) => sum + (e - s), 0) +
      inputBusSlots
    : c.inputs;
  const outputSlotCount = c.busOutputGroups
    ? c.outputs -
      c.busOutputGroups.reduce((sum, [s, e]) => sum + (e - s), 0) +
      outputBusSlots
    : c.outputs;

  const maxSlots = Math.max(inputSlotCount, outputSlotCount);
  const busSlots =
    inputSlotCount >= outputSlotCount ? inputBusSlots : outputBusSlots;

  return {
    ...c,
    label: LB_MAP[c.type] ?? c.label,
    width: Math.max(MIN_COMP_SIZE, c.width),
    height: getHeightForPinCount(maxSlots, busSlots),
  };
};

/**
 * `cb()` — "combinational block" helper: shorthand for stateless gates.
 * Sets isSequential, isClock, isInput, isOutput to false, and initialState to null.
 */
type CbFields = Omit<
  ComponentDefinition,
  "isSequential" | "isClock" | "isInput" | "isOutput" | "initialState"
> & {
  evaluate: (inputs: SignalValue[], state: null) => EvaluateResult;
};

export const cb = (fields: CbFields): ComponentDefinition =>
  hw({
    ...fields,
    isSequential: false,
    isClock: false,
    isInput: false,
    isOutput: false,
    initialState: () => null,
  });
