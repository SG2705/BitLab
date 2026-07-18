import {
  type CONSOLE_TAB,
  type PIN_DIR,
  type PIN_KIND,
  type THEME,
  type TOOL,
  type WIRE_TYPE,
} from "@/lib/constants";
import type { SignalValue } from "@/engine";

export type Theme = (typeof THEME)[keyof typeof THEME];

export type ConsoleTab = (typeof CONSOLE_TAB)[keyof typeof CONSOLE_TAB];

export type WireType = (typeof WIRE_TYPE)[keyof typeof WIRE_TYPE];

export type PinKind = (typeof PIN_KIND)[keyof typeof PIN_KIND];

export type PinDir = (typeof PIN_DIR)[keyof typeof PIN_DIR];

export type Tool = (typeof TOOL)[keyof typeof TOOL];

export interface LogEntry {
  t: number;
  kind: ConsoleTab;
  msg: string;
}

export interface BusWireGroup {
  /** Unique ID: "bus:{fromComp}:{toComp}" */
  id: string;
  /** Source component ID */
  fromComp: string;
  /** Target component ID */
  toComp: string;
  /** Wire IDs in this group, ordered by pin index (0 = LSB) */
  wireIds: string[];
  /** Number of wires in the group */
  width: number;
  /** Per-wire signal values (index 0 = LSB) */
  signals: SignalValue[];
}
