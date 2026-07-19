/**
 * Engine-level utility functions.
 * No UI or framework dependencies.
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
export const getHeightForPinCount = (maxPins: number): number => {
  const slots = maxPins + 1;
  const pinSpacing = PIN_SPACING_UNITS * CELL_SIZE;
  const naturalHeight = slots * pinSpacing;

  if (naturalHeight >= MIN_COMP_SIZE) {
    return naturalHeight;
  }

  // MIN_COMP_SIZE is larger — round up to the nearest multiple of (slots * CELL_SIZE)
  // so that height / slots is still a multiple of CELL_SIZE
  const minSpacing = Math.ceil(MIN_COMP_SIZE / (slots * CELL_SIZE)) * CELL_SIZE;

  return slots * minSpacing;
};
