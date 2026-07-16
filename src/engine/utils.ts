/**
 * Engine-level utility functions.
 * No UI or framework dependencies.
 */

import { PIN_COUNT_HEIGHT } from "./constants";

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
 * Returns the standardized component height for a given max pin count.
 * If the exact count isn't in PIN_COUNT_HEIGHT, returns the height of the
 * nearest key (rounding up on ties).
 */
export const getHeightForPinCount = (maxPins: number): number => {
  const keys = Object.keys(PIN_COUNT_HEIGHT)
    .map(Number)
    .sort((a, b) => a - b);

  if (maxPins in PIN_COUNT_HEIGHT) return PIN_COUNT_HEIGHT[maxPins];

  let closest = keys[0];
  let minDist = Math.abs(maxPins - closest);

  for (const k of keys) {
    const dist = Math.abs(maxPins - k);

    if (dist < minDist || (dist === minDist && k > closest)) {
      closest = k;
      minDist = dist;
    }
  }

  return PIN_COUNT_HEIGHT[closest];
};
