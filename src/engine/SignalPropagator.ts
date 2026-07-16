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

import { stateEqual } from "@/lib/utils";

import { type ComponentLibrary } from "./ComponentLibrary";
import { EventQueue } from "./EventQueue";
import { type GraphManager } from "./GraphManager";
import type { ComponentInstance, SignalValue } from "./types";

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
    tick: number = 0,
  ): PropagationResult {
    let oscillation = false;
    const ranks = this.graph.getTopologicalRanks();
    const queue = new EventQueue();
    const evalCount = new Map<string, number>();
    const changed = new Set<string>();

    // Snapshot only outputs of components that feed sequential gates.
    // This avoids O(all components) cloning when only a fraction of the
    // circuit contains edge-triggered elements.
    const outputSnapshot = new Map<string, boolean[]>();

    for (const [id, c] of Object.entries(components)) {
      if (!this.library.has(c.type)) continue;

      const def = this.library.get(c.type);

      // Snapshot components that are upstream of sequential/needsInputSnapshot
      // gates. We identify these by checking if any downstream node is
      // sequential. Also snapshot sequential gates themselves (they read their
      // own prior state via chained flip-flop semantics).
      if (def.isSequential || def.needsInputSnapshot) {
        // Snapshot all upstream sources of this sequential gate
        for (const upId of this.graph.getUpstream(id)) {
          if (!outputSnapshot.has(upId)) {
            const up = components[upId];

            if (up) outputSnapshot.set(upId, up.outputs.slice());
          }
        }

        // Also snapshot the sequential gate itself (for chained FF reads)
        if (!outputSnapshot.has(id)) {
          outputSnapshot.set(id, c.outputs.slice());
        }
      }
    }

    // Seed: queue direct downstream of each seed component
    for (const seedId of seeds) {
      for (const downId of this.graph.getDownstream(seedId))
        queue.enqueue(downId, ranks.get(downId) ?? Number.MAX_SAFE_INTEGER);
    }

    let totalEvals = 0;

    while (!queue.isEmpty()) {
      const compId = queue.dequeue();

      if (!compId) continue;

      const comp = components[compId];

      if (!comp) continue;
      if (!this.library.has(comp.type)) continue;

      const def = this.library.get(comp.type);
      // Oscillation guard
      const evals = (evalCount.get(compId) ?? 0) + 1;

      evalCount.set(compId, evals);

      if (evals > MAX_EVALS_PER_COMPONENT) {
        oscillation = true;

        break;
      }

      // Edge-triggered gates read the pre-pass snapshot so chained
      // flip-flops observe each other's prior outputs (non-blocking
      // assignment semantics). Composite gates can receive both views: live
      // inputs for their combinational paths and snapshotInputs for their
      // internal edge-triggered storage.
      const needsSnapshot = def.isSequential || def.needsInputSnapshot;
      const liveInputs: SignalValue[] = new Array<boolean>(def.inputs).fill(
        false,
      );
      const snapshotInputs = needsSnapshot
        ? new Array<boolean>(def.inputs).fill(false)
        : undefined;

      for (let pin = 0; pin < def.inputs; pin += 1) {
        const wire = this.graph.getInputWire(compId, pin);

        if (wire) {
          const liveOutputs = components[wire.from.comp]?.outputs;
          const priorOutputs = outputSnapshot.get(wire.from.comp);

          if (liveOutputs)
            liveInputs[pin] = liveOutputs[wire.from.pin] ?? false;
          if (snapshotInputs && priorOutputs)
            snapshotInputs[pin] = priorOutputs[wire.from.pin] ?? false;
        }
      }

      // Evaluate
      const inputs = def.isSequential
        ? (snapshotInputs ?? liveInputs)
        : liveInputs;
      const result = def.evaluate(inputs, comp.state, {
        tick,
        snapshotInputs,
      });

      totalEvals += 1;

      // Detect output change
      let outputChanged = false;

      for (let i = 0; i < result.outputs.length; i += 1) {
        if (result.outputs[i] !== comp.outputs[i]) {
          outputChanged = true;

          break;
        }
      }

      // Detect state change (for output components like LED)
      const stateChanged =
        result.state !== comp.state && !stateEqual(result.state, comp.state);

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
          for (const downId of this.graph.getDownstream(compId))
            queue.enqueue(downId, ranks.get(downId) ?? Number.MAX_SAFE_INTEGER);
        }
      } else if (inputs.some((v, i) => v !== comp.inputs[i]))
        components[compId] = { ...comp, inputs };
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

      if (!comp) continue;

      if (!this.library.has(comp.type)) continue;

      const def = this.library.get(comp.type);

      if (def.isClock || def.isInput) continue; // these drive signals; don't re-evaluate

      const inputs: SignalValue[] = new Array<boolean>(def.inputs).fill(false);

      for (let pin = 0; pin < def.inputs; pin += 1) {
        const wire = this.graph.getInputWire(compId, pin);

        if (wire) {
          const src = components[wire.from.comp];

          if (src) inputs[pin] = src.outputs[wire.from.pin] ?? false;
        }
      }

      let outputChanged = false;
      const result = def.evaluate(inputs, comp.state, { tick: 0 });

      totalEvals += 1;

      for (let i = 0; i < result.outputs.length; i += 1) {
        if (result.outputs[i] !== comp.outputs[i]) {
          outputChanged = true;

          break;
        }
      }

      const stateChanged = !stateEqual(result.state, comp.state);

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
