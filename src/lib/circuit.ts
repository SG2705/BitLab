/**
 * circuit.ts — UI utilities and backward-compatible re-exports.
 *
 * The simulation engine has moved to src/engine/.
 * This file keeps the UI helper functions that depend on component geometry.
 */

import { PIN_KIND } from "@/lib/constants";
import { library } from "@/engine";
import type { ComponentInstance } from "@/engine";
import { PinKind } from "@/lib/types";

export type { Wire } from "@/engine";
export type { ComponentInstance as CircuitComp };
export type { CircuitSnapshot as Circuit } from "@/engine";

/** Returns the canvas (world) position of a component pin for wire rendering. */
export function pinPos(
  comp: ComponentInstance,
  kind: PinKind,
  idx: number,
): { x: number; y: number } {
  const def = library.get(comp.type);
  const count = kind === PIN_KIND.IN ? def.inputs : def.outputs;
  const spacing = def.height / (count + 1);
  const y = comp.y + spacing * (idx + 1);
  const x = kind === PIN_KIND.IN ? comp.x : comp.x + def.width;

  return { x, y };
}

// Legacy GATES / CATEGORIES exports so any remaining non-migrated code compiles.
export const GATES = Object.fromEntries(
  library.getAll().map((d) => [d.type, d]),
);

export const CATEGORIES = library.getCategories();
