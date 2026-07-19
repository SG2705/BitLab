/**
 * useWireDrawing — manages pending wire state and bus/regular wire connection logic.
 */

import { useCallback, useState } from "react";

import type { CircuitSnapshot, ComponentInstance, Wire } from "@/engine";
import { library } from "@/engine";
import { CONSOLE_TAB } from "@/lib/constants";
import type { ConsoleTab } from "@/lib/types";

export interface PendingWire {
  from: { comp: string; pin: number };
  mx: number;
  my: number;
  isBus?: boolean;
}

export interface WireDrawingControls {
  pendingWire: PendingWire | null;
  setPendingWire: React.Dispatch<React.SetStateAction<PendingWire | null>>;
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
    saveProjectToLocal: () => void,
  ) => void;
}

/**
 * UseWireDrawing
 */
export function useWireDrawing(): WireDrawingControls {
  const [pendingWire, setPendingWire] = useState<PendingWire | null>(null);

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

      setPendingWire({ from: { comp: comp.id, pin }, mx: p.x, my: p.y, isBus });
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
      saveProjectToLocal: () => void,
    ) => {
      e.stopPropagation();

      if (!pendingWire) return;

      if (pendingWire.from.comp === comp.id) {
        setPendingWire(null);

        return;
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

        saveProjectToLocal();
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

      if (wire) addLog(CONSOLE_TAB.LOG, `Wire connected (${wire.id})`);

      saveProjectToLocal();
      setPendingWire(null);
    },
    [pendingWire],
  );

  return {
    pendingWire,
    setPendingWire,
    startWire,
    finishWire,
  };
}
