/**
 * EventQueue — min-heap priority queue for simulation events.
 *
 * Priority is the component's topological rank so that upstream components
 * are always evaluated before downstream ones in the same propagation pass.
 *
 * Deduplication: enqueueing a component that is already in the queue is a
 * no-op, preventing redundant evaluations in the same propagation pass.
 */

interface HeapItem {
  componentId: string;
  priority: number;
}

export class EventQueue {
  private heap: HeapItem[] = [];
  private inQueue: Set<string> = new Set();

  enqueue(componentId: string, priority: number): void {
    if (this.inQueue.has(componentId)) {
      return;
    }

    this.inQueue.add(componentId);
    this.heap.push({ componentId, priority });
    this.siftUp(this.heap.length - 1);
  }

  dequeue(): string | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const top = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }

    this.inQueue.delete(top.componentId);

    return top.componentId;
  }

  has(componentId: string): boolean {
    return this.inQueue.has(componentId);
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  clear(): void {
    this.heap = [];
    this.inQueue.clear();
  }

  get size(): number {
    return this.heap.length;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;

      if (this.heap[parent].priority <= this.heap[i].priority) {
        break;
      }

      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private siftDown(i: number): void {
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

      if (smallest === i) {
        break;
      }

      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}
