/**
 * circuit.ts — UI utilities and backward-compatible re-exports.
 *
 * The simulation engine has moved to src/engine/.
 * This file keeps the UI helper functions that depend on component geometry.
 */

import type { CircuitSnapshot, ComponentInstance } from "@/engine";
import { library } from "@/engine";
import { KEY_SEPARATOR } from "@/engine/constants";
import { PIN_KIND } from "@/lib/constants";
import { type BusWireGroup, type PinKind } from "@/lib/types";

export type { Wire } from "@/engine";
export type { ComponentInstance as CircuitComp };
export type { CircuitSnapshot as Circuit } from "@/engine";
export type { CustomGateMeta } from "@/engine";

/** Returns the canvas (world) position of a bus port on a component. */
export function busPortPos(
  comp: ComponentInstance,
  kind: PinKind,
): { x: number; y: number } {
  if (!library.has(comp.type)) return { x: comp.x, y: comp.y };

  const def = library.get(comp.type);
  const y = comp.y + def.height / 2;
  const x = kind === PIN_KIND.OUT ? comp.x + def.width + 12 : comp.x - 12;

  return { x, y };
}

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

/**
 * Computes bus wire groups from a circuit snapshot.
 *
 * Groups wires by (fromComp, toComp) pair where the source component's
 * definition has `isBusOutput` and the target component's definition has
 * `isBusInput`. Wires within each group are sorted by pin index (0 = LSB).
 * Signal values are derived from the source component's outputs array.
 */
export function computeBusWireGroups(
  snapshot: CircuitSnapshot,
): BusWireGroup[] {
  const groups = new Map<
    string,
    { fromComp: string; toComp: string; wires: { id: string; pin: number }[] }
  >();

  for (const [wireId, wire] of Object.entries(snapshot.wires)) {
    const sourceComp = snapshot.components[wire.from.comp];
    const targetComp = snapshot.components[wire.to.comp];

    if (!sourceComp || !targetComp) continue;

    // Check if source has isBusOutput and target has isBusInput
    if (!library.has(sourceComp.type) || !library.has(targetComp.type))
      continue;

    const sourceDef = library.get(sourceComp.type);
    const targetDef = library.get(targetComp.type);

    if (!sourceDef.isBusOutput || !targetDef.isBusInput) continue;

    const key = `${wire.from.comp}${KEY_SEPARATOR}${wire.to.comp}`;

    if (!groups.has(key)) {
      groups.set(key, {
        fromComp: wire.from.comp,
        toComp: wire.to.comp,
        wires: [],
      });
    }

    groups.get(key)?.wires.push({ id: wireId, pin: wire.from.pin });
  }

  const result: BusWireGroup[] = [];

  for (const group of groups.values()) {
    // Sort by pin index (LSB first)
    group.wires.sort((a, b) => a.pin - b.pin);

    const sourceComp = snapshot.components[group.fromComp];

    // Derive signal values from source component's outputs array
    const signals = group.wires.map((w) => sourceComp.outputs[w.pin] ?? false);

    result.push({
      id: `bus:${group.fromComp}${KEY_SEPARATOR}${group.toComp}`,
      fromComp: group.fromComp,
      toComp: group.toComp,
      wireIds: group.wires.map((w) => w.id),
      width: group.wires.length,
      signals,
    });
  }

  return result;
}
