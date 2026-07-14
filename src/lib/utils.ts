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
