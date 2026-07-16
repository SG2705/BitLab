import { type SetStateAction } from "react";
import { createIntl, createIntlCache, type IntlShape } from "react-intl";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
