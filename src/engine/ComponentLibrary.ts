/* eslint-disable max-classes-per-file */
/* eslint-disable class-methods-use-this */
/**
 * ComponentLibrary — authoritative registry of all component definitions.
 *
 * This module contains only the registry class. All component definitions
 * are imported from `./definitions/` where each component or family has its
 * own file with co-located evaluation logic.
 *
 * Responsibilities:
 *   • Stores a Map<string, ComponentDefinition>
 *   • Validates definitions on registration (pin counts, labels, evaluate contract)
 *   • Registers/unregisters custom circuits (sub-circuit compilation)
 *   • Provides category ordering for the toolbox panel
 */
import { v4 as uuidv4 } from "uuid";

import { MIN_COMP_SIZE } from "@/globals";

import {
  GATE_CATEGORY_ARITHMETIC,
  GATE_CATEGORY_BUS,
  GATE_CATEGORY_CUSTOM,
  GATE_CATEGORY_INPUT,
  GATE_CATEGORY_LOGIC,
  GATE_CATEGORY_OUTPUT,
  GATE_CATEGORY_SEQUENTIAL,
  GATE_CATEGORY_UTILITY,
  GATE_SEPARATOR,
  GATE_TYPE_AND,
  GATE_TYPE_AND3,
  GATE_TYPE_AND4,
  GATE_TYPE_AND8,
  GATE_TYPE_AND16,
  GATE_TYPE_BROADCASTER,
  GATE_TYPE_BUFFER,
  GATE_TYPE_BUS_AND4,
  GATE_TYPE_BUS_AND8,
  GATE_TYPE_BUS_AND16,
  GATE_TYPE_BUS_DISPLAY,
  GATE_TYPE_BUS_DISPLAY8,
  GATE_TYPE_BUS_DISPLAY16,
  GATE_TYPE_BUS_INPUT4,
  GATE_TYPE_BUS_INPUT8,
  GATE_TYPE_BUS_INPUT16,
  GATE_TYPE_BUS_NOT4,
  GATE_TYPE_BUS_NOT8,
  GATE_TYPE_BUS_NOT16,
  GATE_TYPE_BUS_OR4,
  GATE_TYPE_BUS_OR8,
  GATE_TYPE_BUS_OR16,
  GATE_TYPE_BUS4,
  GATE_TYPE_BUS8,
  GATE_TYPE_BUS16,
  GATE_TYPE_BUTTON,
  GATE_TYPE_CLOCK,
  GATE_TYPE_CMP4,
  GATE_TYPE_COMMENT,
  GATE_TYPE_COMPARATOR,
  GATE_TYPE_CONST,
  GATE_TYPE_COUNTER4,
  GATE_TYPE_DEBUS4,
  GATE_TYPE_DEBUS8,
  GATE_TYPE_DEBUS16,
  GATE_TYPE_DECODER2,
  GATE_TYPE_DECODER3,
  GATE_TYPE_DEMUX2,
  GATE_TYPE_DFF,
  GATE_TYPE_DIGIT_BIN,
  GATE_TYPE_DISPLAY7,
  GATE_TYPE_DLATCH,
  GATE_TYPE_ENCODER4,
  GATE_TYPE_FULL_ADDER,
  GATE_TYPE_FULL_SUB,
  GATE_TYPE_GND,
  GATE_TYPE_HALF_ADDER,
  GATE_TYPE_HALF_SUB,
  GATE_TYPE_JKFF,
  GATE_TYPE_LED,
  GATE_TYPE_MUX2,
  GATE_TYPE_MUX4,
  GATE_TYPE_MUX8,
  GATE_TYPE_NAND,
  GATE_TYPE_NOR,
  GATE_TYPE_NOT,
  GATE_TYPE_NOT2,
  GATE_TYPE_NOT4,
  GATE_TYPE_NOT8,
  GATE_TYPE_OR,
  GATE_TYPE_OR3,
  GATE_TYPE_OR4,
  GATE_TYPE_OR8,
  GATE_TYPE_OR16,
  GATE_TYPE_PROBE,
  GATE_TYPE_RECEIVER,
  GATE_TYPE_REG4,
  GATE_TYPE_SHREG4,
  GATE_TYPE_SPLITTER,
  GATE_TYPE_SR_LATCH,
  GATE_TYPE_TIFF,
  GATE_TYPE_TOGGLE,
  GATE_TYPE_UREG4,
  GATE_TYPE_UREG8,
  GATE_TYPE_VCC,
  GATE_TYPE_XNOR,
  GATE_TYPE_XOR,
  KEY_SEPARATOR,
  PINC0,
} from "./constants";
import { DEFINITIONS } from "./definitions";
import type {
  CircuitSnapshot,
  ComponentDefinition,
  EvaluateResult,
  SignalValue,
} from "./types";
import { LogicValue } from "./types";
import { getHeightForPinCount } from "./utils";

