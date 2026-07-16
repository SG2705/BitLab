import { type SetStateAction } from "react";
import { createIntl, createIntlCache, type IntlShape } from "react-intl";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { PIN_COUNT_HEIGHT } from "@/engine";
import { GRID, MESSAGES, type Messages } from "@/lib/constants";
import { type ConsoleTab, type LogEntry } from "@/lib/types";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

const intlCache = createIntlCache();
const defaultIntl = createIntl({ locale: "en", messages: {} }, intlCache);

export const fm = (
  key: Messages,
  intl: IntlShape = defaultIntl,
  values?: Record<string, string | number | undefined>,
) => intl.formatMessage(MESSAGES[key], values);

export const initializeLogger = (
  setter: (value: SetStateAction<LogEntry[]>) => void,
) => {
  return (kind: ConsoleTab, msg: string) => {
    setter((l) => [...l, { t: Date.now(), kind, msg }]);
  };
};

export const snap = (v: number) => {
  return Math.round(v / GRID) * GRID;
};

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

/** Convert signals array to hex string (index 0 = LSB) */
export const signalsToHex = (signals: boolean[]): string => {
  let value = 0;

  for (let i = 0; i < signals.length; i += 1) {
    if (signals[i]) {
      // eslint-disable-next-line no-bitwise
      value |= 1 << i;
    }
  }

  return `0x${value.toString(16).toUpperCase()}`;
};

/** Convert signals array to binary string (MSB first) */
export const signalsToBinary = (signals: boolean[]): string =>
  signals
    .slice()
    .reverse()
    .map((s) => (s ? "1" : "0"))
    .join("");

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
