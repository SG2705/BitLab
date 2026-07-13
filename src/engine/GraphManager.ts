/**
 * GraphManager — directed graph representing circuit topology.
 *
 * Maintains two adjacency maps:
 *   downstream: compId → Set of compIds that receive signals FROM it
 *   upstream:   compId → Set of compIds that send signals TO it
 *
 * Also maintains per-pin wire maps for O(1) signal lookup during propagation:
 *   outputWires[compId:pinIndex] → Wire[]   (fan-out, one output → many inputs)
 *   inputWire[compId:pinIndex]  → Wire      (one input ← at most one output)
 *
 * Topological order is computed lazily via Kahn's algorithm and invalidated
 * whenever the graph structure changes.
 */

import type { Wire, WireId, ComponentId } from "./types";

export class GraphManager {
  private downstream: Map<ComponentId, Set<ComponentId>> = new Map();
  private upstream: Map<ComponentId, Set<ComponentId>> = new Map();

  // wireId → Wire
  private wires: Map<WireId, Wire> = new Map();
  // "compId:pinIndex" → Wire[] (multiple wires can leave the same output pin)
  private outputWires: Map<string, Wire[]> = new Map();
  // "compId:pinIndex" → Wire (only one wire may feed each input pin)
  private inputWires: Map<string, Wire> = new Map();

  // Cached topological sort; null means stale
  private cachedOrder: ComponentId[] | null = null;
  private cachedRanks: Map<ComponentId, number> | null = null;

  // ── Nodes ──────────────────────────────────────────────────────────────────

  addNode(id: ComponentId): void {
    if (!this.downstream.has(id)) {
      this.downstream.set(id, new Set());
    }

    if (!this.upstream.has(id)) {
      this.upstream.set(id, new Set());
    }

    this.invalidate();
  }

  removeNode(id: ComponentId): void {
    // Remove every wire touching this node first
    const toRemove = Array.from(this.wires.values()).filter(
      (w) => w.from.comp === id || w.to.comp === id,
    );

    for (const w of toRemove) this.removeWire(w.id);

    this.downstream.delete(id);
    this.upstream.delete(id);
    this.invalidate();
  }

  // ── Wires ──────────────────────────────────────────────────────────────────

  addWire(wire: Wire): void {
    this.wires.set(wire.id, wire);

    const { from, to } = wire;

    this.downstream.get(from.comp)?.add(to.comp);
    this.upstream.get(to.comp)?.add(from.comp);

    const outKey = `${from.comp}:${from.pin}`;

    if (!this.outputWires.has(outKey)) {
      this.outputWires.set(outKey, []);
    }

    this.outputWires.get(outKey)!.push(wire);

    this.inputWires.set(`${to.comp}:${to.pin}`, wire);
    this.invalidate();
  }

  removeWire(wireId: WireId): void {
    const wire = this.wires.get(wireId);
    if (!wire) {
      return;
    }

    const { from, to } = wire;

    const outKey = `${from.comp}:${from.pin}`;
    const outList = this.outputWires.get(outKey);

    if (outList) {
      const idx = outList.findIndex((w) => w.id === wireId);

      if (idx >= 0) {
        outList.splice(idx, 1);
      }

      if (outList.length === 0) {
        this.outputWires.delete(outKey);
      }
    }

    this.inputWires.delete(`${to.comp}:${to.pin}`);
    this.wires.delete(wireId);

    // Rebuild adjacency only if no other wire still links the same pair
    const stillConnected = Array.from(this.wires.values()).some(
      (w) => w.from.comp === from.comp && w.to.comp === to.comp,
    );

    if (!stillConnected) {
      this.downstream.get(from.comp)?.delete(to.comp);
      this.upstream.get(to.comp)?.delete(from.comp);
    }

    this.invalidate();
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Component IDs that receive at least one output from compId */
  getDownstream(compId: ComponentId): ComponentId[] {
    return Array.from(this.downstream.get(compId) ?? []);
  }

  /** Component IDs that send at least one output to compId */
  getUpstream(compId: ComponentId): ComponentId[] {
    return Array.from(this.upstream.get(compId) ?? []);
  }

  /** Wire feeding input pin[pinIndex] of compId, or null if unconnected */
  getInputWire(compId: ComponentId, pinIndex: number): Wire | null {
    return this.inputWires.get(`${compId}:${pinIndex}`) ?? null;
  }

  /** All wires leaving output pin[pinIndex] of compId */
  getOutputWires(compId: ComponentId, pinIndex: number): Wire[] {
    return this.outputWires.get(`${compId}:${pinIndex}`) ?? [];
  }

  getAllNodes(): ComponentId[] {
    return Array.from(this.downstream.keys());
  }

  // ── Topological sort (Kahn's algorithm) ───────────────────────────────────

  /**
   * Returns components in topological order (sources first).
   * If the graph has a cycle, returns a partial ordering — the cycle
   * participants are omitted (detected via hasCycle()).
   */
  topologicalSort(): ComponentId[] {
    if (this.cachedOrder) {
      return this.cachedOrder;
    }

    const nodes = Array.from(this.downstream.keys());
    const inDeg = new Map<ComponentId, number>();

    for (const id of nodes) {
      inDeg.set(id, 0);
    }

    for (const [id, ds] of this.downstream) {
      void id;

      for (const d of ds) {
        inDeg.set(d, (inDeg.get(d) ?? 0) + 1);
      }
    }

    const queue: ComponentId[] = [];
    for (const [id, deg] of inDeg) {
      if (deg === 0) {
        queue.push(id);
      }
    }

    const result: ComponentId[] = [];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node);

      for (const next of this.downstream.get(node) ?? []) {
        const newDeg = (inDeg.get(next) ?? 0) - 1;
        inDeg.set(next, newDeg);

        if (newDeg === 0) {
          queue.push(next);
        }
      }
    }

    this.cachedOrder = result;

    return result;
  }

  /**
   * Returns a map from componentId → topological rank (0 = earliest).
   * Components not in the sort (cycle participants) get rank Number.MAX_SAFE_INTEGER.
   */
  getTopologicalRanks(): Map<ComponentId, number> {
    if (this.cachedRanks) {
      return this.cachedRanks;
    }

    const order = this.topologicalSort();
    const ranks = new Map<ComponentId, number>();

    for (let i = 0; i < order.length; i++) {
      ranks.set(order[i], i);
    }
    // Assign high rank to cycle participants so they still get processed
    for (const id of this.downstream.keys()) {
      if (!ranks.has(id)) {
        ranks.set(id, Number.MAX_SAFE_INTEGER);
      }
    }

    this.cachedRanks = ranks;

    return ranks;
  }

  /** True if the graph contains at least one cycle */
  hasCycle(): boolean {
    return this.topologicalSort().length < this.downstream.size;
  }

  private invalidate(): void {
    this.cachedOrder = null;
    this.cachedRanks = null;
  }
}