const { ZERO } = LogicValue;

export interface CustomGateMeta {
  type: string;
  name: string;
  inputLabels: string[];
  outputLabels: string[];
  circuit: CircuitSnapshot;
}

// ── Registry class ────────────────────────────────────────────────────────────

/**
 * ComponentLibrary — Authoritative registry of all component definitions.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENT DEFINITION CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Required fields:
 *   type       — Unique string identifier (must not collide with existing)
 *   label      — Display name (may be an i18n key)
 *   category   — One of GATE_CATEGORY_* constants
 *   inputs     — Number of input pins (>= 0)
 *   outputs    — Number of output pins (>= 0)
 *   width      — Component width in pixels (> 0)
 *   height     — Component height in pixels (> 0)
 *   isSequential — True if evaluation depends on clock edges
 *   isClock    — True if this component drives the simulation clock
 *   isInput    — True if this is a user-driven input source
 *   isOutput   — True if this is an output sink (LED, Display)
 *   initialState — Factory function returning the initial state object
 *   evaluate   — Pure evaluation function (inputs, state) → (outputs, state)
 *
 * Optional fields:
 *   symbol, inputLabels, outputLabels, tick, isAnnotation,
 *   samplesEveryTick, needsInputSnapshot, isBusInput, isBusOutput,
 *   busInputGroups, busOutputGroups
 *
 * Invariants enforced at registration:
 *   - type must be unique (no overwrites unless unregister is called first)
 *   - inputs >= 0, outputs >= 0
 *   - width > 0, height > 0
 *   - inputLabels.length === inputs (if provided)
 *   - outputLabels.length === outputs (if provided)
 *   - busInputGroups ranges must be within [0, inputs)
 *   - busOutputGroups ranges must be within [0, outputs)
 *   - initialState() must produce a valid state for the evaluator
 *   - evaluate(defaultInputs, initialState) must return correct output count
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Validation error thrown when a component definition is invalid */
class ComponentValidationError extends Error {
  constructor(type: string, issue: string) {
    super(`[ComponentLibrary] Invalid definition for "${type}": ${issue}`);
    this.name = "ComponentValidationError";
  }
}

export class ComponentLibrary {
  private typeMap: Map<string, ComponentDefinition> = new Map();
  private customTypes: Set<string> = new Set();
  private customMeta: Map<string, CustomGateMeta> = new Map();

  constructor(defs: ComponentDefinition[] = DEFINITIONS) {
    for (const d of defs) {
      this.validateAndRegister(d);
    }
  }

  get(type: string): ComponentDefinition {
    const def = this.typeMap.get(type);

    if (!def) throw new Error(`Unknown component type: "${type}"`);

    return def;
  }

  has(type: string): boolean {
    return this.typeMap.has(type);
  }

  isCustom(type: string): boolean {
    return this.customTypes.has(type);
  }

  getCustomMeta(type: string): CustomGateMeta | undefined {
    return this.customMeta.get(type);
  }

  getCustomGates(): CustomGateMeta[] {
    return Array.from(this.customMeta.values());
  }

  getAll(): ComponentDefinition[] {
    return Array.from(this.typeMap.values());
  }

