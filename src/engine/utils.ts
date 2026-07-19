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
 * height = max(MIN_COMP_SIZE, (pinCount + 1) * PIN_SPACING_UNITS * CELL_SIZE)
 * This ensures pin spacing is always grid-aligned.
 */
export const getHeightForPinCount = (maxPins: number): number => {
  return Math.max(MIN_COMP_SIZE, (maxPins + 1) * PIN_SPACING_UNITS * CELL_SIZE);
};
