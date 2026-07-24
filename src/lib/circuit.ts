/**
 * circuit.ts — UI utilities and backward-compatible re-exports.
 *
 * The simulation engine has moved to src/engine/.
 * This file keeps the UI helper functions that depend on component geometry.
 */

import type { CircuitSnapshot, ComponentInstance } from "@/engine";
import { library, LogicValue } from "@/engine";
import { KEY_SEPARATOR } from "@/engine/constants";
import { CELL_SIZE, PIN_OFFSET, PIN_SPACING_UNITS } from "@/globals";
import { PIN_DIR, PIN_KIND } from "@/lib/constants";
import { type BusWireGroup, type PinDir, type PinKind } from "@/lib/types";

export type { Wire } from "@/engine";
export type { ComponentInstance as CircuitComp };
export type { CircuitSnapshot as Circuit } from "@/engine";
export type { CustomCircuitDefinition } from "@/engine";

/** Returns the canvas (world) position of a bus port on a component. */
export function busPortPos(
  comp: ComponentInstance,
  kind: PinKind,
): { x: number; y: number } {
  if (!library.has(comp.type)) return { x: comp.x, y: comp.y };

  const def = library.get(comp.type);
  const r = comp.rotation ?? 0;
  const rw = r === 90 || r === 270 ? def.height : def.width;
  const rh = r === 90 || r === 270 ? def.width : def.height;

  // Bus port sits PIN_OFFSET away from the edge, centered
  // Same edge logic as regular pins: IN edge and OUT edge depend on rotation
  const isOutput = kind === PIN_KIND.OUT;

  let x: number;
  let y: number;

  if (r === 0) {
    x = isOutput ? comp.x + rw + PIN_OFFSET : comp.x - PIN_OFFSET;
    y = comp.y + rh / 2;
  } else if (r === 90) {
    x = comp.x + rw / 2;
    y = isOutput ? comp.y + rh + PIN_OFFSET : comp.y - PIN_OFFSET;
  } else if (r === 180) {
    x = isOutput ? comp.x - PIN_OFFSET : comp.x + rw + PIN_OFFSET;
    y = comp.y + rh / 2;
  } else {
    x = comp.x + rw / 2;
    y = isOutput ? comp.y - PIN_OFFSET : comp.y + rh + PIN_OFFSET;
  }

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
  const r = comp.rotation ?? 0;

  // At 90°/270° the component is rendered with swapped dimensions
  const rw = r === 90 || r === 270 ? def.height : def.width;
  const rh = r === 90 || r === 270 ? def.width : def.height;
  const isVertical = r === 0 || r === 180;

  // Determine slot-based position when bus groups exist
  const busGroups =
    kind === PIN_KIND.IN ? def.busInputGroups : def.busOutputGroups;
  const totalPins = kind === PIN_KIND.IN ? def.inputs : def.outputs;

  let slotIndex: number;
  let slotCount: number;

  if (busGroups && busGroups.length > 0) {
    // Count slots: each bus group = 1 slot, each normal pin = 1 slot
    const groupStartMap = new Map(busGroups.map((g, gi) => [g[0], { gi, g }]));
    let slots = 0;
    let foundSlot = -1;
    let pi = 0;

    while (pi < totalPins) {
      const entry = groupStartMap.get(pi);

      if (entry) {
        const [start, end] = entry.g;

        if (idx >= start && idx < end) foundSlot = slots;
        slots += 1;
        pi = end;
      } else {
        if (pi === idx) foundSlot = slots;
        slots += 1;
        pi += 1;
      }
    }

    slotCount = slots;
    slotIndex = foundSlot >= 0 ? foundSlot : idx;
  } else {
    slotCount = totalPins;
    slotIndex = idx;
  }

  const sizeAxis = isVertical ? rh : rw;

  // Center pins: fixed spacing, bus ports get double spacing
  const pinSpacing = PIN_SPACING_UNITS * CELL_SIZE;

  // Determine if each slot is a bus port (needs double spacing)
  let isBusSlot: boolean[] = [];

  if (busGroups && busGroups.length > 0) {
    const groupStartSet = new Set(busGroups.map((g) => g[0]));
    const groupEndMap = new Map(busGroups.map((g) => [g[0], g[1]]));
    let pi = 0;

    while (pi < totalPins) {
      if (groupStartSet.has(pi)) {
        isBusSlot.push(true);
        const end = groupEndMap.get(pi);

        pi = end ?? pi + 1;
      } else {
        isBusSlot.push(false);
        pi += 1;
      }
    }
  } else {
    isBusSlot = Array.from({ length: slotCount }, () => false);
  }

  // Calculate total span accounting for bus port double spacing
  let totalSpan = 0;

  for (let i = 1; i < slotCount; i += 1) {
    // Gap before slot i is the max of current and previous slot size
    const prevBus = isBusSlot[i - 1];
    const curBus = isBusSlot[i];

    totalSpan += prevBus || curBus ? pinSpacing * 2 : pinSpacing;
  }

  const startOffset =
    Math.round((sizeAxis - totalSpan) / 2 / CELL_SIZE) * CELL_SIZE;

  // Calculate position for our specific slot
  let pos = startOffset;

  for (let i = 1; i <= slotIndex; i += 1) {
    const prevBus = isBusSlot[i - 1];
    const curBus = isBusSlot[i];

    pos += prevBus || curBus ? pinSpacing * 2 : pinSpacing;
  }

  let x: number;
  let y: number;

  if (isVertical) {
    const isLeftEdge =
      (r === 0 && kind === PIN_KIND.IN) || (r === 180 && kind === PIN_KIND.OUT);

    x = isLeftEdge ? comp.x - PIN_OFFSET : comp.x + rw + PIN_OFFSET;
    y = comp.y + pos;
  } else {
    const isTopEdge =
      (r === 90 && kind === PIN_KIND.IN) ||
      (r === 270 && kind === PIN_KIND.OUT);

    x = comp.x + pos;
    y = isTopEdge ? comp.y - PIN_OFFSET : comp.y + rh + PIN_OFFSET;
  }

  return { x, y };
}

