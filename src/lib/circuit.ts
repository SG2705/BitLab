/**
 * circuit.ts — UI utilities and backward-compatible re-exports.
 *
 * The simulation engine has moved to src/engine/.
 * This file keeps the UI helper functions that depend on component geometry.
 */

import { library } from "@/engine";
import type { ComponentInstance } from "@/engine";

export type PinKind = "in" | "out";

// Re-export the engine's types under the legacy names so any remaining
// imports from "@/lib/circuit" continue to resolve.
export type { ComponentInstance as CircuitComp };
export type { Wire } from "@/engine";
export type { CircuitSnapshot as Circuit } from "@/engine";

/** Returns the canvas (world) position of a component pin for wire rendering. */
export function pinPos(
  comp: Pick<ComponentInstance, "type" | "x" | "y">,
  kind: PinKind,
  idx: number,
): { x: number; y: number } {
  const def = library.get(comp.type);
  const count = kind === "in" ? def.inputs : def.outputs;
  const spacing = def.height / (count + 1);
  const y = comp.y + spacing * (idx + 1);
  const x = kind === "in" ? comp.x : comp.x + def.width;

  return { x, y };
}

// Legacy GATES / CATEGORIES exports so any remaining non-migrated code compiles.
export const GATES = Object.fromEntries(
  library.getAll().map((d) => [d.type, d]),
);

export const CATEGORIES = library.getCategories();
