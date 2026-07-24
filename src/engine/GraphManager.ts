/**
 * GraphManager — Directed graph representing circuit topology.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Maintains the structural connectivity of the circuit as a directed graph.
 * Used by SignalPropagator to determine evaluation order and fan-out.
 *
 * Data structures:
 *   • downstream: compId → Set<compId>  (who receives signals FROM this node)
 *   • upstream:   compId → Set<compId>  (who sends signals TO this node)
 *   • outputWires: "compId:pin" → Wire[]  (fan-out: one output → many inputs)
 *   • inputWires:  "compId:pin" → Wire    (single-driver: one input ← one output)
 *   • nodeWires:   compId → Set<wireId>   (all wires touching a node)
 *   • edgeCount:   "from:to" → number     (reference count for adjacency cleanup)
 *
 * Topological ordering:
 *   • Computed lazily via Kahn's algorithm
 *   • Cached until graph structure changes (addNode/removeNode/addWire/removeWire)
 *   • Cycle participants get rank Number.MAX_SAFE_INTEGER
 *   • Used by propagator to evaluate upstream before downstream
 *
 * Complexity:
 *   • addNode/removeNode: O(1) amortized
 *   • addWire/removeWire: O(1)
 *   • getInputWire: O(1) — direct Map lookup
 *   • getDownstream/getUpstream: O(k) where k = neighbor count
 *   • topologicalSort: O(V + E) — cached after first call
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { KEY_SEPARATOR } from "./constants";
import type { ComponentId, Wire, WireId } from "./types";

export class GraphManager {
  private downstream: Map<ComponentId, Set<ComponentId>> = new Map();
  private upstream: Map<ComponentId, Set<ComponentId>> = new Map();

  // wireId → Wire
  private wires: Map<WireId, Wire> = new Map();
  // "compId:pinIndex" → Wire[] (multiple wires can leave the same output pin)
  private outputWires: Map<string, Wire[]> = new Map();
  // "compId:pinIndex" → Wire (only one wire may feed each input pin)
  private inputWires: Map<string, Wire> = new Map();

  // Per-node wire index: compId → Set of wireIds touching that node (4a)
  private nodeWires: Map<ComponentId, Set<WireId>> = new Map();
  // Edge reference count: "from:to" → number of wires connecting the pair (4b)
  private edgeCount: Map<string, number> = new Map();

  // Cached topological sort; null means stale
  private cachedOrder: ComponentId[] | null = null;
  private cachedRanks: Map<ComponentId, number> | null = null;

  /** Invalidate cached topological order (called after any structural change - addNode/removeNode/addWire/removeWire) */
  private invalidate(): void {
    this.cachedOrder = null;
    this.cachedRanks = null;
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
    return this.inputWires.get(`${compId}${KEY_SEPARATOR}${pinIndex}`) ?? null;
  }

  /** All wires leaving output pin[pinIndex] of compId */
  getOutputWires(compId: ComponentId, pinIndex: number): Wire[] {
    return this.outputWires.get(`${compId}${KEY_SEPARATOR}${pinIndex}`) ?? [];
  }

  /** Get all registered component node IDs */
  getAllNodes(): ComponentId[] {
    return Array.from(this.downstream.keys());
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────

  /** Register a new component node in the graph. Initializes empty adjacency sets. */
  addNode(id: ComponentId): void {
    if (!this.downstream.has(id)) this.downstream.set(id, new Set());
    if (!this.upstream.has(id)) this.upstream.set(id, new Set());
    if (!this.nodeWires.has(id)) this.nodeWires.set(id, new Set());

    this.invalidate();
  }

  /** Remove a node and all its connected wires. Cleans up adjacency and invalidates cache. */
  removeNode(id: ComponentId): void {
    // Remove every wire touching this node using the per-node index
    const wireIds = this.nodeWires.get(id);

    if (wireIds) {
      for (const wId of Array.from(wireIds)) this.removeWire(wId);
    }

    this.downstream.delete(id);
    this.upstream.delete(id);
    this.nodeWires.delete(id);
    this.invalidate();
  }

  // ── Wires ──────────────────────────────────────────────────────────────────

  /** Add a wire to the graph. Updates adjacency, per-pin maps, and edge counts. */
  addWire(wire: Wire): void {
    this.wires.set(wire.id, wire);

    const { from, to } = wire;
    const outKey = `${from.comp}${KEY_SEPARATOR}${from.pin}`;
    const edgeKey = `${from.comp}${KEY_SEPARATOR}${to.comp}`;

    this.downstream.get(from.comp)?.add(to.comp);
    this.upstream.get(to.comp)?.add(from.comp);

    // Update edge reference count
    this.edgeCount.set(edgeKey, (this.edgeCount.get(edgeKey) ?? 0) + 1);

    // Update per-node wire index
    this.nodeWires.get(from.comp)?.add(wire.id);
    this.nodeWires.get(to.comp)?.add(wire.id);

    if (!this.outputWires.has(outKey)) this.outputWires.set(outKey, []);

    this.outputWires.get(outKey)?.push(wire);
    this.inputWires.set(`${to.comp}${KEY_SEPARATOR}${to.pin}`, wire);

    this.invalidate();
  }

  /** Remove a wire by ID. Cleans up adjacency when no wires remain between a pair. */
  removeWire(wireId: WireId): void {
    const wire = this.wires.get(wireId);

    if (!wire) return;

    const { from, to } = wire;
    const outKey = `${from.comp}${KEY_SEPARATOR}${from.pin}`;
    const edgeKey = `${from.comp}${KEY_SEPARATOR}${to.comp}`;
    const outList = this.outputWires.get(outKey);

    if (outList) {
      const idx = outList.findIndex((w) => w.id === wireId);

      if (idx >= 0) outList.splice(idx, 1);
      if (outList.length === 0) this.outputWires.delete(outKey);
    }

    this.inputWires.delete(`${to.comp}${KEY_SEPARATOR}${to.pin}`);
    this.wires.delete(wireId);

    // Update per-node wire index
    this.nodeWires.get(from.comp)?.delete(wireId);
    this.nodeWires.get(to.comp)?.delete(wireId);

    // Decrement edge count; remove adjacency when no wires remain for this pair
    const count = (this.edgeCount.get(edgeKey) ?? 1) - 1;

    if (count <= 0) {
      this.edgeCount.delete(edgeKey);
      this.downstream.get(from.comp)?.delete(to.comp);
      this.upstream.get(to.comp)?.delete(from.comp);
    } else {
      this.edgeCount.set(edgeKey, count);
    }

    this.invalidate();
  }

  // ── Topological sort (Kahn's algorithm) ───────────────────────────────────

  /**
   * Returns components in topological order (sources first).
   * If the graph has a cycle, returns a partial ordering — the cycle
   * participants are omitted (detected via hasCycle()).
   */
  topologicalSort(): ComponentId[] {
    if (this.cachedOrder) return this.cachedOrder;

    const degreeMap = new Map<ComponentId, number>();

    // Setting up the intial degreen based on the nodes
    for (const id of Array.from(this.downstream.keys())) degreeMap.set(id, 0);

    for (const [, ds] of this.downstream) {
      for (const d of ds) degreeMap.set(d, (degreeMap.get(d) ?? 0) + 1);
    }

    const queue: ComponentId[] = [];

    for (const [id, deg] of degreeMap) {
      if (deg === 0) queue.push(id);
    }

    // If there is cycle then head is not less than queue hence sort will not happen
    let head = 0;
    const result: ComponentId[] = [];

    while (head < queue.length) {
      const node = queue[head];

      head += 1;

      result.push(node);

      for (const next of this.downstream.get(node) ?? []) {
        const newDeg = (degreeMap.get(next) ?? 0) - 1;

        degreeMap.set(next, newDeg);

        if (newDeg === 0) queue.push(next);
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
    if (this.cachedRanks) return this.cachedRanks;

    const order = this.topologicalSort();
    const ranks = new Map<ComponentId, number>();

    for (let i = 0; i < order.length; i += 1) ranks.set(order[i], i);

    // Assign high rank to cycle participants so they still get processed
    for (const id of this.downstream.keys()) {
      if (!ranks.has(id)) ranks.set(id, Number.MAX_SAFE_INTEGER);
    }

    this.cachedRanks = ranks;

    return ranks;
  }

  /** True if the graph contains at least one cycle */
  hasCycle(): boolean {
    return this.topologicalSort().length < this.downstream.size;
  }
}

export default GraphManager;
