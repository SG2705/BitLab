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
  GATE_TYPE_CUSTOM,
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
  PIN_TYPE_CLOCK,
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

const { ZERO: Z } = LogicValue;

export interface CustomCircuitDefinition {
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
  private readonly type: string;

  constructor(type: string) {
    super();
    this.name = "ComponentValidationError";
    this.type = type;
  }

  raiseValidationError(issue: string): never {
    throw new Error(
      `[ComponentLibrary] Invalid definition for "${this.type}": ${issue}`,
    );
  }
}

export class ComponentLibrary {
  private componentMap: Map<string, ComponentDefinition> = new Map();
  private customCircuitMap: Map<string, CustomCircuitDefinition> = new Map();

  constructor(components: ComponentDefinition[] = DEFINITIONS) {
    components.forEach((c) => this.validateAndRegisterComponent(c));
  }

  // Basic type and component checks
  get(type: string): ComponentDefinition {
    const component = this.componentMap.get(type);

    if (!component) throw new Error(`Unknown "${type}" requested!`);

    return component;
  }

  has(type: string): boolean {
    return this.componentMap.has(type);
  }

  isCustom(type: string): boolean {
    return this.customCircuitMap.has(type);
  }

  getCustomCircuit(type: string): CustomCircuitDefinition | undefined {
    return this.customCircuitMap.get(type);
  }

  getAll(): ComponentDefinition[] {
    return Array.from(this.componentMap.values());
  }

