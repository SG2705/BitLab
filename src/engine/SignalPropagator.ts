/**
 * SignalPropagator — event-driven signal propagation engine.
 *
 * Algorithm:
 *   1. Seed the EventQueue with the set of components whose signals just changed.
 *   2. Dequeue the highest-priority (topologically earliest) component.
 *   3. Read its input signals from connected wires.
 *   4. Call its evaluate() function.
 *   5. If any output changed, write the new signals and enqueue every
 *      downstream component.
 *   6. Repeat until the queue is empty or an oscillation limit is hit.
 *
 * Properties guaranteed by this model:
 *   • A combinational path is resolved within a SINGLE propagation pass —
 *     e.g. Clock→AND→LED all complete before propagate() returns.
 *   • Each component is evaluated at most once per unique input state per pass
 *     (deduplication in EventQueue).
 *   • Feedback / oscillating loops are detected and halted after MAX_EVALS.
 */

import type { ComponentInstance, SignalValue } from "./types";
import { EventQueue } from "./EventQueue";
import { GraphManager } from "./GraphManager";
import { ComponentLibrary } from "./ComponentLibrary";

const MAX_EVALS_PER_COMPONENT = 64;

export interface PropagationResult {
  /** Number of component evaluations performed */
  evaluations: number;
  /** IDs of components whose output signals changed */
  changedComponents: Set<string>;
  /** True if the oscillation limit was hit */
  oscillationDetected: boolean;
}

export class SignalPropagator {
  constructor(
    private readonly graph: GraphManager,
    private readonly library: ComponentLibrary,
  ) {}

  /**
   * Propagate signals starting from a set of components whose outputs already
   * changed. Mutates `components` in place and returns a summary.
   *
   * @param seeds   Component IDs whose outputs just changed (e.g. a clock flip)
   * @param components  Live component map — mutated in place
   */
  propagate(
    seeds: string[],
    components: Record<string, ComponentInstance>,
  ): PropagationResult {
    const ranks = this.graph.getTopologicalRanks();
    const queue = new EventQueue();
    const evalCount = new Map<string, number>();
    const changed = new Set<string>();
    let oscillation = false;

    // Seed: queue direct downstream of each seed component
    for (const seedId of seeds) {
      for (const downId of this.graph.getDownstream(seedId)) {
        queue.enqueue(downId, ranks.get(downId) ?? Number.MAX_SAFE_INTEGER);
      }
    }

    let totalEvals = 0;

    while (!queue.isEmpty()) {
      const compId = queue.dequeue()!;
      const comp = components[compId];
      if (!comp) continue;

      const def = this.library.get(comp.type);

      // Oscillation guard
      const evals = (evalCount.get(compId) ?? 0) + 1;
      evalCount.set(compId, evals);
      if (evals > MAX_EVALS_PER_COMPONENT) {
        oscillation = true;
        break;
      }

      // Build current input signals by reading connected source outputs
      const inputs: SignalValue[] = new Array(def.inputs).fill(false);
      for (let pin = 0; pin < def.inputs; pin++) {
        const wire = this.graph.getInputWire(compId, pin);
        if (wire) {
          const src = components[wire.from.comp];
          if (src) inputs[pin] = src.outputs[wire.from.pin] ?? false;
        }
      }

      // Evaluate
      const result = def.evaluate(inputs, comp.state);
      totalEvals++;

      // Detect output change
      let outputChanged = false;
      for (let i = 0; i < result.outputs.length; i++) {
        if (result.outputs[i] !== comp.outputs[i]) {
          outputChanged = true;
          break;
        }
      }

      // Detect state change (for output components like LED)
      const stateChanged =
        result.state !== comp.state &&
        JSON.stringify(result.state) !== JSON.stringify(comp.state);

      if (outputChanged || stateChanged) {
        // Mutate in place — callers hold a reference to the same object
        components[compId] = {
          ...comp,
          inputs,
          outputs: result.outputs,
          state: result.state ?? comp.state,
        };
        changed.add(compId);

        if (outputChanged) {
          // Propagate further downstream
          for (const downId of this.graph.getDownstream(compId)) {
            queue.enqueue(downId, ranks.get(downId) ?? Number.MAX_SAFE_INTEGER);
          }
        }
      } else {
        // Inputs are always updated even if outputs didn't change
        if (inputs.some((v, i) => v !== comp.inputs[i])) {
          components[compId] = { ...comp, inputs };
        }
      }
    }

    return {
      evaluations: totalEvals,
      changedComponents: changed,
      oscillationDetected: oscillation,
    };
  }

  /**
   * Full re-evaluation of every component in topological order.
   * Used on circuit load or after a topology change.
   */
  recomputeAll(
    components: Record<string, ComponentInstance>,
  ): PropagationResult {
    let totalEvals = 0;
    const order = this.graph.topologicalSort();
    const changed = new Set<string>();
    const oscillation = false;

    for (const compId of order) {
      const comp = components[compId];

      if (!comp) {
        continue;
      }

      const def = this.library.get(comp.type);

      if (def.isClock || def.isInput) {
        continue; // these drive signals; don't re-evaluate
      }

      const inputs: SignalValue[] = new Array(def.inputs).fill(false);

      for (let pin = 0; pin < def.inputs; pin++) {
        const wire = this.graph.getInputWire(compId, pin);

        if (wire) {
          const src = components[wire.from.comp];

          if (src) {
            inputs[pin] = src.outputs[wire.from.pin] ?? false;
          }
        }
      }

      const result = def.evaluate(inputs, comp.state);
      totalEvals++;

      let outputChanged = false;

      for (let i = 0; i < result.outputs.length; i++) {
        if (result.outputs[i] !== comp.outputs[i]) {
          outputChanged = true;

          break;
        }
      }
      const stateChanged =
        JSON.stringify(result.state) !== JSON.stringify(comp.state);

      if (outputChanged || stateChanged) {
        components[compId] = {
          ...comp,
          inputs,
          outputs: result.outputs,
          state: result.state ?? comp.state,
        };

        changed.add(compId);
      }
    }

    return {
      evaluations: totalEvals,
      changedComponents: changed,
      oscillationDetected: oscillation,
    };
  }
}
