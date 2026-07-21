# Bidirectional Wire — v3 Final Architecture

> **Purpose:** Final architecture addressing all feedback  
> **Date:** July 2026  
> **Status:** Final proposal  
> **Supersedes:** All previous versions (v2, v2.1, v3, v3-review)

---

## Table of Contents

1. [Core Principle](#1-core-principle)
2. [Unified Propagation Model](#2-unified-propagation-model)
3. [Bus Grouping](#3-bus-grouping)
4. [Topology Graph Structure](#4-topology-graph-structure)
5. [Net Data Structure](#5-net-data-structure)
6. [Cache Ownership](#6-cache-ownership)
7. [Dirty Scheduling Semantics](#7-dirty-scheduling-semantics)
8. [Wire Interaction — All Modes](#8-wire-interaction--all-modes)
9. [End-to-End Lifecycle](#9-end-to-end-lifecycle)
10. [Serialization & Future-Proofing](#10-serialization--future-proofing)
11. [Junction Rules](#11-junction-rules)
12. [Scalability](#12-scalability)
13. [Future Extensibility](#13-future-extensibility)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Summary of Decisions](#15-summary-of-decisions)

---

## 1. Core Principle

> Users draw wires. The engine sees Nets.
> Every electrical connection — whether a single switch-to-LED wire or a 16-device shared bus — is a Net internally.
> The user never sees, creates, or manages Nets.

---

## 2. Unified Propagation Model

### The Problem with Dual Path

The v3 review proposed:

```typescript
if (net) readFromNet();
else readFromWire();
```

This creates two propagation algorithms, two caching strategies, two dirty-scheduling systems, and more edge cases at the boundary between them.

### Revised: Everything Is a Net

Every electrical connection is a Net. A simple `Switch → LED` connection:

```
Net {
  id: "n-abc",
  drivers: [{ comp: "switch-1", pin: 0 }],
  readers: [{ comp: "led-1", pin: 0 }]
}
```

A shared bus `CPU ↔ RAM ↔ ROM`:

```
Net {
  id: "n-def",
  drivers: [{ comp: "cpu", pin: 0 }, { comp: "ram", pin: 0 }, { comp: "rom", pin: 0 }],
  readers: [{ comp: "cpu", pin: 4 }, { comp: "ram", pin: 4 }]
}
```

Same data structure. Same propagation algorithm. Same caching. Same scheduling.

### Propagation — One Algorithm

```typescript
// Read phase for every input pin — unified:
for (let pin = 0; pin < def.inputs; pin++) {
  const net = this.graph.getNetForInputPin(compId, pin);
  if (net) {
    liveInputs[pin] = this.getResolvedNetValue(net);
  }
  // else: unconnected pin — stays at default (ZERO)
}
```

No `if (net) ... else readFromWire()`. If a pin has a connection, it has a net. If it's unconnected, there's no net and the default value applies.

### Internal Optimization (Invisible to the Model)

Single-driver nets (the 99% case) can be optimized internally without exposing a dual model:

```typescript
getResolvedNetValue(net: Net): SignalValue {
  if (net.drivers.length === 1) {
    // Fast path: direct read, no resolveSignal() call
    return components[net.drivers[0].comp]?.outputs[net.drivers[0].pin] ?? HIGH_IMPEDANCE;
  }
  // Multi-driver: resolve
  return this.resolveMultiDriverNet(net);
}
```

The optimization exists in ONE function behind ONE interface. The propagation loop doesn't branch. The scheduling doesn't branch. The caching doesn't branch. One model, one path, with an internal fast-path for the common case.

### What This Eliminates

- No more `Wire` vs `Net` distinction in propagation
- No more `getInputWire()` in the propagator
- No more `inputWires[]` used by propagation (only by GraphManager for topology)
- No more "is this pin on a net or on a wire?" check
- One dirty-scheduling system
- One cache strategy
- Fewer edge cases at boundaries

### Backward Compatibility

Existing circuits still work. On load:

1. Each existing `Wire` (output pin → input pin) becomes a single-driver Net
2. Propagation uses the unified path
3. The fast-path optimization means single-driver nets perform identically to the old `getInputWire()` path — one array index + one property access. No performance regression.

---

## 3. Bus Grouping

### The Feedback

> The simulator itself benefits from knowing that 8 one-bit nets belong to the same logical bus.

### Introducing `Bus`

A Bus is a lightweight grouping of related Nets. It is NOT a simulation concept — it doesn't affect propagation. It's a structural/metadata concept used by:

- UI: highlight entire bus, render bus label
- Debugging: show all 8 bits of a data bus together
- Waveform display: group related signals
- Probing: capture entire bus value as integer
- Serialization: group metadata
- Future HDL export: emit `wire [7:0] data`

```typescript
/**
 * A logical grouping of related 1-bit Nets.
 * Does NOT affect simulation. Used for UI, debugging, and export.
 */
export interface Bus {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable label (e.g., "D[7:0]", "ADDR[3:0]") */
  readonly label: string;
  /** Width in bits */
  readonly width: number;
  /** Ordered net IDs, index 0 = LSB */
  readonly netIds: readonly string[];
}
```

### How Buses Are Created

When the editor creates a bidirectional port connection (e.g., CPU "D[7:0]" to RAM "D[7:0]"), it creates:

- 8 individual Nets (one per bit)
- 1 Bus referencing those 8 net IDs

The Bus is metadata. Deleting one wire from the bus removes one Net from the Bus. If all Nets are removed, the Bus is auto-deleted.

### Relationship

```
Bus "D[7:0]"
  ├── Net "n-d0"  (drivers: [cpu.dOut0, ram.dOut0], readers: [cpu.dIn0, ram.dIn0])
  ├── Net "n-d1"  (drivers: [cpu.dOut1, ram.dOut1], readers: [cpu.dIn1, ram.dIn1])
  ├── ...
  └── Net "n-d7"  (drivers: [cpu.dOut7, ram.dOut7], readers: [cpu.dIn7, ram.dIn7])
```

### Bus Width Validation

The Bus knows its width. When connecting:

- 8-bit port → 8-bit port: valid, 8 nets created, Bus width = 8
- 8-bit port → 4-bit port: editor asks user or rejects (width mismatch)
- Single pin → bus: joins one Net in the Bus (valid)

Width validation happens at the **editor level** when making connections. The engine (propagator) sees only individual Nets — it never reads Bus objects.

---

## 4. Topology Graph Structure

### Graph Model

The topology graph is an undirected graph where:

```
Nodes:
  - PinNode: represents a component pin (output or input)
  - JunctionNode: represents a wire junction (T-junction, branch point)

Edges:
  - Segment: connects two nodes (PinNode↔JunctionNode, PinNode↔PinNode, JunctionNode↔JunctionNode)
```

### Node Types — Unified Under `TopologyNode`

```typescript
type TopologyNodeId = string;

interface PinNode {
  type: "pin";
  id: TopologyNodeId; // e.g., "pin:comp-abc:out:3"
  comp: string; // component ID
  pin: number; // pin index
  side: "output" | "input"; // determines driver vs reader role
}

interface JunctionNode {
  type: "junction";
  id: TopologyNodeId; // e.g., "junc:j-123"
}

type TopologyNode = PinNode | JunctionNode;
```

### Edge (Segment)

```typescript
interface Segment {
  id: string;
  nodeA: TopologyNodeId;
  nodeB: TopologyNodeId;
}
```

A segment is undirected. It connects two topology nodes. No signal direction — direction is determined by whether the pin is an output (driver) or input (reader).

### Adjacency Storage in GraphManager

```typescript
// Adjacency list: node ID → set of connected node IDs
private adjacency: Map<TopologyNodeId, Set<TopologyNodeId>> = new Map();

// Node registry
private topologyNodes: Map<TopologyNodeId, TopologyNode> = new Map();

// Segment registry
private segments: Map<string, Segment> = new Map();
```

### BFS for Connected Components

```typescript
getConnectedComponent(startNodeId: TopologyNodeId): Set<TopologyNodeId> {
  const visited = new Set<TopologyNodeId>();
  const queue = [startNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of this.adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) queue.push(neighbor);
    }
  }
  return visited;
}
```

From the connected component, extract all PinNodes, classify them as drivers (output pins) or readers (input pins), and construct the Net.

### Why This Structure

| Alternative                           | Problem                                                              |
| ------------------------------------- | -------------------------------------------------------------------- |
| Edge list only                        | No O(1) neighbor lookup — BFS is slow                                |
| Adjacency matrix                      | Sparse graph — wastes memory                                         |
| **Adjacency list (Map<id, Set<id>>)** | O(1) neighbor access, O(V+E) BFS, memory-efficient for sparse graphs |

### Example

```
Switch.out ── segment ── Junction ── segment ── LED.in
                              │
                              segment
                              │
                         Probe.in
```

Nodes: `[pin:switch:out:0, junc:j1, pin:led:in:0, pin:probe:in:0]`  
Adjacency:

```
pin:switch:out:0 → {junc:j1}
junc:j1 → {pin:switch:out:0, pin:led:in:0, pin:probe:in:0}
pin:led:in:0 → {junc:j1}
pin:probe:in:0 → {junc:j1}
```

Connected component → Net:

```
drivers: [{ comp: "switch", pin: 0 }]
readers: [{ comp: "led", pin: 0 }, { comp: "probe", pin: 0 }]
```

---

## 5. Net Data Structure

```typescript
/**
 * Runtime representation of a shared electrical connection.
 * Every connection in the circuit — from a simple wire to a multi-device bus — is a Net.
 *
 * INTERNAL ONLY — never exposed to user. Derived from topology graph.
 * Used by SignalPropagator for signal resolution.
 */
export interface Net {
  /** Unique identifier (derived from connected component) */
  readonly id: string;

  /** Output pins that drive this net */
  readonly drivers: readonly NetPinRef[];

  /** Input pins that read from this net */
  readonly readers: readonly NetPinRef[];
}

export interface NetPinRef {
  /** Component instance ID */
  readonly comp: string;
  /** Pin index */
  readonly pin: number;
}
```

### Why No `width` Field on Net

Each Net is 1-bit. "Width" is a Bus concept (a group of Nets). The Net itself doesn't need a width field — it resolves exactly one signal value.

### Why No Cached Value

The resolved value lives in `SignalPropagator`'s per-delta cache, not in the Net. The Net is a structural descriptor. It doesn't hold runtime simulation state. (See Section 6.)

---

## 6. Cache Ownership

### Principle: Structural vs Runtime

| Data                                        | Owner                | Why                                                               |
| ------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| Topology graph (nodes, segments, adjacency) | GraphManager         | Structural — changes only on edit operations                      |
| Derived Nets (driver/reader lists)          | GraphManager         | Structural — derived from topology, cached until topology changes |
| Bus metadata (label, width, net grouping)   | GraphManager         | Structural — changes only on edit operations                      |
| **Resolved net values**                     | **SignalPropagator** | **Runtime — changes every delta cycle**                           |
| Net dirty flags                             | SignalPropagator     | Runtime — per-propagation-pass state                              |
| Per-delta resolution cache                  | SignalPropagator     | Runtime — cleared each propagation pass                           |

### Why Runtime Values Live in SignalPropagator

1. **GraphManager is structural.** It describes topology. It doesn't know about simulation ticks, delta cycles, or signal values. It should remain pure structure.

2. **SignalPropagator owns the propagation pass.** It already manages the dirty set, evaluation order, and component state commits. Net resolution is part of the propagation pass — it belongs here.

3. **Lifecycle matches.** The resolution cache is valid for one delta cycle. The propagator controls delta cycle boundaries. It knows when to invalidate. GraphManager doesn't have this context.

### Cache Implementation in SignalPropagator

```typescript
class SignalPropagator {
  // Per-propagation-pass cache (cleared at start of each propagate() call)
  private netResolutionCache: Map<string, SignalValue> = new Map();
  private dirtyNets: Set<string> = new Set();

  /** Get resolved value for a net. Caches within one delta cycle. */
  private getResolvedNetValue(
    net: Net,
    components: Record<string, ComponentInstance>,
  ): SignalValue {
    const cached = this.netResolutionCache.get(net.id);
    if (cached !== undefined) return cached;

    // Resolve
    let resolved: SignalValue;
    if (net.drivers.length === 1) {
      // Fast path: single driver — no resolveSignal call
      const d = net.drivers[0];
      resolved =
        components[d.comp]?.outputs[d.pin] ?? LogicValue.HIGH_IMPEDANCE;
    } else {
      // Multi-driver: resolve all
      const values: LogicValue[] = [];
      for (const d of net.drivers) {
        values.push(
          components[d.comp]?.outputs[d.pin] ?? LogicValue.HIGH_IMPEDANCE,
        );
      }
      resolved = resolveSignal(values);
    }

    this.netResolutionCache.set(net.id, resolved);
    return resolved;
  }

  /** Clear cache at the start of each delta cycle */
  private clearNetCache(): void {
    this.netResolutionCache.clear();
  }
}
```

---

## 7. Dirty Scheduling Semantics

### When a Driver's Output Changes

```typescript
if (outputChanged) {
  // For each output pin that changed:
  for (let pin = 0; pin < result.outputs.length; pin++) {
    if (result.outputs[pin] === comp.outputs[pin]) continue; // this pin didn't change

    const net = this.graph.getNetForDriverPin(compId, pin);
    if (!net) continue; // pin not connected

    // Mark net dirty (invalidate cached resolution)
    this.dirtyNets.add(net.id);

    // Schedule all readers for re-evaluation
    for (const reader of net.readers) {
      nextDirty.add(reader.comp);
    }
  }
}
```

### Key Questions Answered

**Q: If two drivers on the same net change in one delta cycle, is the net resolved once or twice?**

**Once.** Both drivers change → both schedule the same readers → net is marked dirty → readers are in the dirty set for the NEXT delta. When those readers evaluate in the next delta, they call `getResolvedNetValue()` which computes the resolution exactly once (then caches it for remaining readers).

Within a single delta cycle, the resolution cache ensures one computation per net regardless of how many drivers triggered it.

**Q: Does the dirty queue deduplicate nets?**

**Yes.** `dirtyNets` is a `Set<string>`. Multiple drivers marking the same net dirty just adds the same ID to the set — a no-op on subsequent adds.

Reader scheduling uses `nextDirty.add(reader.comp)` — also a Set. If the same reader component is scheduled by two driver changes on the same net, it appears in the set once.

**Q: Does a net schedule itself recursively?**

**No.** A net doesn't schedule itself. A net's DRIVERS schedule the net's READERS. If a reader also happens to be a driver on the SAME net (bidirectional component like RAM), it gets re-evaluated, and if its output changes again, it re-marks the net dirty for the NEXT delta. This is standard delta-cycle iteration — convergence happens naturally.

Self-scheduling loop:

```
Delta 1: CPU drives net → RAM (reader) scheduled
Delta 2: RAM evaluates → RAM output changes → RAM (driver) marks net dirty → CPU (reader) scheduled
Delta 3: CPU evaluates → CPU output unchanged (Hi-Z, not driving) → stable
```

Converges in 2-3 deltas. No infinite loop because Hi-Z doesn't change.

**Q: How are oscillating nets handled?**

Same as oscillating components in the existing engine:

1. **Per-component eval count:** `MAX_EVALS_PER_COMPONENT = 64`. If a component is evaluated too many times, it's flagged as oscillating.

2. **Pattern detection:** The existing period-2 pattern detector catches alternating output values.

3. **Global delta limit:** `MAX_DELTA_CYCLES = 128`. If the entire propagation doesn't stabilize, oscillation is declared.

No net-specific oscillation handling needed. The existing mechanisms catch it because oscillation manifests as components being repeatedly re-evaluated — which the propagator already detects.

### Net Resolution Timing

```
Delta cycle N:
  1. Clear net resolution cache
  2. For each dirty component (sorted by topo rank):
     a. Read phase: for each input pin, get net resolved value (lazy-computed, cached)
     b. Evaluate
     c. Commit outputs
     d. If output changed: mark affected nets dirty, schedule readers into nextDirty
  3. dirtySet = nextDirty
  4. If dirtySet not empty → Delta cycle N+1
```

The cache is cleared once per delta cycle. Within a delta, the first reader to query a net triggers resolution. All subsequent readers on the same net get the cached value. This guarantees snapshot consistency: all readers in one delta see the same resolved value, even if a driver on the same net was evaluated earlier in the same delta (they see the PREVIOUS delta's committed output because the cache was built from committed state).

---

## 8. Wire Interaction — All Modes

### Mode 1: Pin → Pin (Standard Wire)

**User action:** Drag from output pin, drop on input pin.

**What happens:**

1. Editor creates a segment: `PinNode(output) ↔ PinNode(input)`
2. GraphManager adds to topology: new nodes, new segment, updated adjacency
3. GraphManager derives Net: one driver, one reader
4. Propagation triggered: driver's current output flows to reader

**Visual:** A wire appears between the two pins.

### Mode 2: Pin → Wire (Connect to Existing Wire)

**User action:** Drag from a pin, drop onto an existing wire segment.

**What happens:**

1. Editor splits the target segment at the drop point
2. A JunctionNode is inserted at the split point
3. A new segment connects the dragged pin to the junction
4. GraphManager updates topology: new junction node, new segments, updated adjacency
5. Connected component grows → Net rebuilt to include the new pin

**Visual:** A T-junction appears where the new wire meets the existing wire.

**Example:**

```
Before:
  CPU.out ────────── LED.in     (Net: drivers=[CPU], readers=[LED])

User connects Probe.in to the middle of that wire.

After:
  CPU.out ────+────── LED.in
              │
         Probe.in

Net: drivers=[CPU], readers=[LED, Probe]
```

### Mode 3: Wire → Wire (Connect Two Existing Wires)

**User action:** Drag one wire onto another wire (or drag a wire endpoint onto another wire).

**What happens:**

1. Editor creates a junction at the intersection point
2. Both wire segments are split at that point (if dropped mid-segment)
3. Junction connects all resulting sub-segments
4. GraphManager updates topology: two previously separate components merge into one
5. Nets of both components are deleted, one new merged Net is created

**Visual:** A T-junction (or cross-junction) appears. All connected pins share one electrical net.

**Example:**

```
Before:
  CPU.dOut ────── RAM.dIn       (Net A: drivers=[CPU], readers=[RAM])
  ROM.dOut ────── GPIO.dIn      (Net B: drivers=[ROM], readers=[GPIO])

User connects wire A to wire B.

After:
  CPU.dOut ──+──── RAM.dIn
             │
  ROM.dOut ──+──── GPIO.dIn

Net AB: drivers=[CPU, ROM], readers=[RAM, GPIO]
```

### Mode 4: Wire → Pin (Connect Existing Wire to a Pin)

**User action:** Drag from an existing wire (or junction) to a pin.

**Same as Mode 2** but initiated from the wire side. Mechanically identical: junction at departure point, new segment to target pin, topology update, net rebuild.

### Mode 5: Disconnect (Delete Wire Segment)

**User action:** Select a segment, press Delete.

**What happens:**

1. Editor removes the segment
2. GraphManager removes from adjacency
3. Check if the connected component split into two:
   - BFS from both endpoints of the removed segment
   - If they reach different components → net splits into two nets
   - If the endpoints aren't reachable from each other → confirmed split
4. Orphaned junctions (degree 0 or 1) are auto-cleaned

**Example:**

```
Before:
  CPU.dOut ──+──── RAM.dIn
             │
  ROM.dOut ──+──── GPIO.dIn

User deletes the vertical segment (the junction connector).

After:
  CPU.dOut ──────── RAM.dIn     (Net A: drivers=[CPU], readers=[RAM])
  ROM.dOut ──────── GPIO.dIn    (Net B: drivers=[ROM], readers=[GPIO])
```

### Summary Table

| Mode            |     Creates Junction?     |         Merges Nets?         | Splits Net? |
| --------------- | :-----------------------: | :--------------------------: | :---------: |
| Pin → Pin       |    No (direct segment)    |         No (new net)         |     No      |
| Pin → Wire      |            Yes            | Yes (pin joins existing net) |     No      |
| Wire → Wire     |            Yes            |  Yes (two nets become one)   |     No      |
| Wire → Pin      |            Yes            | Yes (existing net gains pin) |     No      |
| Delete segment  | Possibly removes junction |              No              |  Possibly   |
| Delete junction |       Yes (removed)       |              No              |  Possibly   |

---

## 9. End-to-End Lifecycle

### Complete Flow: From User Action to Signal Resolution

```
┌─────────────────────────────────────────────────────────────────┐
│ USER ACTION                                                      │
│ User draws wire / creates junction / deletes segment             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ EDITOR LAYER                                                     │
│ 1. Determine interaction mode (pin→pin, pin→wire, wire→wire)    │
│ 2. Create/split/remove segments and junctions                    │
│ 3. Call GraphManager topology methods                             │
│ 4. Update WireRoutingManager geometry                            │
│ 5. Wrap in transaction                                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ GRAPH MANAGER — TOPOLOGY UPDATE                                  │
│ 1. Update adjacency list (add/remove nodes and edges)            │
│ 2. Invalidate affected Net(s)                                    │
│ 3. Mark netsDirty flag                                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ GRAPH MANAGER — NET REBUILD (Lazy, on next query or commit)      │
│ 1. BFS from affected nodes → find connected component(s)        │
│ 2. Classify pins: output pins → drivers, input pins → readers   │
│ 3. Create/update/delete Net objects                              │
│ 4. Update pinToNet reverse index                                 │
│ 5. Clear netsDirty                                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ TRANSACTION COMMIT                                               │
│ 1. Ensure nets are rebuilt (if dirty)                            │
│ 2. Trigger propagation (recomputeAll or seeded propagation)      │
│ 3. Emit SNAPSHOT_CHANGED                                         │
│ 4. ProjectManager records undo point                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ SIGNAL PROPAGATOR — PROPAGATION PASS                             │
│                                                                  │
│ For each delta cycle:                                            │
│   1. Clear net resolution cache                                  │
│   2. For each dirty component (topo-sorted):                     │
│      a. READ: for each input pin → getResolvedNetValue(net)     │
│         - If already cached this delta → return cache            │
│         - Else: collect driver outputs, resolveSignal(), cache   │
│      b. EVALUATE: def.evaluate(liveInputs, state, context)      │
│      c. COMMIT: write outputs + state to component              │
│      d. SCHEDULE: if output changed →                           │
│           - Find net(s) for changed driver pin(s)               │
│           - Mark net(s) dirty                                    │
│           - Add all readers of those nets to nextDirty           │
│   3. dirtySet = nextDirty                                       │
│   4. Repeat until stable or MAX_DELTA_CYCLES                    │
│                                                                  │
│ Result: all signals settled, UI can render                       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Properties of This Flow

1. **Single source of truth:** Topology graph in GraphManager
2. **One propagation algorithm:** Every pin reads from its Net
3. **Lazy net rebuild:** Only recomputed when topology changes AND is queried
4. **One resolution per net per delta:** Cache ensures no redundant computation
5. **Snapshot consistency:** All readers in one delta see same resolved value
6. **Convergence:** Same delta-cycle mechanism as existing engine

---

## 10. Serialization & Future-Proofing

### Save Format

```json
{
  "version": 2,
  "name": "My Circuit",
  "savedAt": 1721000000000,
  "circuit": {
    "components": { ... },
    "topology": {
      "segments": [
        { "id": "s1", "nodeA": "pin:cpu:out:0", "nodeB": "junc:j1" },
        { "id": "s2", "nodeA": "junc:j1", "nodeB": "pin:ram:in:4" },
        { "id": "s3", "nodeA": "junc:j1", "nodeB": "pin:rom:in:4" }
      ],
      "junctions": ["j1"]
    },
    "routing": {
      "segmentPaths": {
        "s1": [[100,200],[200,200]],
        "s2": [[200,200],[350,200]],
        "s3": [[200,200],[200,350]]
      },
      "junctionPositions": { "j1": [200, 200] }
    },
    "buses": [
      { "id": "bus-data", "label": "D[7:0]", "width": 8, "netIds": ["n-d0","n-d1","n-d2","n-d3","n-d4","n-d5","n-d6","n-d7"] }
    ]
  }
}
```

### What Is Saved vs Reconstructed

| Data                            |       Saved?        | Why                                                     |
| ------------------------------- | :-----------------: | ------------------------------------------------------- |
| Components                      |         Yes         | User-created state                                      |
| Topology (segments + junctions) |         Yes         | Defines electrical connectivity                         |
| Routing (paths + positions)     |         Yes         | Preserves user's visual layout                          |
| Buses                           |         Yes         | Preserves user's bus labels and grouping                |
| Nets                            |         No          | Derived from topology on load                           |
| Resolved values                 |         No          | Recomputed via propagation on load                      |
| Engine wires (legacy)           | Yes (for v1 compat) | Old files have only this; converted to topology on load |

### On Load

```
1. Parse JSON
2. Load components
3. If version 1 (legacy):
     - Read `wires` field
     - Convert each wire to a topology segment (PinNode ↔ PinNode, no junctions)
     - Auto-generate straight-line routing
4. If version 2+:
     - Load topology segments + junctions → build adjacency graph
     - Load routing → restore visual paths
     - Load buses → restore bus metadata
5. Derive all Nets from connected components
6. Run recomputeAll() to stabilize signals
```

### Future-Proofing the Format

The save format is designed to be forward-compatible:

```json
{
  "version": 3,  // future version
  "circuit": {
    "topology": {
      "segments": [...],
      "junctions": ["j1"],
      "junctionProperties": {
        "j1": { "label": "DATA_BUS", "style": "dot" }
      }
    },
    "buses": [
      {
        "id": "bus-data",
        "label": "D[7:0]",
        "width": 8,
        "netIds": [...],
        "properties": { "pullUp": true, "driveStrength": "strong" }
      }
    ]
  }
}
```

**Rules for future versions:**

- New fields are always OPTIONAL (old loaders ignore them)
- Existing fields never change meaning
- New node types or segment properties go inside `Properties` objects
- Migration is always additive (v2 → v3 adds fields, never removes)

This means:

- Junctions can get richer (labels, styles) → add `junctionProperties`
- Buses can get properties (pull-up, drive strength) → add `properties` to Bus
- Segments can get metadata (wire gauge, color) → add `segmentProperties`
- None of these break older loaders

---

## 11. Junction Rules

### Creation

| Trigger                                       | Result                                                 |
| --------------------------------------------- | ------------------------------------------------------ |
| Wire endpoint dropped on segment mid-point    | Split segment → insert JunctionNode → connect new wire |
| Wire endpoint dropped on existing junction    | Add new segment to existing junction (no new junction) |
| Wire endpoint dropped on pin                  | Direct segment (PinNode ↔ PinNode), no junction needed |
| Two separate wires dropped at same grid point | Junction created connecting both                       |

### Deletion

| Trigger                                               | Result                                                                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| User explicitly deletes junction                      | Remove junction node. If exactly 2 segments met there → merge into one segment. If >2 → all segments become disconnected endpoints. |
| Segment deletion leaves junction with 0-1 connections | Auto-delete junction (no dangling nodes)                                                                                            |
| Component deletion removes a PinNode                  | All segments from that pin are removed. Orphaned junctions cleaned up.                                                              |

### Merge

| Trigger                              | Result                                                                                                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| User drags one junction onto another | Both junctions' segments are reconnected to a single junction. Topology: two nodes become one. Net rebuild triggered. |

### Grid Snapping

- Junctions snap to `CELL_SIZE` grid (same as component pins)
- Hit-test radius for "drop on wire": configurable (default ~12px at 1× zoom, scales with zoom)
- Wire segments auto-route to grid-aligned paths between their endpoints

### What Affects Simulation

| Rule                      |       Simulation Impact       |
| ------------------------- | :---------------------------: |
| Junction creation         |        Yes (net merge)        |
| Junction deletion         |   Yes (possible net split)    |
| Junction merge            |       Yes (nets merge)        |
| Junction position change  |              No               |
| Segment path change       |              No               |
| Segment split at junction | Yes (new topology connection) |

---

## 12. Scalability

### Everything-Is-A-Net: Performance Characteristics

| Circuit Size                         | Nets                  | Resolution Cost Per Delta                | Notes                             |
| ------------------------------------ | --------------------- | ---------------------------------------- | --------------------------------- |
| 100 components                       | ~80 nets              | 80 net lookups + ~80 cache hits          | All single-driver → fast path     |
| 500 components                       | ~400 nets             | 400 lookups                              | Cache ensures one resolve per net |
| 2000 components                      | ~1500 nets            | 1500 lookups                             | Still O(1) per lookup             |
| + 10 shared buses (8-bit, 4 devices) | +80 multi-driver nets | +80 resolveSignal calls (4 drivers each) | ~320 extra array accesses         |

### Why This Scales

1. **Single-driver fast path:** `if (net.drivers.length === 1)` → direct array access. Same cost as the old `getInputWire()` path. No regression.

2. **Per-delta cache:** Each net resolved at most once per delta cycle. 1000 nets = 1000 cache entries. Map lookup is O(1). Total cache: ~8KB for 1000 nets.

3. **Net derivation is amortized:** Nets are rebuilt only on topology changes (editing). During simulation (running clock), topology is static → zero derivation cost.

4. **BFS is bounded:** Connected component BFS on topology change touches only the affected component. Typical bus: ~20 nodes. BFS: microseconds.

### Comparison to Old Architecture

| Operation          | Old (Wire per connection)                    | New (Everything is Net)                              |
| ------------------ | -------------------------------------------- | ---------------------------------------------------- |
| Read one input pin | `Map.get("comp:pin")` → Wire → source output | `Map.get("comp:pin")` → Net → cache/resolve          |
| Cost               | 1 Map lookup + 1 array index                 | 1 Map lookup + 1 cache lookup (or 1 resolve on miss) |
| Difference         | —                                            | +1 cache lookup (~3ns). Negligible.                  |

---

## 13. Future Extensibility

| Feature                  | Impact on Architecture                                | Difficulty     |
| ------------------------ | ----------------------------------------------------- | -------------- |
| Bidirectional RAM        | None (native — multi-driver net)                      | Ready          |
| Tri-state buffers        | None (driver outputs Hi-Z)                            | Ready          |
| Open collector           | Extend resolveSignal with drive strength              | Low (additive) |
| Bus labels               | Bus.label field (already in design)                   | Trivial        |
| Named nets               | Net metadata field                                    | Low            |
| Bus tapping              | Single pin joins one net in a bus group               | Ready          |
| Waveform probe on bus    | Read Bus.netIds, sample each net's resolved value     | Low            |
| HDL export               | Iterate nets + buses → emit Verilog wire declarations | Medium         |
| Hierarchical             | Each sub-circuit has its own GraphManager/topology    | Medium         |
| Multi-sheet              | Cross-sheet pin refs as topology nodes                | Medium         |
| Pull-up/down resistors   | Net-level weak driver (extend resolve table)          | Low            |
| Bus arbitration warnings | Detect >1 active driver on same net, report to UI     | Low            |

No architectural decision blocks future features.

---

## 14. Implementation Roadmap

### Phase 0: Types & Interfaces (Half Day)

1. Define `TopologyNode`, `PinNode`, `JunctionNode`, `Segment`
2. Define `Net`, `NetPinRef`
3. Define `Bus`
4. Add `topology`, `routing`, `buses` to `CircuitSnapshot` (optional fields)

**Files:** `types.ts`  
**Risk:** Zero (additive types)

### Phase 1: Topology Graph in GraphManager (2-3 Days)

1. Add adjacency list, node registry, segment registry
2. Implement `addSegment()`, `removeSegment()`, `addJunctionNode()`, `removeJunctionNode()`
3. Implement `getConnectedComponent()` (BFS)
4. Implement `deriveNetsForComponent()` → builds Net from connected component
5. Implement `getNetForInputPin()`, `getNetForDriverPin()` (reverse lookups)
6. Net cache with dirty invalidation on topology change

**Files:** `GraphManager.ts`  
**Risk:** Medium (new subsystem, but no changes to existing wire methods)

### Phase 2: Unified Propagation (2-3 Days)

1. Replace `getInputWire()` reads in propagator with `getResolvedNetValue(net)`
2. Implement per-delta net resolution cache in SignalPropagator
3. Implement net-based dirty scheduling (driver change → mark net → schedule readers)
4. Update `recomputeAll()` to use net-based reads
5. Update `reconcileOutputSinks()` similarly

**Files:** `SignalPropagator.ts`, `SimulationEngine.ts`  
**Risk:** High (replacing the propagation read path — must be thoroughly tested)

### Phase 3: Migration — Existing Wires to Topology (1-2 Days)

1. On `loadSnapshot()`: convert legacy `Wire` objects to topology segments (PinNode ↔ PinNode)
2. Derive nets from the resulting topology
3. Ensure all existing circuits work identically with the new propagation path
4. `getSnapshot()` emits topology format for new saves, keeps `wires` for backward compat

**Files:** `CircuitManager.ts`, `ProjectManager.ts`  
**Risk:** Medium (migration path — lots of testing against existing circuits)

### Phase 4: WireRoutingManager (2-3 Days)

1. Create `WireRoutingManager` for geometry (segment paths, junction positions)
2. Update UI rendering to use segments + junctions
3. Auto-routing for new segments (grid-aligned paths)

**Files:** New `WireRoutingManager.ts`, UI components  
**Risk:** Low (new layer, doesn't affect engine)

### Phase 5: Junction Interaction (2-3 Days)

1. Implement pin→wire connection (T-junction creation)
2. Implement wire→wire connection (junction merge)
3. Implement junction deletion (split detection)
4. Transaction wrapping for all operations
5. Undo/redo verification

**Files:** Editor interaction hooks, `GraphManager.ts`, `CircuitManager.ts`  
**Risk:** Medium

### Phase 6: Bus Support (1-2 Days)

1. Implement Bus type in GraphManager
2. Editor: when connecting bidir ports, create Bus + N parallel nets
3. UI: bus wire rendering (thick line), bus labels
4. Serialization: save/load buses

**Files:** `GraphManager.ts`, UI components, `ProjectManager.ts`  
**Risk:** Low

### Phase 7: Bidirectional Components (1-2 Days)

RAM, ROM, Bus Hub.

**Files:** `logic.ts`, `ComponentLibrary.ts`, `constants.ts`  
**Risk:** Low

### Phase 8: Polish (2-3 Days)

- Contention indicators
- Bus value display (hex/binary)
- Waveform probe integration
- Properties panel (net membership, bus info)

### Total: 14-21 Working Days

---

## 15. Summary of Decisions

| Decision                                                   | Rationale                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Everything is a Net**                                    | One propagation algorithm, one caching strategy, one scheduling system. Eliminates dual-path complexity.                  |
| **Single-driver optimization is internal**                 | `if (drivers.length === 1)` fast path inside `getResolvedNetValue()`. Same performance, invisible to the model.           |
| **Bus groups Nets**                                        | UI, debugging, probing, and future HDL export benefit from knowing bits belong together. Bus is metadata, not simulation. |
| **Topology graph = adjacency list**                        | O(1) neighbor lookup, O(V+E) BFS. Clean BFS implementation for connected components.                                      |
| **Unified TopologyNode (PinNode                            | JunctionNode)**                                                                                                           | One graph API for BFS. Cleaner than separate pin/junction graphs. |
| **Net derived from topology**                              | Single source of truth. No sync. No stored membership to maintain.                                                        |
| **Resolved value cached in SignalPropagator**              | Runtime state belongs in the propagation pass, not in structural GraphManager.                                            |
| **Net dirty deduplication**                                | `Set<string>` for dirty nets. Multiple drivers changing = one resolution. No redundancy.                                  |
| **No recursive net scheduling**                            | Standard delta-cycle iteration handles feedback. Existing oscillation detection catches runaway loops.                    |
| **pin→wire and wire→wire interactions**                    | T-junctions created, topology updated, net rebuilt. Same mechanism for all connection modes.                              |
| **Serialization: topology + routing, derive nets on load** | Single source of truth. Future-proof format with optional extension fields.                                               |
| **No D×R engine wire generation**                          | Eliminated. Direct net resolution is simpler, faster, and doesn't create phantom wires.                                   |

---

_End of v3 Final Architecture_
