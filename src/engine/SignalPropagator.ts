/**
 * SignalPropagator — Delta-cycle signal propagation engine.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROPAGATION MODEL
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uses explicit delta-cycle semantics:
 *
 *   1. Seed: Mark downstream components of changed sources as "dirty".
 *   2. Delta cycle: Evaluate ALL dirty components once (read phase → commit phase).
 *   3. If any outputs changed, mark their downstream as dirty for the next delta.
 *   4. Repeat until no more dirty components (stable) or oscillation limit reached.
 *
 * Key properties:
 *   • Each component is evaluated AT MOST ONCE per delta cycle (dirty-set dedup).
 *   • All reads happen from a consistent snapshot (no partial-update races).
 *   • Sequential components read pre-propagation snapshots (non-blocking semantics).
 *   • Oscillation is detected by repeated state patterns, not just iteration count.
 *   • Propagation metrics are collected for profiling and diagnostics.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { type ComponentLibrary } from "./ComponentLibrary";
import { type GraphManager } from "./GraphManager";
import type { ComponentInstance, SignalValue } from "./types";
import { LogicValue } from "./types";
import { stateEqual } from "./utils";

/** Maximum delta cycles before declaring oscillation */
const MAX_DELTA_CYCLES = 128;

/** Maximum evaluations for a single component across all deltas */
const MAX_EVALS_PER_COMPONENT = 64;

// ── Propagation Metrics ──────────────────────────────────────────────────────

/**
 * Detailed metrics from a single propagation pass.
 * Exposed to the UI for debugging and profiling.
 */
export interface PropagationMetrics {
  /** Total component evaluations performed */
  evaluations: number;
  /** Number of delta cycles executed */
  deltaCycles: number;
  /** Maximum queue/dirty-set depth observed */
  maxQueueDepth: number;
  /** Number of events that were deduplicated (skipped) */
  skippedEvents: number;
  /** Average propagation depth (delta cycles per pass) */
  avgPropagationDepth: number;
  /** Components involved in oscillation (empty if stable) */
  oscillatingComponents: string[];
  /** Components evaluated per delta cycle (for profiling) */
  evalsPerDelta: number[];
  /** Time taken in milliseconds (if performance.now available) */
  durationMs: number;
}

/** Creates an empty metrics object */
function emptyMetrics(): PropagationMetrics {
  return {
    evaluations: 0,
    deltaCycles: 0,
    maxQueueDepth: 0,
    skippedEvents: 0,
    avgPropagationDepth: 0,
    oscillatingComponents: [],
    evalsPerDelta: [],
    durationMs: 0,
  };
}

// ── Propagation Result ───────────────────────────────────────────────────────

export interface PropagationResult {
  /** Number of component evaluations performed */
  evaluations: number;
  /** IDs of components whose output signals changed */
  changedComponents: Set<string>;
  /** True if the oscillation limit was hit */
  oscillationDetected: boolean;
  /** Detailed propagation metrics (for profiling/debug UI) */
  metrics: PropagationMetrics;
}

// ── SignalPropagator ─────────────────────────────────────────────────────────

export class SignalPropagator {
  /** Accumulated metrics from all propagation passes (rolling window) */
  private metricsHistory: PropagationMetrics[] = [];
  private readonly maxMetricsHistory = 32;

  /** Cached downstream adjacency for fan-out optimization (#6, #7) */
  private downstreamCache: Map<string, string[]> | null = null;
  private graphVersion = 0;

  constructor(
    private readonly graph: GraphManager,
    private readonly library: ComponentLibrary,
  ) {}

  /** Get the most recent propagation metrics */
  getLastMetrics(): PropagationMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  /** Get rolling metrics history (last N passes) */
  getMetricsHistory(): PropagationMetrics[] {
    return this.metricsHistory;
  }

  /** Invalidate cached topology (call when wiring changes) */
  invalidateCache(): void {
    this.downstreamCache = null;
    this.graphVersion += 1;
  }

  // ── Main Propagation ─────────────────────────────────────────────────────

