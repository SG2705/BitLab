import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { createIntl, createIntlCache, IntlShape } from "react-intl";
import { GRID, MESSAGES, Messages } from "@/lib/constants";
import { ConsoleTab, LogEntry } from "../types";
import { SetStateAction } from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const _cache = createIntlCache();
const _defaultIntl = createIntl({ locale: "en", messages: {} }, _cache);

export const fm = (
  key: Messages,
  intl: IntlShape = _defaultIntl,
  values?: Record<string, string | number | undefined>,
) => intl.formatMessage(MESSAGES[key], values);

export const addLog = (
  kind: ConsoleTab,
  msg: string,
  setter: (value: SetStateAction<LogEntry[]>) => void,
) => {
  setter((l) => [...l, { t: Date.now(), kind, msg }]);
};

export const snap = (v: number) => {
  return Math.round(v / GRID) * GRID;
};
