import { CONSOLE_TAB, PIN_KIND, THEME, TOOL, WIRE_TYPE } from "@/lib/constants";

export type Theme = (typeof THEME)[keyof typeof THEME];

export type ConsoleTab = (typeof CONSOLE_TAB)[keyof typeof CONSOLE_TAB];

export type WireType = (typeof WIRE_TYPE)[keyof typeof WIRE_TYPE];

export type PinKind = (typeof PIN_KIND)[keyof typeof PIN_KIND];

export type Tool = (typeof TOOL)[keyof typeof TOOL];

export interface LogEntry {
  t: number;
  kind: ConsoleTab;
  msg: string;
}
