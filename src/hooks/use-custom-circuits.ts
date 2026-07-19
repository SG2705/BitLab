/**
 * useCustomCircuits — manages loading, creating, importing, and removing
 * custom circuit definitions from localStorage and the component library.
 */

import { useCallback, useEffect, useState } from "react";

import type { CircuitSnapshot } from "@/engine";
import { library } from "@/engine";
import { CONSOLE_TAB, CUSTOM_CIR_KEYS } from "@/lib/constants";
import type { ConsoleTab } from "@/lib/types";
import { getGateLabel } from "@/lib/utils";

export interface CustomCircuitControls {
  customBump: number;
  createCircuitFromGates: (
    snapshot: CircuitSnapshot,
    addLog: (kind: ConsoleTab, msg: string) => void,
  ) => void;
  importCustomCircuitFromFile: (
    e: React.ChangeEvent<HTMLInputElement>,
    addLog: (kind: ConsoleTab, msg: string) => void,
  ) => void;
  removeCustomCircuit: (
    type: string,
    addLog: (kind: ConsoleTab, msg: string) => void,
  ) => void;
  saveCustomCircuitToLocal: () => void;
}

/**
 * UseCustomCircuits
 */
export function useCustomCircuits(
  addLog: (kind: ConsoleTab, msg: string) => void,
): CustomCircuitControls {
  const [customBump, setCustomBump] = useState(0);

  const saveCustomCircuitToLocal = useCallback(() => {
    try {
      const gates = library.getCustomGates();

      localStorage.setItem(
        CUSTOM_CIR_KEYS,
        JSON.stringify(
          gates.map((m) => ({
            type: m.type,
            name: m.name,
            circuit: m.circuit,
          })),
        ),
      );
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Load custom circuits from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_CIR_KEYS);

      if (!raw) return;

      const saved = JSON.parse(raw) as {
        type?: string;
        name: string;
        circuit: CircuitSnapshot;
      }[];

      let anyRegistered = false;

      // Topologically sort entries so dependencies are registered before
      // the gates that use them.
      const typeToEntry = new Map(
        saved.map((entry) => [entry.type ?? entry.name, entry]),
      );
      const sorted: typeof saved = [];
      const visited = new Set<string>();

      const visit = (entry: (typeof saved)[0]) => {
        const key = entry.type ?? entry.name;

        if (visited.has(key)) return;

        visited.add(key);

        for (const comp of Object.values(entry.circuit.components)) {
          if (!comp.type.startsWith("CUSTOM_")) continue;

          const dep = typeToEntry.get(comp.type);

          if (dep) visit(dep);
        }

        sorted.push(entry);
      };

      for (const entry of saved) visit(entry);

      const nameToType = new Map<string, string>();

      for (const entry of sorted) {
        const assigned = library.registerCustomCircuit(
          entry.name,
          entry.circuit,
          entry.type,
        );

        if (assigned) {
          anyRegistered = true;
          nameToType.set(entry.name, assigned);
        }
      }

      if (anyRegistered) {
        // Build prefix lookup for backward-compat migration
        const prefixToType = new Map<string, string>();

        for (const [name, assignedType] of nameToType) {
          const prefix = `CUSTOM_${name.replace(/\W+/g, "_").toUpperCase()}_`;

          prefixToType.set(prefix, assignedType);
        }

        let remapped = false;

        for (const meta of library.getCustomGates()) {
          if (library.hasValidDependencies(meta.type)) continue;

          const remappedCircuit = {
            ...meta.circuit,
            components: { ...meta.circuit.components },
          };
          let fixed = false;

          for (const [id, comp] of Object.entries(remappedCircuit.components)) {
            if (library.has(comp.type)) continue;
            if (!comp.type.startsWith("CUSTOM_")) continue;

            for (const [prefix, newType] of prefixToType) {
              if (comp.type.startsWith(prefix) || comp.type === newType) {
                remappedCircuit.components[id] = { ...comp, type: newType };
                fixed = true;

                break;
              }
            }
          }

          if (fixed) {
            library.registerCustomCircuit(
              meta.name,
              remappedCircuit,
              meta.type,
            );
            remapped = true;
          }
        }

        // Final validation and re-registration pass
        const allMetas = library.getCustomGates();
        const metaByType = new Map(allMetas.map((m) => [m.type, m]));
        const reregistered = new Set<string>();

        const reregister = (type: string) => {
          if (reregistered.has(type)) return;

          reregistered.add(type);

          const meta = metaByType.get(type);

          if (!meta) return;
          if (!library.hasValidDependencies(meta.type)) return;

          for (const comp of Object.values(meta.circuit.components)) {
            if (
              comp.type.startsWith("CUSTOM_") &&
              comp.type !== type &&
              metaByType.has(comp.type)
            ) {
              reregister(comp.type);
            }
          }

          library.registerCustomCircuit(meta.name, meta.circuit, type);
        };

        for (const meta of allMetas) {
          if (!library.hasValidDependencies(meta.type)) {
            addLog(
              CONSOLE_TAB.ERROR,
              `Custom gate "${getGateLabel(meta.type, meta.name)}" has missing dependencies. Re-import the required sub-circuit.`,
            );

            continue;
          }

          reregister(meta.type);
        }

        if (remapped) {
          const gates = library.getCustomGates();

          localStorage.setItem(
            CUSTOM_CIR_KEYS,
            JSON.stringify(
              gates.map((m) => ({
                type: m.type,
                name: m.name,
                circuit: m.circuit,
              })),
            ),
          );
        }

        setCustomBump((v) => v + 1);
      }
    } catch {
      // corrupt or missing storage — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCircuitFromGates = useCallback(
    (
      snapshot: CircuitSnapshot,
      logFn: (kind: ConsoleTab, msg: string) => void,
    ) => {
      if (Object.keys(snapshot.components).length === 0) {
        logFn(CONSOLE_TAB.WARN, "Cannot create a gate from an empty circuit.");

        return;
      }

      // eslint-disable-next-line no-alert
      const name = window.prompt('Name your circuit (e.g. "4-bit Adder")');

      if (!name) return;

      const type = library.registerCustomCircuit(
        name.trim(),
        structuredClone(snapshot),
      );

      if (!type) {
        logFn(
          CONSOLE_TAB.ERROR,
          "Gate needs at least one input (Toggle/Button/Const/Clock) or output (LED).",
        );

        return;
      }

      setCustomBump((v) => v + 1);
      saveCustomCircuitToLocal();
      logFn(
        CONSOLE_TAB.LOG,
        `Registered custom gate "${name}". Drag it from the Custom category.`,
      );
    },
    [saveCustomCircuitToLocal],
  );

  const importCustomCircuitFromFile = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      logFn: (kind: ConsoleTab, msg: string) => void,
    ) => {
      const file = e.target.files?.[0];

      e.target.value = "";

      if (!file) return;

      const suggested = file.name
        .replace(/\.(bitlab|circuit|dgate|json)$/g, "")
        .replace(/\./g, "")
        .replace(/\s+/g, "-");

      file
        .text()
        .then((text) => {
          try {
            const parsed: unknown = JSON.parse(text);

            if (typeof parsed !== "object" || parsed === null) {
              throw new Error("Unrecognized JSON format");
            }

            const obj = parsed as Record<string, unknown>;

            let circuitData: CircuitSnapshot;

            if (obj.circuit && obj.version !== undefined) {
              circuitData = obj.circuit as CircuitSnapshot;
            } else if (obj.components) {
              circuitData = obj as unknown as CircuitSnapshot;
            } else {
              throw new Error("Unrecognized JSON format");
            }

            if (
              !circuitData.components ||
              typeof circuitData.components !== "object"
            )
              throw new Error("Invalid circuit file");

            // eslint-disable-next-line no-alert
            const name = window.prompt("Circuit name", suggested) || suggested;

            const type = library.registerCustomCircuit(
              name.trim(),
              circuitData,
            );

            if (!type) {
              logFn(
                CONSOLE_TAB.ERROR,
                "Imported circuit has no I/O components (add Toggles / LEDs to define pins).",
              );

              return;
            }

            if (!library.hasValidDependencies(type)) {
              logFn(
                CONSOLE_TAB.WARN,
                `"${name}" references sub-circuits not yet imported. Import those first or it will not function correctly.`,
              );
            }

            setCustomBump((v) => v + 1);
            saveCustomCircuitToLocal();
            logFn(CONSOLE_TAB.LOG, `Imported "${name}" as custom gate.`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);

            logFn(CONSOLE_TAB.ERROR, `Import failed: ${msg}`);
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);

          logFn(CONSOLE_TAB.ERROR, `File read failed: ${msg}`);
        });
    },
    [saveCustomCircuitToLocal],
  );

  const removeCustomCircuit = useCallback(
    (type: string, logFn: (kind: ConsoleTab, msg: string) => void) => {
      const error = library.unregister(type);

      if (error) {
        logFn(CONSOLE_TAB.ERROR, error);

        return;
      }

      setCustomBump((v) => v + 1);
      saveCustomCircuitToLocal();
    },
    [saveCustomCircuitToLocal],
  );

  return {
    customBump,
    createCircuitFromGates,
    importCustomCircuitFromFile,
    removeCustomCircuit,
    saveCustomCircuitToLocal,
  };
}