/**
 * Returns the rendered width and height of a component accounting for rotation.
 * At 90°/270°, width and height are swapped.
 */
export function getRotatedSize(
  comp: ComponentInstance,
  def: { width: number; height: number },
): { w: number; h: number } {
  const r = comp.rotation ?? 0;

  if (r === 90 || r === 270) return { w: def.height, h: def.width };

  return { w: def.width, h: def.height };
}

/**
 * Returns the outward direction a pin faces based on component rotation and pin kind.
 * Used by WirePath to determine wire routing shape (L vs Z).
 */
export function pinDirection(comp: ComponentInstance, kind: PinKind): PinDir {
  const r = comp.rotation ?? 0;
  const isOutput = kind === PIN_KIND.OUT;

  // Output pin direction by rotation:
  // 0° → right, 90° → down, 180° → left, 270° → up
  // Input pin direction is the opposite edge:
  // 0° → left, 90° → up, 180° → right, 270° → down
  if (isOutput) {
    if (r === 0) return PIN_DIR.RIGHT;
    if (r === 90) return PIN_DIR.DOWN;
    if (r === 180) return PIN_DIR.LEFT;

    return PIN_DIR.UP;
  }

  if (r === 0) return PIN_DIR.LEFT;
  if (r === 90) return PIN_DIR.UP;
  if (r === 180) return PIN_DIR.RIGHT;

  return PIN_DIR.DOWN;
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

    if (!library.has(sourceComp.type) || !library.has(targetComp.type))
      continue;

    const sourceDef = library.get(sourceComp.type);
    const targetDef = library.get(targetComp.type);

    // Check if this wire is part of a bus connection:
    // Source pin must be in a bus output (isBusOutput or within a busOutputGroup)
    const srcIsBus =
      sourceDef.isBusOutput ||
      (sourceDef.busOutputGroups?.some(
        ([s, e]) => wire.from.pin >= s && wire.from.pin < e,
      ) ??
        false);
    // Target pin must be in a bus input (isBusInput or within a busInputGroup)
    const tgtIsBus =
      targetDef.isBusInput ||
      (targetDef.busInputGroups?.some(
        ([s, e]) => wire.to.pin >= s && wire.to.pin < e,
      ) ??
        false);

    if (!srcIsBus || !tgtIsBus) continue;

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
    const signals = group.wires.map(
      (w) => sourceComp.outputs[w.pin] ?? LogicValue.UNKNOWN,
    );

    result.push({
      id: `bus${KEY_SEPARATOR}${group.fromComp}${KEY_SEPARATOR}${group.toComp}`,
      fromComp: group.fromComp,
      toComp: group.toComp,
      wireIds: group.wires.map((w) => w.id),
      width: group.wires.length,
      signals,
    });
  }

  return result;
}
