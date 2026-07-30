/**
 * EventQueue — Min-heap priority queue for simulation event scheduling.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODULE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides O(log n) enqueue/dequeue with priority ordering, used by the
 * SignalPropagator to evaluate components in topological order.
 *
 * Key properties:
 *   • Priority is the component's topological rank (lower = evaluate first)
 *   • Built-in deduplication: enqueueing an already-queued component is a no-op
 *   • After dequeue, the component CAN be re-enqueued (dedup only while in queue)
 *   • Array-based binary heap for cache-friendly memory access
 *
 * Complexity:
 *   • enqueue: O(log n) — bubble up
 *   • dequeue: O(log n) — sink down
 *   • has:     O(1) — Set lookup
 *
 * Note: This queue is used as a utility by recomputeAll's legacy path.
 * The primary propagation loop now uses a dirty-set approach (SignalPropagator).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface HeapItem {
  componentId: string;
  priority: number;
}

export class EventQueue {
  private heap: HeapItem[] = [];
  private inQueue: Set<string> = new Set();

  /**
   * Add a component to the queue with the given priority.
   * If the component is already in the queue, this is a no-op (deduplication).
   */
  enqueue(componentId: string, priority: number): void {
    if (this.inQueue.has(componentId)) return;

    this.inQueue.add(componentId);
    this.heap.push({ componentId, priority });
    this.shiftUp(this.heap.length - 1);
  }

  /**
   * Remove and return the highest-priority (lowest rank) component.
   * Returns undefined if the queue is empty.
   */
  dequeue(): string | undefined {
    if (this.heap.length === 0) return undefined;

    const top = this.heap[0];
    const last = this.heap.pop() ?? this.heap[0];

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.shiftDown(0);
    }

    this.inQueue.delete(top.componentId);

    return top.componentId;
  }

  /** Check if a component is currently in the queue */
  has(componentId: string): boolean {
    return this.inQueue.has(componentId);
  }

  /** True if no events are pending */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** Remove all events from the queue */
  clear(): void {
    this.heap = [];
    this.inQueue.clear();
  }

  /** Current number of pending events */
  get size(): number {
    return this.heap.length;
  }

  private swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  /** Restore heap property by moving a node up toward the root */
  private shiftUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);

      if (this.heap[parent].priority <= this.heap[i].priority) break;

      this.swap(parent, i);

      i = parent;
    }
  }

  /** Restore heap property by moving a node down toward the leaves */
  private shiftDown(i: number): void {
    const n = this.heap.length;

    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }

      if (
        right < n &&
        this.heap[right].priority < this.heap[smallest].priority
      ) {
        smallest = right;
      }

      if (smallest === i) break;

      this.swap(smallest, i);

      i = smallest;
    }
  }
}

export default EventQueue;
