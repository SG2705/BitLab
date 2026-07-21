/**
 * AutoConnectService.ts — Pure utility functions for multi-pin auto-connect.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides stateless functions to identify eligible pins on a component,
 * match them positionally between a source and target, and execute batch
 * wire creation via CircuitManager transactions.
 *
 * No React or DOM dependencies — pure engine logic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { CircuitManager } from "./CircuitManager";
import type { ComponentDefinition } from "./types";

// ── Reserved pin labels ──────────────────────────────────────────────────────
//
// Pins with these label suffixes are excluded from auto-connect eligibility.
// These represent clock, control, enable, reset, and carry signals that
// should not be automatically wired in bulk operations.

export const RESERVED_LABELS = new Set([
  "CLK",
  "EN",
  "RST",
  "SEL",
  "OE",
  "WE",
  "CE",
  "S",
  "R",
  "CIN",
  "COUT",
]);

// ── Interfaces ───────────────────────────────────────────────────────────────

/** A pin eligible for auto-connect, identified by its definition index. */
export interface EligiblePin {
  /** Pin index in the component definition */
  index: number;
  /** Pin label (for debugging/logging) */
  label?: string;
}

/** A matched pair of pins to be connected. */
export interface PinPair {
  /** Output pin index on source component */
  fromPin: number;
  /** Input pin index on target component */
  toPin: number;
}

/** Result of an auto-connect execution. */
export interface AutoConnectResult {
  /** IDs of successfully created wires */
  createdWireIds: string[];
  /** Number of pairs skipped (occupied or failed validation) */
  skippedCount: number;
}

// ── Pin filtering utilities ──────────────────────────────────────────────────

/**
 * Extracts the label suffix for reserved-name comparison.
 * Returns the segment after the last dot separator, or the full label
 * if no dot exists.
 *
 * @example
 * getLabelSuffix("IN0.CLK") // → "CLK"
 * getLabelSuffix("D0")      // → "D0"
 * getLabelSuffix("A.B.RST") // → "RST"
 */
export function getLabelSuffix(label: string): string {
  const lastDot = label.lastIndexOf(".");

  if (lastDot === -1) {
    return label;
  }

  return label.substring(lastDot + 1);
}

/**
 * Checks whether a pin at `index` falls within any of the given bus groups.
 * Each group is [start, end) — start inclusive, end exclusive.
 */
function isInBusGroup(
  index: number,
  groups: [number, number][] | undefined,
): boolean {
  if (!groups) return false;

  return groups.some(([start, end]) => index >= start && index < end);
}

/**
 * Returns eligible (normal data) output pins for a component definition.
 *
 * Excludes:
 * - All pins if `isBusOutput` is true (entire component is a bus output)
 * - Pins belonging to a `busOutputGroup`
 * - Pins whose label suffix (uppercased) matches a reserved name
 */
export function getEligibleOutputPins(def: ComponentDefinition): EligiblePin[] {
  // If the entire component's outputs collapse to a bus port, exclude all
  if (def.isBusOutput) {
    return [];
  }

  const eligible: EligiblePin[] = [];

  for (let i = 0; i < def.outputs; i += 1) {
    // Exclude pins in bus output groups
    if (isInBusGroup(i, def.busOutputGroups)) {
      continue;
    }

    // Check label against reserved names
    const label = def.outputLabels?.[i];

    if (label) {
      const suffix = getLabelSuffix(label);

      if (RESERVED_LABELS.has(suffix.toUpperCase())) {
        continue;
      }
    }

    eligible.push({ index: i, label });
  }

  return eligible;
}

/**
 * Returns eligible (normal data) input pins for a component definition.
 *
 * Excludes:
 * - All pins if `isBusInput` is true (entire component is a bus input)
 * - Pins belonging to a `busInputGroup`
 * - Pins whose label suffix (uppercased) matches a reserved name
 */
export function getEligibleInputPins(def: ComponentDefinition): EligiblePin[] {
  // If the entire component's inputs collapse to a bus port, exclude all
  if (def.isBusInput) {
    return [];
  }

  const eligible: EligiblePin[] = [];

  for (let i = 0; i < def.inputs; i += 1) {
    // Exclude pins in bus input groups
    if (isInBusGroup(i, def.busInputGroups)) {
      continue;
    }

    // Check label against reserved names
    const label = def.inputLabels?.[i];

    if (label) {
      const suffix = getLabelSuffix(label);

      if (RESERVED_LABELS.has(suffix.toUpperCase())) {
        continue;
      }
    }

    eligible.push({ index: i, label });
  }

  return eligible;
}

// ── Pin matching ─────────────────────────────────────────────────────────────

/**
 * Matches eligible pins positionally (Nth output ↔ Nth input).
 *
 * Returns pairs only if `sourceOutputs.length === targetInputs.length >= 1`.
 * Returns an empty array if counts don't match — signalling fallback to
 * standard single-wire behavior.
 *
 * Both arrays are sorted internally by ascending `index` before pairing,
 * so callers do not need to pre-sort.
 */
export function matchPins(
  sourceOutputs: EligiblePin[],
  targetInputs: EligiblePin[],
): PinPair[] {
  // Guard: both arrays must be non-empty and equal length
  if (
    sourceOutputs.length === 0 ||
    targetInputs.length === 0 ||
    sourceOutputs.length !== targetInputs.length
  ) {
    return [];
  }

  // Sort both by ascending pin index (non-mutating)
  const sortedOutputs = [...sourceOutputs].sort((a, b) => a.index - b.index);
  const sortedInputs = [...targetInputs].sort((a, b) => a.index - b.index);

  // Pair positionally: Nth output → Nth input
  const pairs: PinPair[] = [];

  for (let i = 0; i < sortedOutputs.length; i += 1) {
    pairs.push({
      fromPin: sortedOutputs[i].index,
      toPin: sortedInputs[i].index,
    });
  }

  return pairs;
}

// ── Auto-connect execution ───────────────────────────────────────────────────

/**
 * Executes the auto-connect operation within a CircuitManager transaction.
 *
 * Creates wires for each pin pair via `addWire()`. Pairs that fail validation
 * (occupied input pin, missing components, self-connection) are skipped
 * gracefully — they increment the skipped count but do not abort the operation.
 *
 * Transaction semantics:
 * - `beginTransaction()` is called before any mutations
 * - `commitTransaction()` is called after all pairs are processed successfully
 * - `abortTransaction()` is called if an unexpected exception occurs
 *
 * @param manager - The CircuitManager instance to operate on
 * @param sourceCompId - ID of the source (output) component
 * @param targetCompId - ID of the target (input) component
 * @param pairs - Array of pin pairs to connect
 * @returns Result containing created wire IDs and skipped count
 */
export function executeAutoConnect(
  manager: CircuitManager,
  sourceCompId: string,
  targetCompId: string,
  pairs: PinPair[],
): AutoConnectResult {
  const createdWireIds: string[] = [];
  let skippedCount = 0;
  let committed = false;

  manager.beginTransaction();

  try {
    for (const pair of pairs) {
      const wire = manager.addWire(
        sourceCompId,
        pair.fromPin,
        targetCompId,
        pair.toPin,
      );

      if (wire === null) {
        skippedCount += 1;
      } else {
        createdWireIds.push(wire.id);
      }
    }

    manager.commitTransaction();
    committed = true;
  } finally {
    if (!committed) {
      manager.abortTransaction();
    }
  }

  return { createdWireIds, skippedCount };
}
