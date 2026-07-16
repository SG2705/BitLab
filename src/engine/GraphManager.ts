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

import type { ComponentId, Wire, WireId } from "./types";

const KEY_SEPARATOR = ":";

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

  // ── Nodes ──────────────────────────────────────────────────────────────────

  addNode(id: ComponentId): void {
    if (!this.downstream.has(id)) this.downstream.set(id, new Set());
    if (!this.upstream.has(id)) this.upstream.set(id, new Set());
    if (!this.nodeWires.has(id)) this.nodeWires.set(id, new Set());

    this.invalidate();
  }

  removeNode(id: ComponentId): void {
    // Remove every wire touching this node using the per-node index
    const wireIds = this.nodeWires.get(id);

    if (wireIds) {
      for (const wid of Array.from(wireIds)) this.removeWire(wid);
    }

    this.downstream.delete(id);
    this.upstream.delete(id);
    this.nodeWires.delete(id);
    this.invalidate();
  }

  // ── Wires ──────────────────────────────────────────────────────────────────

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
    if (this.cachedOrder) return this.cachedOrder;

    const nodes = Array.from(this.downstream.keys());
    const inDeg = new Map<ComponentId, number>();

    for (const id of nodes) inDeg.set(id, 0);

    for (const [id, ds] of this.downstream) {
      // eslint-disable-next-line no-void
      void id;

      for (const d of ds) inDeg.set(d, (inDeg.get(d) ?? 0) + 1);
    }

    const queue: ComponentId[] = [];

    for (const [id, deg] of inDeg) {
      if (deg === 0) queue.push(id);
    }

    const result: ComponentId[] = [];
    let head = 0;

    while (head < queue.length) {
      const node = queue[head];

      head += 1;

      result.push(node);

      for (const next of this.downstream.get(node) ?? []) {
        const newDeg = (inDeg.get(next) ?? 0) - 1;

        inDeg.set(next, newDeg);

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

    for (let i = 0; i < order.length; i += 1) {
      ranks.set(order[i], i);
    }

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

  private invalidate(): void {
    this.cachedOrder = null;
    this.cachedRanks = null;
  }
}

export default GraphManager;
