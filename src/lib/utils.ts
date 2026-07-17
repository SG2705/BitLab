import { type SetStateAction } from "react";
import { createIntl, createIntlCache, type IntlShape } from "react-intl";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  GATE_TYPE_LABELS,
  GRID,
  MESSAGES,
  type Messages,
} from "@/lib/constants";
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

/**
 * Resolve a gate's display label via the i18n GATE_TYPE_LABELS map,
 * falling back to the raw def.label for custom gates without a message key.
 */
export const getGateLabel = (
  type: string,
  fallback: string,
  intl?: IntlShape,
): string => {
  const entry = GATE_TYPE_LABELS[type];

  return entry ? fm(entry.messageKey, intl) : fallback;
};

/**
 * Resolve a component's label. If it matches a known i18n message key,
 * return the localized text; otherwise return the raw string as-is.
 */
export const resolveLabel = (
  label: string | undefined,
  intl?: IntlShape,
): string | undefined => {
  if (!label) return undefined;

  if (label in MESSAGES) return fm(label as Messages, intl);

  return label;
};

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
