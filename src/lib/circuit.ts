/**
 * circuit.ts — UI utilities and backward-compatible re-exports.
 *
 * The simulation engine has moved to src/engine/.
 * This file keeps the UI helper functions that depend on component geometry.
 */

import type { ComponentInstance } from "@/engine";
import { library } from "@/engine";
import { PIN_KIND } from "@/lib/constants";
import { type PinKind } from "@/lib/types";

export type { Wire } from "@/engine";
export type { ComponentInstance as CircuitComp };
export type { CircuitSnapshot as Circuit } from "@/engine";
export type { CustomGateMeta } from "@/engine";

/** Returns the canvas (world) position of a component pin for wire rendering. */
export function pinPos(
  comp: ComponentInstance,
  kind: PinKind,
  idx: number,
): { x: number; y: number } {
  if (!library.has(comp.type)) return { x: comp.x, y: comp.y };

  const def = library.get(comp.type);
  const count = kind === PIN_KIND.IN ? def.inputs : def.outputs;
  const spacing = def.height / (count + 1);
  const y = comp.y + spacing * (idx + 1);
  const x = kind === PIN_KIND.IN ? comp.x : comp.x + def.width;

  return { x, y };
}

// Dynamic proxy — always reflects the live library, including custom gates.
export const GATES = new Proxy<Record<string, ReturnType<typeof library.get>>>(
  {},
  {
    get(_target, type) {
      if (typeof type !== "string") return undefined;

      return library.has(type) ? library.get(type) : undefined;
    },
    has(_target, type) {
      return typeof type === "string" && library.has(type);
    },
  },
);

export const CATEGORIES = library.getCategories();