  /**
   * Register a component definition with full validation.
   * Throws ComponentValidationError if the definition is invalid.
   * Rejects duplicate type IDs unless the type was previously unregistered.
   */
  register(def: ComponentDefinition): void {
    // Reject duplicates for safety
    if (this.typeMap.has(def.type) && !this.customTypes.has(def.type)) {
      throw new ComponentValidationError(
        def.type,
        `Type "${def.type}" is already registered. Unregister it first or use a unique type ID.`,
      );
    }

    this.validateAndRegister(def);
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  private validateAndRegister(def: ComponentDefinition): void {
    this.validatePinDefinition(def);
    this.validateInitialState(def);
    this.validateEvaluatorContract(def);
    this.typeMap.set(def.type, def);
  }

  private validatePinDefinition(def: ComponentDefinition): void {
    const t = def.type;

    if (def.inputs < 0) {
      throw new ComponentValidationError(
        t,
        `inputs must be >= 0, got ${def.inputs}`,
      );
    }

    if (def.outputs < 0) {
      throw new ComponentValidationError(
        t,
        `outputs must be >= 0, got ${def.outputs}`,
      );
    }

    if (def.width <= 0) {
      throw new ComponentValidationError(
        t,
        `width must be > 0, got ${def.width}`,
      );
    }

    if (def.height <= 0) {
      throw new ComponentValidationError(
        t,
        `height must be > 0, got ${def.height}`,
      );
    }

    if (def.inputLabels && def.inputLabels.length !== def.inputs) {
      throw new ComponentValidationError(
        t,
        `inputLabels length (${def.inputLabels.length}) does not match inputs (${def.inputs})`,
      );
    }

    if (def.outputLabels && def.outputLabels.length !== def.outputs) {
      throw new ComponentValidationError(
        t,
        `outputLabels length (${def.outputLabels.length}) does not match outputs (${def.outputs})`,
      );
    }

    if (def.inputLabels) {
      const seen = new Set<string>();

      for (const label of def.inputLabels) {
        if (seen.has(label)) {
          throw new ComponentValidationError(
            t,
            `Duplicate input label: "${label}"`,
          );
        }

        seen.add(label);
      }
    }

    if (def.outputLabels) {
      const seen = new Set<string>();

      for (const label of def.outputLabels) {
        if (seen.has(label)) {
          throw new ComponentValidationError(
            t,
            `Duplicate output label: "${label}"`,
          );
        }

        seen.add(label);
      }
    }

    if (def.busInputGroups) {
      for (const [start, end] of def.busInputGroups) {
        if (start < 0 || end > def.inputs || start >= end) {
          throw new ComponentValidationError(
            t,
            `Invalid busInputGroup [${start}, ${end}) for ${def.inputs} inputs`,
          );
        }
      }
    }

    if (def.busOutputGroups) {
      for (const [start, end] of def.busOutputGroups) {
        if (start < 0 || end > def.outputs || start >= end) {
          throw new ComponentValidationError(
            t,
            `Invalid busOutputGroup [${start}, ${end}) for ${def.outputs} outputs`,
          );
        }
      }
    }
  }

  private validateInitialState(def: ComponentDefinition): void {
    try {
      const state = def.initialState();

      if (def.isSequential && state && "prevClk" in state) {
        const { prevClk } = state;

        if (typeof prevClk !== "number" || prevClk < 0 || prevClk > 3) {
          throw new ComponentValidationError(
            def.type,
            `prevClk in initialState must be a valid LogicValue (0-3), got ${String(prevClk)}`,
          );
        }
      }
    } catch (e) {
      if (e instanceof ComponentValidationError) throw e;
      throw new ComponentValidationError(
        def.type,
        `initialState() threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private validateEvaluatorContract(def: ComponentDefinition): void {
    if (def.isAnnotation) return;
    if (def.inputs === 0 && def.outputs === 0) return;

    try {
      const state = def.initialState();
      const defaultInputs = new Array<SignalValue>(def.inputs).fill(ZERO);
      const result = def.evaluate(defaultInputs, state, { tick: 0 });

      if (result.outputs.length !== def.outputs) {
        throw new ComponentValidationError(
          def.type,
          `Evaluator returned ${result.outputs.length} outputs but definition declares ${def.outputs}`,
        );
      }
    } catch (e) {
      if (e instanceof ComponentValidationError) throw e;
      throw new ComponentValidationError(
        def.type,
        `Evaluator threw on default inputs: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /**
   * Returns a list of custom gate type strings that depend on the given type.
   */
  getDependents(type: string): string[] {
    const dependents: string[] = [];

    for (const [depType, meta] of this.customMeta) {
      if (depType === type) continue;

      const usesType = Object.values(meta.circuit.components).some(
        (c) => c.type === type,
      );

      if (usesType) dependents.push(depType);
    }

    return dependents;
  }

  /**
   * Returns true if all custom gate dependencies of the given type are
   * currently registered in the library.
   */
  hasValidDependencies(type: string): boolean {
    const meta = this.customMeta.get(type);

    if (!meta) return true;

    for (const comp of Object.values(meta.circuit.components)) {
      if (!comp.type.startsWith("CUSTOM_")) continue;
      if (comp.type === type) continue;
      if (!this.has(comp.type)) return false;
    }

    return true;
  }

  /**
   * Remove a previously registered component (custom gates only).
   * Returns an error message if the type has dependents, null on success.
   */
  unregister(type: string, force = false): string | null {
    if (!force) {
      const dependents = this.getDependents(type);

      if (dependents.length > 0) {
        const names = dependents
          .map((t) => this.customMeta.get(t)?.name ?? t)
          .join(", ");

        return `Cannot delete: used by ${names}`;
      }
    }

    this.typeMap.delete(type);
    this.customTypes.delete(type);
    this.customMeta.delete(type);

    return null;
  }

  /**
   * Compile a circuit into a reusable black-box component.
   */
  registerCustomCircuit(
    name: string,
    circuit: CircuitSnapshot,
    existingType?: string,
  ): string | null {
    const knownComps = Object.values(circuit.components)
      .flatMap((component) => {
        if (!this.has(component.type)) return [];

        return [{ component, def: this.get(component.type) }];
      })
      .sort(
        (left, right) =>
          left.component.y - right.component.y ||
          left.component.x - right.component.x,
      );
    const compById = new Map(
      knownComps.map(({ component, def }) => [
        component.id,
        { component, def },
      ]),
    );
    const sourceComps = knownComps.filter(
      ({ def }) => def.isInput || def.isClock,
    );
    const sinkComps = knownComps.filter(({ def }) => def.isOutput);

    if (sourceComps.length === 0 && sinkComps.length === 0) return null;

    const clockComps = sourceComps.filter(({ def }) => def.isClock);
    const nonClockSourceComps = sourceComps.filter(({ def }) => !def.isClock);
    const hasInternalClocks = clockComps.length > 0;

    const sourceIds = new Set(sourceComps.map(({ component }) => component.id));
    const sinkIds = new Set(sinkComps.map(({ component }) => component.id));
    const executable = knownComps.filter(
      ({ component }) =>
        !sourceIds.has(component.id) && !sinkIds.has(component.id),
    );
    const executableIds = new Set(
      executable.map(({ component }) => component.id),
    );

    const portLabel = (
      label: string | undefined,
      pinLabel: string | undefined,
      pin: number,
      pinCount: number,
      fallback: string,
    ) => {
      const base = label || fallback;

      return pinCount === 1 ? base : `${base}.${pinLabel ?? `P${pin}`}`;
    };

    // Build input ports
    const inputPorts: Array<{ compId: string; pin: number; label: string }> =
      [];
    const busInputGroups: [number, number][] = [];

    for (let ci = 0; ci < nonClockSourceComps.length; ci += 1) {
      const { component, def } = nonClockSourceComps[ci];
      const startIdx = inputPorts.length;

      for (let pin = 0; pin < def.outputs; pin += 1) {
        inputPorts.push({
          compId: component.id,
          pin,
          label: portLabel(
            component.label,
            def.outputLabels?.[pin],
            pin,
            def.outputs,
            def.isBusOutput ? `BUS${ci}` : `IN${ci}`,
          ),
        });
      }

      if (def.isBusOutput) {
        busInputGroups.push([startIdx, inputPorts.length]);
      }
    }

    if (hasInternalClocks) {
      inputPorts.push({ compId: "__CLK__", pin: PINC0, label: "CLK" });
    }

    // Build output ports
    const busOutputGroups: [number, number][] = [];
    const outputPorts: Array<{ compId: string; pin: number; label: string }> =
      [];

    for (let ci = 0; ci < sinkComps.length; ci += 1) {
      const { component, def } = sinkComps[ci];
      const startIdx = outputPorts.length;

      for (let pin = 0; pin < def.inputs; pin += 1) {
        outputPorts.push({
          compId: component.id,
          pin,
          label: portLabel(
            component.label,
            def.inputLabels?.[pin],
            pin,
            def.inputs,
            def.isBusInput ? `BOUT${ci}` : `OUT${ci}`,
          ),
        });
      }

      if (def.isBusInput) {
        busOutputGroups.push([startIdx, outputPorts.length]);
      }
    }

    const inputLabels = inputPorts.map((port) => port.label);
    const outputLabels = outputPorts.map((port) => port.label);
    const inputWires = new Map<string, { fromComp: string; fromPin: number }>();

    for (const wire of Object.values(circuit.wires)) {
      const from = compById.get(wire.from.comp);
      const to = compById.get(wire.to.comp);

      if (!from || !to) continue;
      if (wire.from.pin < 0 || wire.from.pin >= from.def.outputs) continue;
      if (wire.to.pin < 0 || wire.to.pin >= to.def.inputs) continue;

      inputWires.set(`${wire.to.comp}${KEY_SEPARATOR}${wire.to.pin}`, {
        fromComp: wire.from.comp,
        fromPin: wire.from.pin,
      });
    }

    const downstream = new Map<string, Set<string>>(
      executable.map(({ component }) => [component.id, new Set()]),
    );
    const inDegree = new Map<string, number>(
      executable.map(({ component }) => [component.id, 0]),
    );

    for (const { component, def } of executable) {
      if (def.isSequential) continue;

      for (let pin = 0; pin < def.inputs; pin += 1) {
        const wire = inputWires.get(`${component.id}${KEY_SEPARATOR}${pin}`);

        if (!wire || !executableIds.has(wire.fromComp)) continue;

        const targets = downstream.get(wire.fromComp);

        if (targets?.has(component.id)) continue;

        targets?.add(component.id);
        inDegree.set(component.id, (inDegree.get(component.id) ?? 0) + 1);
      }
    }

    const queue = executable
      .filter(({ component }) => (inDegree.get(component.id) ?? 0) === 0)
      .map(({ component }) => component.id);
    const executionOrder: string[] = [];

    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];

      executionOrder.push(id);

      for (const target of downstream.get(id) ?? []) {
        const nextDegree = (inDegree.get(target) ?? 0) - 1;

        inDegree.set(target, nextDegree);
        if (nextDegree === 0) queue.push(target);
      }
    }

    const cyclicIds = new Set(
      executable
        .map(({ component }) => component.id)
        .filter((id) => !executionOrder.includes(id)),
    );
    const cyclicOrder = executable
      .map(({ component }) => component.id)
      .filter((id) => cyclicIds.has(id));
    const numInputs = inputPorts.length;
    const numOutputs = outputPorts.length;
    const safeName = name.replace(/\W+/g, "_").toUpperCase();
    const type =
      existingType ??
      `CUSTOM_${safeName}_${uuidv4().toUpperCase().replace(/-/g, "")}`;
    const hasSequentialInternals =
      hasInternalClocks ||
      executable.some(({ def }) => def.isSequential || def.needsInputSnapshot);
    const createInitialStates = (): Record<
      string,
      Record<string, unknown> | null
    > =>
      Object.fromEntries(
        executable.map(({ component, def }) => [
          component.id,
          def.initialState(),
        ]),
      );
    const createInitialOutputs = (): Record<string, SignalValue[]> =>
      Object.fromEntries(
        executable.map(({ component, def }) => [
          component.id,
          new Array<SignalValue>(def.outputs).fill(ZERO),
        ]),
      );

    const evaluateCompiled = (
      externalInputs: SignalValue[],
      state: Record<string, unknown> | null,
      snapshotInputs: SignalValue[] | undefined,
      tick: number,
    ): EvaluateResult => {
      const saved = state as {
        compStates?: Record<string, Record<string, unknown> | null>;
        compOutputs?: Record<string, SignalValue[]>;
      } | null;
      const compStates = {
        ...createInitialStates(),
        ...(saved?.compStates ?? {}),
      };
      const savedOutputs = saved?.compOutputs ?? {};
      const signals: Record<string, SignalValue[]> = {};
      const priorSignals: Record<string, SignalValue[]> = {};

      for (const { component, def } of knownComps) {
        const prior = savedOutputs[component.id];
        const outputs =
          prior?.slice() ?? new Array<SignalValue>(def.outputs).fill(ZERO);

        signals[component.id] = outputs;
        priorSignals[component.id] = outputs.slice();
      }

      inputPorts.forEach((port, index) => {
        if (port.compId === "__CLK__") {
          const clkVal = externalInputs[index];
          const clkPrior = snapshotInputs?.[index] ?? externalInputs[index];

          for (const { component, def: clkDef } of clockComps) {
            for (let p = 0; p < clkDef.outputs; p += 1) {
              signals[component.id][p] = clkVal;
              priorSignals[component.id][p] = clkPrior;
            }
          }

          return;
        }

        signals[port.compId][port.pin] = externalInputs[index];
        priorSignals[port.compId][port.pin] =
          snapshotInputs?.[index] ?? externalInputs[index];
      });

      const readInputs = (
        compId: string,
        useSnapshot: boolean,
      ): SignalValue[] => {
        const target = compById.get(compId);

        if (!target) return [];

        const inputs = new Array<SignalValue>(target.def.inputs).fill(
          LogicValue.HIGH_IMPEDANCE,
        );
        const sourceSignals = useSnapshot ? priorSignals : signals;

        for (let pin = 0; pin < target.def.inputs; pin += 1) {
          const wire = inputWires.get(`${compId}${KEY_SEPARATOR}${pin}`);

          if (wire)
            inputs[pin] = sourceSignals[wire.fromComp]?.[wire.fromPin] ?? ZERO;
        }

        return inputs;
      };

      const evaluateComponent = (id: string): boolean => {
        const entry = compById.get(id);

        if (!entry) return false;

        const liveInputs = readInputs(id, false);
        const priorInputs = readInputs(id, true);
        const inputs = entry.def.isSequential ? priorInputs : liveInputs;
        const previousOutputs = signals[id];
        const result = entry.def.evaluate(inputs, compStates[id], {
          tick,
          snapshotInputs: priorInputs,
        });

        signals[id] = result.outputs;
        compStates[id] = result.state;

        return (
          previousOutputs.length !== result.outputs.length ||
          previousOutputs.some((value, pin) => value !== result.outputs[pin])
        );
      };

      for (const id of executionOrder) evaluateComponent(id);

      if (cyclicOrder.length > 0) {
        const pending = [...cyclicOrder];
        const queued = new Set(cyclicOrder);
        const evaluations = new Map<string, number>();

        for (let index = 0; index < pending.length; index += 1) {
          const id = pending[index];

          queued.delete(id);

          const count = (evaluations.get(id) ?? 0) + 1;

          evaluations.set(id, count);
          if (count > 64) continue;

          if (!evaluateComponent(id)) continue;

          for (const target of downstream.get(id) ?? []) {
            if (!cyclicIds.has(target) || queued.has(target)) continue;

            queued.add(target);
            pending.push(target);
          }
        }
      }

      const outputs = outputPorts.map(
        (port) => readInputs(port.compId, false)[port.pin] ?? ZERO,
      );
      const compOutputs = Object.fromEntries(
        executable.map(({ component }) => [
          component.id,
          signals[component.id].slice(),
        ]),
      );

      return { outputs, state: { compStates, compOutputs } };
    };

    // Compute visual slot counts for height calculation
    const inputSlotCount =
      busInputGroups.length > 0
        ? numInputs -
          busInputGroups.reduce((sum, [s, e]) => sum + (e - s), 0) +
          busInputGroups.length
        : numInputs;
    const outputSlotCount =
      busOutputGroups.length > 0
        ? numOutputs -
          busOutputGroups.reduce((sum, [s, e]) => sum + (e - s), 0) +
          busOutputGroups.length
        : numOutputs;

    const maxSlots = Math.max(inputSlotCount, outputSlotCount);
    const busSlots =
      inputSlotCount >= outputSlotCount
        ? busInputGroups.length
        : busOutputGroups.length;

    const def: ComponentDefinition = {
      type,
      label: name,
      category: GATE_CATEGORY_CUSTOM,
      inputs: numInputs,
      outputs: numOutputs,
      width: Math.max(MIN_COMP_SIZE, 90),
      height: getHeightForPinCount(maxSlots, busSlots),
      symbol: name.slice(0, 4),
      isSequential: false,
      needsInputSnapshot: hasSequentialInternals,
      isClock: false,
      isInput: false,
      isOutput: false,
      isBusOutput:
        sinkComps.every(({ def: sinkDef }) => sinkDef.isBusInput) &&
        sinkComps.some(({ def: sinkDef }) => sinkDef.isBusInput),
      isBusInput:
        nonClockSourceComps.every(({ def: srcDef }) => srcDef.isBusOutput) &&
        nonClockSourceComps.some(({ def: srcDef }) => srcDef.isBusOutput),
      busInputGroups:
        busInputGroups.length > 0 &&
        !nonClockSourceComps.every(({ def: srcDef }) => srcDef.isBusOutput)
          ? busInputGroups
          : undefined,
      busOutputGroups:
        busOutputGroups.length > 0 &&
        !sinkComps.every(({ def: sinkDef }) => sinkDef.isBusInput)
          ? busOutputGroups
          : undefined,
      inputLabels,
      outputLabels,
      initialState: () => {
        const blankState = {
          compStates: createInitialStates(),
          compOutputs: createInitialOutputs(),
        };

        return evaluateCompiled(
          new Array<SignalValue>(numInputs).fill(ZERO),
          blankState,
          undefined,
          0,
        ).state;
      },
      evaluate(externalInputs, state, context) {
        return evaluateCompiled(
          externalInputs,
          state,
          context?.snapshotInputs,
          context?.tick ?? 0,
        );
      },
    };

    this.validateAndRegister(def);
    this.customTypes.add(type);
    this.customMeta.set(type, {
      type,
      name,
      inputLabels,
      outputLabels,
      circuit,
    });

    return type;
  }

  /** Category → sorted list of types for the toolbox panel */
  getCategories(): Array<{ name: string; gates: string[] }> {
    const ORDER = [
      GATE_CATEGORY_INPUT,
      GATE_CATEGORY_OUTPUT,
      GATE_CATEGORY_LOGIC,
      GATE_CATEGORY_SEQUENTIAL,
      GATE_CATEGORY_ARITHMETIC,
      GATE_CATEGORY_BUS,
      GATE_CATEGORY_UTILITY,
    ];

    const GATE_ORDER: Record<string, string[]> = {
      [GATE_CATEGORY_LOGIC]: [
        GATE_TYPE_AND,
        GATE_TYPE_AND3,
        GATE_TYPE_AND4,
        GATE_TYPE_AND8,
        GATE_TYPE_AND16,
        GATE_SEPARATOR,
        GATE_TYPE_OR,
        GATE_TYPE_OR3,
        GATE_TYPE_OR4,
        GATE_TYPE_OR8,
        GATE_TYPE_OR16,
        GATE_SEPARATOR,
        GATE_TYPE_XOR,
        GATE_TYPE_XNOR,
        GATE_SEPARATOR,
        GATE_TYPE_NAND,
        GATE_TYPE_NOR,
        GATE_SEPARATOR,
        GATE_TYPE_NOT,
        GATE_TYPE_NOT2,
        GATE_TYPE_NOT4,
        GATE_TYPE_NOT8,
        GATE_SEPARATOR,
        GATE_TYPE_BUFFER,
      ],
      [GATE_CATEGORY_INPUT]: [
        GATE_TYPE_TOGGLE,
        GATE_TYPE_BUTTON,
        GATE_TYPE_CONST,
        GATE_TYPE_CLOCK,
        GATE_SEPARATOR,
        GATE_TYPE_DIGIT_BIN,
        GATE_SEPARATOR,
        GATE_TYPE_VCC,
        GATE_TYPE_GND,
      ],
      [GATE_CATEGORY_OUTPUT]: [
        GATE_TYPE_LED,
        GATE_TYPE_DISPLAY7,
        GATE_TYPE_PROBE,
      ],
      [GATE_CATEGORY_SEQUENTIAL]: [
        GATE_TYPE_SR_LATCH,
        GATE_TYPE_DFF,
        GATE_TYPE_JKFF,
        GATE_TYPE_TIFF,
        GATE_TYPE_DLATCH,
        GATE_TYPE_REG4,
        GATE_TYPE_COUNTER4,
        GATE_TYPE_SHREG4,
      ],
      [GATE_CATEGORY_ARITHMETIC]: [
        GATE_TYPE_HALF_ADDER,
        GATE_TYPE_FULL_ADDER,
        GATE_SEPARATOR,
        GATE_TYPE_HALF_SUB,
        GATE_TYPE_FULL_SUB,
        GATE_SEPARATOR,
        GATE_TYPE_MUX2,
        GATE_TYPE_MUX4,
        GATE_TYPE_MUX8,
        GATE_TYPE_DEMUX2,
        GATE_SEPARATOR,
        GATE_TYPE_DECODER2,
        GATE_TYPE_DECODER3,
        GATE_TYPE_ENCODER4,
        GATE_SEPARATOR,
        GATE_TYPE_COMPARATOR,
        GATE_TYPE_CMP4,
      ],
      [GATE_CATEGORY_BUS]: [
        GATE_TYPE_BUS_INPUT4,
        GATE_TYPE_BUS_INPUT8,
        GATE_TYPE_BUS_INPUT16,
        GATE_SEPARATOR,
        GATE_TYPE_BUS4,
        GATE_TYPE_BUS8,
        GATE_TYPE_BUS16,
        GATE_SEPARATOR,
        GATE_TYPE_DEBUS4,
        GATE_TYPE_DEBUS8,
        GATE_TYPE_DEBUS16,
        GATE_SEPARATOR,
        GATE_TYPE_BUS_DISPLAY,
        GATE_TYPE_BUS_DISPLAY8,
        GATE_TYPE_BUS_DISPLAY16,
        GATE_SEPARATOR,
        GATE_TYPE_BUS_AND4,
        GATE_TYPE_BUS_AND8,
        GATE_TYPE_BUS_AND16,
        GATE_SEPARATOR,
        GATE_TYPE_BUS_OR4,
        GATE_TYPE_BUS_OR8,
        GATE_TYPE_BUS_OR16,
        GATE_SEPARATOR,
        GATE_TYPE_BUS_NOT4,
        GATE_TYPE_BUS_NOT8,
        GATE_TYPE_BUS_NOT16,
      ],
      [GATE_CATEGORY_UTILITY]: [
        GATE_TYPE_SPLITTER,
        GATE_TYPE_COMMENT,
        GATE_SEPARATOR,
        GATE_TYPE_BROADCASTER,
        GATE_TYPE_RECEIVER,
        GATE_SEPARATOR,
        GATE_TYPE_UREG4,
        GATE_TYPE_UREG8,
      ],
    };

    const groups = new Map<string, string[]>();
    const result: Array<{ name: string; gates: string[] }> = [];

    for (const def of this.typeMap.values()) {
      if (!groups.has(def.category)) groups.set(def.category, []);

      groups.get(def.category)?.push(def.type);
    }

    for (const cat of ORDER) {
      if (!groups.has(cat)) continue;

      const gates = groups.get(cat) ?? [];
      const order = GATE_ORDER[cat];

      if (order) {
        const ordered: string[] = [];
        const remaining = new Set(gates);

        for (const entry of order) {
          if (entry === GATE_SEPARATOR) {
            if (
              ordered.length > 0 &&
              ordered[ordered.length - 1] !== GATE_SEPARATOR
            ) {
              ordered.push(GATE_SEPARATOR);
            }
          } else if (remaining.has(entry)) {
            ordered.push(entry);
            remaining.delete(entry);
          }
        }

        for (const g of remaining) {
          ordered.push(g);
        }

        if (ordered[ordered.length - 1] === GATE_SEPARATOR) {
          ordered.pop();
        }

        result.push({ name: cat, gates: ordered });
      } else {
        result.push({ name: cat, gates });
      }
    }

    for (const [cat, gates] of groups) {
      if (!ORDER.includes(cat)) result.push({ name: cat, gates });
    }

    return result;
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const library = new ComponentLibrary();
