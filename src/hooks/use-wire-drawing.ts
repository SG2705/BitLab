/**
 * useWireDrawing — manages pending wire state and bus/regular wire connection logic.
 */

import { useCallback, useState } from "react";

import type { CircuitSnapshot, ComponentInstance, Wire } from "@/engine";
import { library } from "@/engine";
import {
  executeAutoConnect,
  getEligibleInputPins,
  getEligibleOutputPins,
  matchPins,
  type PinPair,
} from "@/engine/BatchConnect";
import { CONSOLE_TAB } from "@/lib/constants";
import { isAutoConnectModifier } from "@/lib/platform";
import type { ConsoleTab } from "@/lib/types";

// Re-export for use in subsequent tasks (4.2, 4.4)
export {
  executeAutoConnect,
  getEligibleInputPins,
  getEligibleOutputPins,
  isAutoConnectModifier,
  matchPins,
};
export type { PinPair };

export interface PendingWire {
  from: { comp: string; pin: number };
  mx: number;
  my: number;
  isBus?: boolean;
  isAutoConnect?: boolean;
}

export interface AutoConnectPreview {
  pairs: PinPair[];
  sourceComp: string;
  targetComp: string;
}

export interface WireDrawingControls {
  pendingWire: PendingWire | null;
  setPendingWire: React.Dispatch<React.SetStateAction<PendingWire | null>>;
  autoConnectPreview: AutoConnectPreview | null;
  setAutoConnectPreview: React.Dispatch<
    React.SetStateAction<AutoConnectPreview | null>
  >;
  startWire: (
    e: React.MouseEvent,
    comp: ComponentInstance,
    pin: number,
    toWorld: (sx: number, sy: number) => { x: number; y: number },
  ) => void;
  finishWire: (
    e: React.MouseEvent,
    comp: ComponentInstance,
    pin: number,
    snapshot: CircuitSnapshot,
    addWire: (
      fromComp: string,
      fromPin: number,
      toComp: string,
      toPin: number,
    ) => Wire | null,
    addLog: (kind: ConsoleTab, msg: string) => void,
    pushHistory: () => void,
  ) => void;
  updateAutoConnectPreview: (
    targetComp: ComponentInstance,
    targetPin: number,
    snapshot: CircuitSnapshot,
  ) => void;
  clearAutoConnectPreview: () => void;
  cancelAutoConnect: () => void;
}

/**
 * UseWireDrawing
 */
