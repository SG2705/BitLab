/**
 * ViaService — manages signal propagation between Broadcaster and Receiver components.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Broadcaster has 1 input pin, 0 output pins.
 * Receiver has 0 input pins, 1 output pin.
 *
 * They are connected by channel name (a string property), not by wires.
 * After each propagation cycle, the ViaService copies the broadcaster's
 * input[0] signal directly to the output[0] of all receivers subscribed
 * to that broadcaster's channel. This triggers downstream propagation
 * from the receivers.
 *
 * No invisible wires exist in the graph — the connection is purely virtual.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { GATE_TYPE_BROADCASTER, GATE_TYPE_RECEIVER } from "./constants";
import type { ComponentInstance, SignalValue } from "./types";
import { LogicValue } from "./types";

/**
 * Generate the next unique broadcaster channel name given existing names.
 */
export function generateChannelName(existingNames: Set<string>): string {
  let counter = 1;

  while (existingNames.has(`BC_${counter}`)) {
    counter += 1;
  }

  return `BC_${counter}`;
}

/**
 * Get all broadcaster channel names currently in the circuit.
 * Returns a map of channel → component ID.
 */
export function getBroadcasterChannels(
  components: Record<string, ComponentInstance>,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const comp of Object.values(components)) {
    if (comp.type === GATE_TYPE_BROADCASTER) {
      const channel = (comp.properties?.channel as string) ?? "";

      if (channel) {
        map.set(channel, comp.id);
      }
    }
  }

  return map;
}

/**
 * Propagate via signals: copy broadcaster input[0] → receiver output[0]
 * for all matched channel pairs.
 *
 * Returns the IDs of receivers whose output changed (for downstream propagation).
 */
export function propagateViaSignals(
  components: Record<string, ComponentInstance>,
): string[] {
  // Build broadcaster channel → signal map
  const channelSignals = new Map<string, SignalValue>();

  for (const comp of Object.values(components)) {
    if (comp.type === GATE_TYPE_BROADCASTER) {
      const channel = (comp.properties?.channel as string) ?? "";

      if (channel) {
        // Broadcaster's input[0] is the signal it broadcasts
        channelSignals.set(
          channel,
          comp.inputs[0] ?? LogicValue.HIGH_IMPEDANCE,
        );
      }
    }
  }

  // Update receivers and collect those whose output changed
  const changed: string[] = [];

  for (const comp of Object.values(components)) {
    if (comp.type !== GATE_TYPE_RECEIVER) continue;

    const channel = (comp.properties?.channel as string) ?? "";

    if (!channel) continue;

    const signal = channelSignals.get(channel) ?? LogicValue.HIGH_IMPEDANCE;
    const currentOutput = comp.outputs[0];

    if (currentOutput !== signal) {
      comp.outputs = [signal];
      changed.push(comp.id);
    }
  }

  return changed;
}

/**
 * Handle a new broadcaster being added — assign a unique channel name.
 */
export function onBroadcasterAdded(
  compId: string,
  components: Record<string, ComponentInstance>,
  updateComponent: (id: string, patch: Partial<ComponentInstance>) => void,
): void {
  const comp = components[compId];

  if (!comp || comp.type !== GATE_TYPE_BROADCASTER) return;

  const existingChannel = (comp.properties?.channel as string) ?? "";

  // Collect all existing broadcaster channel names (excluding this component)
  const existingNames = new Set<string>();

  for (const c of Object.values(components)) {
    if (c.type === GATE_TYPE_BROADCASTER && c.id !== compId) {
      const ch = (c.properties?.channel as string) ?? "";

      if (ch) existingNames.add(ch);
    }
  }

  // If the channel is empty OR already taken by another broadcaster, generate a new one
  if (!existingChannel || existingNames.has(existingChannel)) {
    const channel = generateChannelName(existingNames);

    updateComponent(compId, {
      properties: { ...(comp.properties ?? {}), channel },
      label: channel,
    });
  }
}