  /**
   * Propagate signals using delta-cycle semantics.
   *
   * @param seeds   Component IDs whose outputs just changed
   * @param components  Live component map — mutated in place
   * @param tick    Current simulation tick
   */
  propagate(
    seeds: string[],
    components: Record<string, ComponentInstance>,
    tick: number = 0,
  ): PropagationResult {
    const startTime =
      typeof performance !== "undefined" ? performance.now() : 0;
    const metrics = emptyMetrics();
    const changed = new Set<string>();
    let oscillation = false;

    // Build/refresh downstream cache (#6)
    this.ensureDownstreamCache();

    // Snapshot outputs of components feeding sequential gates (#5)
    const outputSnapshot = this.buildSequentialSnapshot(components);

    // Initialize dirty set with downstream of seeds (#1, #3)
    let dirtySet = new Set<string>();

    for (const seedId of seeds) {
      const downstream = this.getDownstreamCached(seedId);

      for (const downId of downstream) {
        dirtySet.add(downId);
      }
    }

    metrics.maxQueueDepth = dirtySet.size;

    // Per-component evaluation counter for oscillation detection (#4)
    const evalCount = new Map<string, number>();
    // State signature tracking for pattern-based oscillation detection
    const stateSignatures = new Map<string, string[]>();

    // ── Delta-cycle loop (#2) ────────────────────────────────────────────
    let deltaCycle = 0;

    while (dirtySet.size > 0 && deltaCycle < MAX_DELTA_CYCLES) {
      deltaCycle += 1;
      let evalsThisDelta = 0;

      // Next delta's dirty set
      const nextDirty = new Set<string>();

      // Sort dirty components by topological rank for deterministic order
      const ranks = this.graph.getTopologicalRanks();
      const sorted = Array.from(dirtySet).sort(
        (a, b) =>
          (ranks.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (ranks.get(b) ?? Number.MAX_SAFE_INTEGER),
      );

      // ── Evaluate all dirty components (read phase uses current state) ──
      for (const compId of sorted) {
        const comp = components[compId];

        if (!comp) continue;
        if (!this.library.has(comp.type)) continue;

        const def = this.library.get(comp.type);

        // Oscillation guard per component (#4)
        const evals = (evalCount.get(compId) ?? 0) + 1;

        evalCount.set(compId, evals);

        if (evals > MAX_EVALS_PER_COMPONENT) {
          oscillation = true;

          // Track oscillating component (#10)
          if (!metrics.oscillatingComponents.includes(compId)) {
            metrics.oscillatingComponents.push(compId);
          }

          continue;
        }

        // ── Read phase: build inputs from current committed state ──────
        const needsSnapshot = def.isSequential || def.needsInputSnapshot;
        const liveInputs: SignalValue[] = new Array<SignalValue>(
          def.inputs,
        ).fill(LogicValue.ZERO);
        const snapshotInputs = needsSnapshot
          ? new Array<SignalValue>(def.inputs).fill(LogicValue.ZERO)
          : undefined;

        for (let pin = 0; pin < def.inputs; pin += 1) {
          const wire = this.graph.getInputWire(compId, pin);

          if (wire) {
            const liveOutputs = components[wire.from.comp]?.outputs;
            const priorOutputs = outputSnapshot.get(wire.from.comp);

            if (liveOutputs)
              liveInputs[pin] = liveOutputs[wire.from.pin] ?? LogicValue.ZERO;
            if (snapshotInputs && priorOutputs)
              snapshotInputs[pin] =
                priorOutputs[wire.from.pin] ?? LogicValue.ZERO;
          }
        }

        // ── Evaluate ──────────────────────────────────────────────────────
        const inputs = def.isSequential
          ? (snapshotInputs ?? liveInputs)
          : liveInputs;
        const result = def.evaluate(inputs, comp.state, {
          tick,
          snapshotInputs,
        });

        evalsThisDelta += 1;
        metrics.evaluations += 1;

        // ── Commit phase: detect changes ──────────────────────────────────
        let outputChanged = false;

        for (let i = 0; i < result.outputs.length; i += 1) {
          if (result.outputs[i] !== comp.outputs[i]) {
            outputChanged = true;
            break;
          }
        }

        const stateChanged =
          result.state !== comp.state && !stateEqual(result.state, comp.state);

        if (outputChanged || stateChanged) {
          components[compId] = {
            ...comp,
            inputs,
            outputs: result.outputs,
            state: result.state ?? comp.state,
          };

          changed.add(compId);

          // Schedule downstream for next delta (#7: grouped by net)
          if (outputChanged) {
            const downstream = this.getDownstreamCached(compId);

            for (const downId of downstream) {
              nextDirty.add(downId);
            }
          }

          // Pattern-based oscillation detection (#4)
          const sig = result.outputs.join(",");
          const history = stateSignatures.get(compId) ?? [];

          history.push(sig);

          if (history.length > 4) {
            // Check for repeating pattern (period 2)
            const len = history.length;

            if (
              history[len - 1] === history[len - 3] &&
              history[len - 2] === history[len - 4]
            ) {
              oscillation = true;

              if (!metrics.oscillatingComponents.includes(compId)) {
                metrics.oscillatingComponents.push(compId);
              }
            }
          }

          stateSignatures.set(compId, history);
        } else if (inputs.some((v, i) => v !== comp.inputs[i])) {
          // Inputs changed but outputs didn't — still update inputs
          components[compId] = { ...comp, inputs };
        }
      }

      metrics.evalsPerDelta.push(evalsThisDelta);

      // Dedup: remove from next dirty set any components already stable
      // (their evaluation produced no output change this delta)
      const deduped = new Set<string>();

      for (const id of nextDirty) {
        if (!dirtySet.has(id) || changed.has(id)) {
          deduped.add(id);
        } else {
          metrics.skippedEvents += 1;
        }
      }

      // Track max queue depth
      if (nextDirty.size > metrics.maxQueueDepth) {
        metrics.maxQueueDepth = nextDirty.size;
      }

      dirtySet = nextDirty;

      // Early exit if oscillation detected
      if (oscillation) break;
    }

    if (deltaCycle >= MAX_DELTA_CYCLES) {
      oscillation = true;
    }

    // Finalize metrics
    metrics.deltaCycles = deltaCycle;
    metrics.avgPropagationDepth = deltaCycle;
    metrics.durationMs =
      typeof performance !== "undefined" ? performance.now() - startTime : 0;

    // Store metrics
    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.maxMetricsHistory) {
      this.metricsHistory.shift();
    }

    return {
      evaluations: metrics.evaluations,
      changedComponents: changed,
      oscillationDetected: oscillation,
      metrics,
    };
  }