export function useWireDrawing(): WireDrawingControls {
  const [pendingWire, setPendingWire] = useState<PendingWire | null>(null);
  const [autoConnectPreview, setAutoConnectPreview] =
    useState<AutoConnectPreview | null>(null);

  const startWire = useCallback(
    (
      e: React.MouseEvent,
      comp: ComponentInstance,
      pin: number,
      toWorld: (sx: number, sy: number) => { x: number; y: number },
    ) => {
      e.stopPropagation();
      e.preventDefault();

      const p = toWorld(e.clientX, e.clientY);
      const def = library.has(comp.type) ? library.get(comp.type) : null;
      const isBus =
        def !== null &&
        (def.isBusOutput === true ||
          (def.busOutputGroups?.some(([s]) => s === pin) ?? false));

      const isAutoConnect = !isBus && isAutoConnectModifier(e);

      setPendingWire({
        from: { comp: comp.id, pin },
        mx: p.x,
        my: p.y,
        isBus,
        ...(isAutoConnect ? { isAutoConnect: true } : {}),
      });
    },
    [],
  );

  const finishWire = useCallback(
    (
      e: React.MouseEvent,
      comp: ComponentInstance,
      pin: number,
      snapshot: CircuitSnapshot,
      addWire: (
        fromComp: string,
        fromPin: number,
        toComp: string,
        toPin: number,
      ) => Wire | null,
      addLog: (kind: ConsoleTab, msg: string) => void,
      pushHistory: () => void,
    ) => {
      e.stopPropagation();

      if (!pendingWire) return;

      if (pendingWire.from.comp === comp.id) {
        setPendingWire(null);
        setAutoConnectPreview(null);

        return;
      }

      // ── Auto-connect variant ──────────────────────────────────────────────
      if (pendingWire.isAutoConnect) {
        // Look up source component from snapshot
        const sourceComp = snapshot.components[pendingWire.from.comp];

        if (
          !sourceComp ||
          !library.has(sourceComp.type) ||
          !library.has(comp.type)
        ) {
          // Cannot resolve definitions — fall through to single-wire logic
        } else {
          const sourceDef = library.get(sourceComp.type);
          const targetDef = library.get(comp.type);

          // Compute eligible pins
          const eligibleOutputs = getEligibleOutputPins(sourceDef);
          const eligibleInputs = getEligibleInputPins(targetDef);

          // Match pins positionally
          const pairs = matchPins(eligibleOutputs, eligibleInputs);

          if (pairs.length > 0) {
            // Execute auto-connect: iterate pairs and call addWire for each
            let created = 0;
            const total = pairs.length;

            for (const pair of pairs) {
              const wire = addWire(
                pendingWire.from.comp,
                pair.fromPin,
                comp.id,
                pair.toPin,
              );

              if (wire) created += 1;
            }

            if (created > 0) {
              pushHistory();
              addLog(
                CONSOLE_TAB.LOG,
                `Auto-connected: ${created} of ${total} wires`,
              );
            } else {
              addLog(
                CONSOLE_TAB.WARN,
                `Auto-connect: all ${total} wire(s) skipped (targets occupied or validation failed)`,
              );
            }

            setPendingWire(null);
            setAutoConnectPreview(null);

            return;
          }
          // pairs is empty (count mismatch) — fall through to single-wire logic
        }
      }

      // ── Bus wire variant ──────────────────────────────────────────────────
      if (pendingWire.isBus) {
        if (!library.has(comp.type)) {
          setPendingWire(null);

          return;
        }

        const targetDef = library.get(comp.type);
        const busGroup = targetDef.busInputGroups?.find(([s]) => s === pin);
        const isBusTarget = targetDef.isBusInput || busGroup !== undefined;

        if (!isBusTarget) {
          addLog(
            CONSOLE_TAB.WARN,
            "Bus wire can only connect to a bus input port",
          );
          setPendingWire(null);

          return;
        }

        const srcComp = snapshot.components[pendingWire.from.comp];

        if (!srcComp || !library.has(srcComp.type)) {
          setPendingWire(null);

          return;
        }

        const sourceDef = library.get(srcComp.type);
        const srcBusGroup = sourceDef.busOutputGroups?.find(
          ([s]) => s === pendingWire.from.pin,
        );
        const srcStart = srcBusGroup ? srcBusGroup[0] : 0;
        const srcEnd = srcBusGroup ? srcBusGroup[1] : sourceDef.outputs;
        const tgtStart = busGroup ? busGroup[0] : 0;
        const tgtEnd = busGroup ? busGroup[1] : targetDef.inputs;

        let created = 0;
        const wireCount = Math.min(srcEnd - srcStart, tgtEnd - tgtStart);

        for (let i = 0; i < wireCount; i += 1) {
          const wire = addWire(
            pendingWire.from.comp,
            srcStart + i,
            comp.id,
            tgtStart + i,
          );

          if (wire) created += 1;
        }

        if (created > 0)
          addLog(CONSOLE_TAB.LOG, `Bus connected: ${created} wires created`);

        if (created > 0) pushHistory();

        setPendingWire(null);

        return;
      }

      // ── Non-bus wire attempting to connect to bus input port ───────────────
      if (pin === -1) {
        if (library.has(comp.type) && library.get(comp.type).isBusInput)
          addLog(CONSOLE_TAB.WARN, "Use a bus wire to connect to this port");

        setPendingWire(null);

        return;
      }

      // Block non-bus wire from connecting to a bus group port in mixed mode
      if (library.has(comp.type)) {
        const tDef = library.get(comp.type);

        if (tDef.busInputGroups?.some(([s]) => s === pin)) {
          addLog(CONSOLE_TAB.WARN, "Use a bus wire to connect to this port");
          setPendingWire(null);

          return;
        }
      }

      // ── Regular wire ──────────────────────────────────────────────────────
      const wire = addWire(
        pendingWire.from.comp,
        pendingWire.from.pin,
        comp.id,
        pin,
      );

      if (wire) {
        pushHistory();
        addLog(CONSOLE_TAB.LOG, `Wire connected (${wire.id})`);
      }

      setPendingWire(null);
    },
    [pendingWire],
  );

  /**
   * Computes the auto-connect preview when hovering over a target pin.
   * Identifies eligible pins on both source and target, matches them,
   * and sets the preview state for rendering.
   */
  const updateAutoConnectPreview = useCallback(
    (
      targetComp: ComponentInstance,
      _targetPin: number,
      snapshot: CircuitSnapshot,
    ) => {
      // Only compute preview in auto-connect mode
      if (!pendingWire?.isAutoConnect) {
        setAutoConnectPreview(null);

        return;
      }

      // Reject self-connection
      if (pendingWire.from.comp === targetComp.id) {
        setAutoConnectPreview(null);

        return;
      }

      // Look up source component from snapshot
      // If the source component was removed during drag, cancel the entire gesture (Req 11.6)
      const sourceComp = snapshot.components[pendingWire.from.comp];

      if (!sourceComp) {
        setPendingWire(null);
        setAutoConnectPreview(null);

        return;
      }

      // If the target component was removed during drag, clear preview (Req 11.6)
      if (!snapshot.components[targetComp.id]) {
        setAutoConnectPreview(null);

        return;
      }

      // Look up component definitions from the library
      if (!library.has(sourceComp.type) || !library.has(targetComp.type)) {
        setAutoConnectPreview(null);

        return;
      }

      const sourceDef = library.get(sourceComp.type);
      const targetDef = library.get(targetComp.type);

      // Get eligible pins
      const eligibleOutputs = getEligibleOutputPins(sourceDef);
      const eligibleInputs = getEligibleInputPins(targetDef);

      // Match pins positionally
      const pairs = matchPins(eligibleOutputs, eligibleInputs);

      if (pairs.length > 0) {
        setAutoConnectPreview({
          pairs,
          sourceComp: pendingWire.from.comp,
          targetComp: targetComp.id,
        });
      } else {
        // Pin count mismatch or no eligible pins — no preview
        setAutoConnectPreview(null);
      }
    },
    [pendingWire],
  );

  /**
   * Clears the auto-connect preview (e.g., when mouse leaves a target pin area).
   */
  const clearAutoConnectPreview = useCallback(() => {
    setAutoConnectPreview(null);
  }, []);

  /**
   * Cancels auto-connect mode, reverting to single-wire preview.
   * Called when the modifier key is released during a drag.
   */
  const cancelAutoConnect = useCallback(() => {
    if (pendingWire?.isAutoConnect) {
      setPendingWire((prev) => {
        if (!prev) return null;

        const { isAutoConnect, ...rest } = prev;

        return rest;
      });
    }

    setAutoConnectPreview(null);
  }, [pendingWire]);

  return {
    pendingWire,
    setPendingWire,
    autoConnectPreview,
    setAutoConnectPreview,
    startWire,
    finishWire,
    updateAutoConnectPreview,
    clearAutoConnectPreview,
    cancelAutoConnect,
  };
}