  getAllCustom(): CustomCircuitDefinition[] {
    return Array.from(this.customCircuitMap.values());
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  private validateComponentDefinition(comp: ComponentDefinition): void {
    const t = comp.type;
    const eo = new ComponentValidationError(t);

    if (
      this.componentMap.has(comp.type) &&
      !this.customCircuitMap.has(comp.type)
    ) {
      eo.raiseValidationError(
        `Type "${comp.type}" is already registered. Unregister it first or use a unique type ID.`,
      );
    }

    if (comp.inputs < 0) {
      eo.raiseValidationError(
        `Input pin count must be >= 0, got ${comp.inputs}`,
      );
    }

    if (comp.outputs < 0) {
      eo.raiseValidationError(
        `Output pin count must be >= 0, got ${comp.outputs}`,
      );
    }

    if (comp.width <= 0) {
      eo.raiseValidationError(`Width must be > 0, got ${comp.width}`);
    }

    if (comp.height <= 0) {
      eo.raiseValidationError(`Height must be > 0, got ${comp.height}`);
    }

    if (comp.inputLabels && comp.inputLabels.length !== comp.inputs) {
      eo.raiseValidationError(
        `Input label count (${comp.inputLabels.length}) does not match inputs (${comp.inputs})`,
      );
    }

    if (comp.outputLabels && comp.outputLabels.length !== comp.outputs) {
      eo.raiseValidationError(
        `Output label count (${comp.outputLabels.length}) does not match outputs (${comp.outputs})`,
      );
    }

    if (
      comp.inputLabels &&
      comp.inputLabels.length !== new Set(comp.inputLabels).size
    ) {
      eo.raiseValidationError("Duplicate input label");
    }

    if (
      comp.outputLabels &&
      comp.outputLabels.length !== new Set(comp.outputLabels).size
    ) {
      eo.raiseValidationError("Duplicate output label");
    }

    if (comp.busInputGroups) {
      comp.busInputGroups.forEach(([start, end]) => {
        if (start < 0 || end > comp.inputs || start >= end)
          eo.raiseValidationError(
            `Invalid busInputGroup [${start}, ${end}) for ${comp.inputs} inputs`,
          );
      });
    }

    if (comp.busOutputGroups) {
      comp.busOutputGroups.forEach(([start, end]) => {
        if (start < 0 || end > comp.outputs || start >= end)
          eo.raiseValidationError(
            `Invalid busOutputGroup [${start}, ${end}) for ${comp.outputs} outputs`,
          );
      });
    }
  }

  private validateInitialState(comp: ComponentDefinition): void {
    const t = comp.type;
    const eo = new ComponentValidationError(t);

    try {
      const state = comp.initialState();

      if (comp.isSequential && state && "prevClk" in state) {
        const { prevClk } = state;

        if (typeof prevClk !== "number" || prevClk < 0 || prevClk > 3) {
          eo.raiseValidationError(
            `prevClk in initialState must be a valid LogicValue (0-3), got ${String(prevClk)}`,
          );
        }
      }
    } catch (e) {
      if (e instanceof ComponentValidationError) throw e;

      eo.raiseValidationError(
        `initialState() threw: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private validateEvaluatorContract(comp: ComponentDefinition): void {
    if (comp.isAnnotation) return;
    if (comp.inputs === 0 && comp.outputs === 0) return;

    const t = comp.type;
    const eo = new ComponentValidationError(t);

    try {
      // Checking with default/initial inputs
      const testResult = comp.evaluate(
        new Array<SignalValue>(comp.inputs).fill(Z),
        comp.initialState(),
        {
          tick: 0,
        },
      );

      if (testResult.outputs.length !== comp.outputs) {
        eo.raiseValidationError(
          `Evaluator returned ${testResult.outputs.length} outputs but definition declares ${comp.outputs}`,
        );
      }
    } catch (e) {
      if (e instanceof ComponentValidationError) throw e;

      eo.raiseValidationError(
        `Evaluator threw on default inputs: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private validateAndRegisterComponent(comp: ComponentDefinition): void {
    // This validation is required, validations should happen sequentially
    this.validateComponentDefinition(comp);
    this.validateInitialState(comp);
    this.validateEvaluatorContract(comp);

    // Once validated setting component to map
    this.componentMap.set(comp.type, comp);
  }

  /**
   * Register a new component definition with full validation.
   * Throws ComponentValidationError if the definition is invalid.
   * Rejects duplicate type IDs unless the type was previously unregistered.
   */
  register(comp: ComponentDefinition): void {
    this.validateAndRegisterComponent(comp);
  }

  /**
   * Returns a list of custom circuit child type strings that depend on the given type.
   */
  private getDependentsInCustom(type: string): string[] {
    const dependents: string[] = [];

    for (const [depType, customCircuit] of this.customCircuitMap) {
      // Skip for self check
      if (depType === type) continue;

      // Check if the custom circuit uses the given type inside the siblings
      const hasUsetype = Object.values(customCircuit.circuit.components).some(
        (c) => c.type === type,
      );

      if (hasUsetype) dependents.push(depType);
    }

    return dependents;
  }

  /**
   * Returns true if all custom gate dependencies of the given type are
   * currently registered in the library.
   */
  hasValidDependencies(type: string): boolean {
    const customCircuit = this.customCircuitMap.get(type);

    if (!customCircuit) return true;

    for (const comp of Object.values(customCircuit.circuit.components)) {
      // Skip for self check
      if (comp.type === type) continue;

      // Skip generic components
      if (comp.type.startsWith(GATE_TYPE_CUSTOM)) continue;
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
      const dependentTypes = this.getDependentsInCustom(type);

      if (dependentTypes.length > 0) {
        const names = dependentTypes
          .map((t) => this.customCircuitMap.get(t)?.name ?? t)
          .join(", ");

        return `Cannot delete: used by ${names}`;
      }
    }

    this.componentMap.delete(type);
    this.customCircuitMap.delete(type);

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
    // Pull all the components first and sort them according to postion on canvas
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

    // Component map by ID
    const compById = new Map(
      knownComps.map(({ component, def }) => [
        component.id,
        { component, def },
      ]),
    );

    // Source and sinks for input and output pins
    const sourceComps = knownComps.filter(
      ({ def }) => def.isInput || def.isClock,
    );
    const sinkComps = knownComps.filter(({ def }) => def.isOutput);

    // Source and sinks validation
    if (sourceComps.length === 0 && sinkComps.length === 0) return null;

    // Segregate clock and non clock
    const clockComps = sourceComps.filter(({ def }) => def.isClock);
    const nonClockSourceComps = sourceComps.filter(({ def }) => !def.isClock);

    // Segregate source, normal and sink component ids
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

    if (clockComps.length > 0) {
      inputPorts.push({ compId: PIN_TYPE_CLOCK, pin: PINC0, label: "CLK" });
    }

    // Build output ports
    const busOutputGroups: [number, number][] = [];
    const outputPorts: Array<{ compId: string; pin: number; label: string }> =
      [];

    for (let co = 0; co < sinkComps.length; co += 1) {
      const { component, def } = sinkComps[co];
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
            def.isBusInput ? `BOUT${co}` : `OUT${co}`,
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
      `${GATE_TYPE_CUSTOM}${safeName}_${uuidv4().toUpperCase().replace(/-/g, "")}`;
    const hasSequentialInternals =
      clockComps.length > 0 ||
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
          new Array<SignalValue>(def.outputs).fill(Z),
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
          prior?.slice() ?? new Array<SignalValue>(def.outputs).fill(Z);

        signals[component.id] = outputs;
        priorSignals[component.id] = outputs.slice();
      }

      inputPorts.forEach((port, index) => {
        if (port.compId === PIN_TYPE_CLOCK) {
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
            inputs[pin] = sourceSignals[wire.fromComp]?.[wire.fromPin] ?? Z;
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
        (port) => readInputs(port.compId, false)[port.pin] ?? Z,
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

    // Creating definition fror custom circuit
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
          new Array<SignalValue>(numInputs).fill(Z),
          blankState,
          undefined,
          0,
        ).state;
      },
      evaluate: (externalInputs, state, context) =>
        evaluateCompiled(
          externalInputs,
          state,
          context?.snapshotInputs,
          context?.tick ?? 0,
        ),
    };

    // Registering custom circuit
    this.validateAndRegisterComponent(def);
    this.customCircuitMap.set(type, {
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

    for (const comp of this.componentMap.values()) {
      if (!groups.has(comp.category)) groups.set(comp.category, []);

      groups.get(comp.category)?.push(comp.type);
    }

    for (const cat of ORDER) {
      if (!groups.has(cat)) continue;

      const gates = groups.get(cat) ?? [];
      const order = GATE_ORDER[cat];

      if (order) {
        const ordered: string[] = [];
        const remaining = new Set(gates);

        for (const entry of order) {
          if (
            entry === GATE_SEPARATOR &&
            ordered.length > 0 &&
            ordered[ordered.length - 1] !== GATE_SEPARATOR
          ) {
            ordered.push(GATE_SEPARATOR);
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
