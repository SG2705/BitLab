/**
 * utils.ts — Engine-level utility functions.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pure utility functions used by the engine internals:
 *   • stateEqual: Fast shallow equality for component state objects
 *   • getHeightForPinCount: Compute component height based on pin density
 *
 * No UI or framework dependencies. Safe for worker contexts.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CELL_SIZE, MIN_COMP_SIZE, PIN_SPACING_UNITS } from "@/globals";

/**
 * Shallow equality check for component state objects.
 * Avoids JSON.stringify overhead by comparing top-level keys by reference.
 * Falls back to JSON.stringify only for nested objects/arrays.
 */
export const stateEqual = (
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    const va = a[key];
    const vb = b[key];

    if (va === vb) continue;
    if (typeof va !== typeof vb) return false;

    // For primitives, === already handled it above
    if (typeof va !== "object" || va === null || vb === null) return false;

    // For nested objects/arrays, fall back to serialization (rare path:
    // only Probe history and custom gate compStates hit this)
    if (JSON.stringify(va) !== JSON.stringify(vb)) return false;
  }

  return true;
};

/**
 * Returns the component height for a given max pin count.
 * Ensures that height / (pinCount + 1) is always a multiple of CELL_SIZE,
 * so pins are evenly spaced on grid points.
 */
export const getHeightForPinCount = (
  maxPins: number,
  busSlotCount = 0,
): number => {
  const pinSpacing = PIN_SPACING_UNITS * CELL_SIZE;
  const normalSlots = maxPins - busSlotCount;
  // Total span: normal slots get single spacing, bus slots get double
  const totalSpan =
    Math.max(0, normalSlots - 1) * pinSpacing +
    busSlotCount * pinSpacing * 2 +
    (normalSlots > 0 && busSlotCount > 0 ? pinSpacing : 0);
  // Add padding on top and bottom (one spacing unit each side)
  const naturalHeight = totalSpan + pinSpacing * 2;

  if (naturalHeight >= MIN_COMP_SIZE) {
    return Math.ceil(naturalHeight / CELL_SIZE) * CELL_SIZE;
  }

  return Math.ceil(MIN_COMP_SIZE / CELL_SIZE) * CELL_SIZE;
};