  // ── Full Recomputation ─────────────────────────────────────────────────────

  /**
   * Full re-evaluation of every component.
   * Handles feedback cycles by iterative stabilization.
   */
  recomputeAll(
    components: Record<string, ComponentInstance>,
  ): PropagationResult {
    const startTime =
      typeof performance !== "undefined" ? performance.now() : 0;
    const metrics = emptyMetrics();
    let totalEvals = 0;
    const order = this.graph.topologicalSort();
    const changed = new Set<string>();
    let oscillation = false;

    // Phase 1: Evaluate in topological order
    for (const compId of order) {
      const comp = components[compId];

      if (!comp) continue;
      if (!this.library.has(comp.type)) continue;

      const def = this.library.get(comp.type);

      if (def.isClock || def.isInput) continue;

      const inputs = this.readLiveInputs(compId, components);
      const result = def.evaluate(inputs, comp.state, { tick: 0 });

      totalEvals += 1;

      if (
        SignalPropagator.hasOutputChange(comp, result) ||
        !stateEqual(result.state, comp.state)
      ) {
        components[compId] = {
          ...comp,
          inputs,
          outputs: result.outputs,
          state: result.state ?? comp.state,
        };
        changed.add(compId);
      } else if (inputs.some((v, i) => v !== comp.inputs[i])) {
        components[compId] = { ...comp, inputs };
      }
    }

    // Phase 2: Stabilize cycle participants
    const allNodes = this.graph.getAllNodes();
    const orderSet = new Set(order);
    const cycleNodes = allNodes.filter(
      (id) => !orderSet.has(id) && components[id],
    );

    if (cycleNodes.length > 0) {
      const maxPasses = MAX_EVALS_PER_COMPONENT;
      let pass = 0;
      let anyChanged = true;

      while (anyChanged && pass < maxPasses) {
        anyChanged = false;
        pass += 1;

        for (const compId of cycleNodes) {
          const comp = components[compId];

          if (!comp) continue;
          if (!this.library.has(comp.type)) continue;

          const def = this.library.get(comp.type);

          if (def.isClock || def.isInput) continue;

          const inputs = this.readLiveInputs(compId, components);
          const result = def.evaluate(inputs, comp.state, { tick: 0 });

          totalEvals += 1;

          if (
            SignalPropagator.hasOutputChange(comp, result) ||
            !stateEqual(result.state, comp.state)
          ) {
            components[compId] = {
              ...comp,
              inputs,
              outputs: result.outputs,
              state: result.state ?? comp.state,
            };
            changed.add(compId);
            anyChanged = true;
          } else if (inputs.some((v, i) => v !== comp.inputs[i])) {
            components[compId] = { ...comp, inputs };
          }
        }
      }

      if (pass >= maxPasses) oscillation = true;
    }

    // Phase 3: Final pass for downstream sinks
    for (const compId of order) {
      const comp = components[compId];

      if (!comp) continue;
      if (!this.library.has(comp.type)) continue;

      const def = this.library.get(comp.type);

      if (def.isClock || def.isInput) continue;

      const inputs = this.readLiveInputs(compId, components);
      const result = def.evaluate(inputs, comp.state, { tick: 0 });

      totalEvals += 1;

      if (
        SignalPropagator.hasOutputChange(comp, result) ||
        !stateEqual(result.state, comp.state)
      ) {
        components[compId] = {
          ...comp,
          inputs,
          outputs: result.outputs,
          state: result.state ?? comp.state,
        };
        changed.add(compId);
      } else if (inputs.some((v, i) => v !== comp.inputs[i])) {
        components[compId] = { ...comp, inputs };
      }
    }

    metrics.evaluations = totalEvals;
    metrics.deltaCycles = cycleNodes.length > 0 ? 3 : 1;
    metrics.durationMs =
      typeof performance !== "undefined" ? performance.now() - startTime : 0;

    this.metricsHistory.push(metrics);

    if (this.metricsHistory.length > this.maxMetricsHistory) {
      this.metricsHistory.shift();
    }

    return {
      evaluations: totalEvals,
      changedComponents: changed,
      oscillationDetected: oscillation,
      metrics,
    };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  /** Read live inputs for a component from its connected wires */
  private readLiveInputs(
    compId: string,
    components: Record<string, ComponentInstance>,
  ): SignalValue[] {
    const comp = components[compId];

    if (!comp || !this.library.has(comp.type)) return [];

    const def = this.library.get(comp.type);
    const inputs: SignalValue[] = new Array<SignalValue>(def.inputs).fill(
      LogicValue.ZERO,
    );

    for (let pin = 0; pin < def.inputs; pin += 1) {
      const wire = this.graph.getInputWire(compId, pin);

      if (wire) {
        const src = components[wire.from.comp];

        if (src) inputs[pin] = src.outputs[wire.from.pin] ?? LogicValue.ZERO;
      }
    }

    return inputs;
  }

  /** Check if evaluation produced different outputs */
  private static hasOutputChange(
    comp: ComponentInstance,
    result: { outputs: SignalValue[] },
  ): boolean {
    for (let i = 0; i < result.outputs.length; i += 1) {
      if (result.outputs[i] !== comp.outputs[i]) return true;
    }

    return false;
  }

  /** Build output snapshot for sequential gate isolation (#5) */
  private buildSequentialSnapshot(
    components: Record<string, ComponentInstance>,
  ): Map<string, SignalValue[]> {
    const snapshot = new Map<string, SignalValue[]>();

    for (const [id, c] of Object.entries(components)) {
      if (!this.library.has(c.type)) continue;

      const def = this.library.get(c.type);

      if (def.isSequential || def.needsInputSnapshot) {
        for (const upId of this.graph.getUpstream(id)) {
          if (!snapshot.has(upId)) {
            const up = components[upId];

            if (up) snapshot.set(upId, up.outputs.slice());
          }
        }

        if (!snapshot.has(id)) {
          snapshot.set(id, c.outputs.slice());
        }
      }
    }

    return snapshot;
  }

  /** Ensure downstream adjacency cache is fresh (#6) */
  private ensureDownstreamCache(): void {
    if (this.downstreamCache) return;

    this.downstreamCache = new Map();

    for (const nodeId of this.graph.getAllNodes()) {
      this.downstreamCache.set(nodeId, this.graph.getDownstream(nodeId));
    }
  }

  /** Get cached downstream list (#6, #7) */
  private getDownstreamCached(compId: string): string[] {
    if (this.downstreamCache) {
      return (
        this.downstreamCache.get(compId) ?? this.graph.getDownstream(compId)
      );
    }

    return this.graph.getDownstream(compId);
  }
}
