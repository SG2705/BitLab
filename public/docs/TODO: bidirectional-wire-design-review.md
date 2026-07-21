# Bidirectional Wire — Self-Review & Design Refinement (v2)

> **Purpose:** Rigorous design review of the Net Overlay architecture proposal  
> **Date:** July 2026  
> **Prerequisite:** Read `bidirectional-wire-architecture.md` first  
> **Approach:** Challenge every assumption, simplify where possible, redesign where necessary  
> **Revision:** v2 — incorporates feedback on derived topology, serialization, junctions, and commit semantics

---

## 1. NetManager — Should It Exist?

### Option A: GraphManager Owns Everything

GraphManager already owns:

- Node registry (downstream, upstream)
- Wire storage and indexing (outputWires, inputWires)
- Topological sort cache
- Per-node wire index (nodeWires)
- Edge reference counting

### Option B: Separate NetManager

Creates synchronization problems, coupling, and state divergence risk.

### ~~Option A: GraphManager owns net membership explicitly~~

### Revised Recommendation: **No Explicit Net Storage Anywhere**

After further review, the original "GraphManager owns nets" conclusion was still wrong. It still creates two sources of truth (wires + net membership). The correct answer:

**Nets do not exist as stored objects.** A net is a _derived view_ — it's what you get when you query "which output pins can reach this input pin?" The wire topology IS the net. The only stored state is:

1. **Wires** (already in GraphManager)
2. **Which input pins allow multiple drivers** (derived from component `bidirPorts` metadata)

The "net" is computed on demand or cached lazily from wire connectivity. GraphManager already has all the information needed — it just needs a new query method:

```typescript
// NEW: Returns all wires feeding this input pin (for multi-driver pins)
getInputWires(compId: ComponentId, pinIndex: number): Wire[]
```

For standard pins, this returns `[singleWire]` or `[]`. For multi-driver pins, it returns all connected wires. The net is implicitly "the set of output pins connected via wires to the same group of input pins."

**No `createNet()`. No `addToNet()`. No `removeFromNet()`. No net IDs. No net map.**

Wire add/remove is the ONLY operation. Nets emerge from wires.

---

## 2. Graph Representation — Derived Nets

### The Core Change

```typescript
// CURRENT:
private inputWires: Map<string, Wire> = new Map();     // one wire per input pin

// NEW:
private inputWires: Map<string, Wire[]> = new Map();   // one OR many wires per input pin
```

That's it. The type changes from `Wire` to `Wire[]`. For 99.9% of pins, the array has length 1. For multi-driver pins (bidirectional buses), the array has length > 1.

### What Is a "Net" in This Model?

A net is NOT a stored object. It is a **query result:**

> "Give me all output pins whose wires terminate at input pins belonging to the same bidirectional port group."

More concretely: when propagating, if a pin has multiple input wires, call `resolveSignal()` on all their source values. That's the "net resolution." No net ID, no net registry, no membership tracking.

### Why This Is Better

| Concern               | Explicit Net Storage       | Derived From Wires              |
| --------------------- | -------------------------- | ------------------------------- |
| Source of truth       | Two (wires + nets)         | One (wires only)                |
| Consistency on delete | Must update both           | Automatic                       |
| Consistency on undo   | Must snapshot both         | Automatic                       |
| Serialization         | Must save both             | Save wires only                 |
| Copy/paste            | Must handle net membership | Automatic                       |
| Load                  | Must rebuild net state     | Just load wires                 |
| Code complexity       | ~120 lines net CRUD        | ~30 lines (type change + query) |

### Scaling

| Option                    | Lookup cost | Notes                                      |
| ------------------------- | ----------- | ------------------------------------------ |
| Pin → Net → Pins (stored) | O(1)        | But requires maintenance                   |
| Pin → Wires[] (derived)   | O(1)        | Array already there, just allow length > 1 |

Both are O(1). The derived approach has zero maintenance cost.

### Connection Grouping (Addressing the Junction Problem)

The question "do A, B, and C all belong together?" is answered by wire connectivity:

```
CPU.dataOut[0] ──wire──> RAM.dataIn[0]
CPU.dataOut[0] ──wire──> ROM.dataIn[0]
RAM.dataOut[0] ──wire──> CPU.dataIn[0]
ROM.dataOut[0] ──wire──> CPU.dataIn[0]
```

CPU's `dataIn[0]` has TWO input wires (from RAM.dataOut[0] and ROM.dataOut[0]). During propagation, both are resolved together. This IS the "net" — it's just the set of wires arriving at the same multi-driver input pin.

Similarly, RAM's `dataIn[0]` has a wire from CPU.dataOut[0]. And ROM's `dataIn[0]` has a wire from CPU.dataOut[0]. These are standard fan-out wires (one output driving multiple inputs) — already supported.

The "three belong together" relationship is encoded entirely in wire connectivity. No separate grouping needed.

---

## 3. Junctions — Connectivity vs. Visual

### The Feedback

> "Visually they're UI. Connectivity-wise they are not. The engine must know all three belong together."

### Revised Understanding

Correct. The engine doesn't care about coordinates, but it absolutely must know that CPU, RAM, and ROM share a bus. This connectivity information must survive routing changes, position changes, and UI rearrangements.

### How This Is Represented

In the derived-net model, the connectivity IS the wires:

```
Scenario: CPU, RAM, ROM share an 8-bit data bus

Wires that exist:
  CPU.dOut[0] → RAM.dIn[0]    // CPU can write to RAM
  CPU.dOut[0] → ROM.dIn[0]    // CPU can write to ROM (unusual but valid)
  RAM.dOut[0] → CPU.dIn[0]    // RAM can write to CPU
  ROM.dOut[0] → CPU.dIn[0]    // ROM can write to CPU
  // ... same for bits 1-7
```

The grouping "all three share a bus" is implicit in the fact that:

- CPU.dIn[0] has wires from both RAM.dOut[0] and ROM.dOut[0]
- RAM.dIn[0] has a wire from CPU.dOut[0]
- ROM.dIn[0] has a wire from CPU.dOut[0]

**Delete the RAM→CPU wire:** CPU.dIn[0] now has only one source (ROM.dOut[0]). RAM is no longer on the bus for that pin. Correct behavior — removing a wire removes connectivity.

**Move the junction visually:** Zero engine impact. The wires still exist with the same from/to endpoints. Only the rendering path changes.

### What If We Want "All Three Share One Logical Bus" Without N² Wires?

For a 3-device bus, we need 6 wire groups (A→B, A→C, B→A, B→C, C→A, C→B). For N devices, that's N×(N-1) wire groups. With 8-bit buses, that's 8×N×(N-1) wires. For 4 devices on an 8-bit bus: 96 wires.

This is the real problem. The fully-connected wire approach doesn't scale.

### Revised Solution: Fan-In Relaxation (Not Full Mesh)

The key insight: we don't need N² connections. We need:

1. Each device's **output** can reach every other device's **input** on the same bus
2. At most one device drives at a time (others are Hi-Z)

The minimal wire topology for a 3-device 1-bit bus:

```
CPU.dOut → RAM.dIn     (CPU can write to RAM)
CPU.dOut → ROM.dIn     (CPU can write to ROM — fan-out, already supported)
RAM.dOut → CPU.dIn     (RAM can read-back to CPU)
ROM.dOut → CPU.dIn     (ROM can read-back to CPU — MULTI-DRIVER on CPU.dIn)
```

That's 4 wires, not 6. The multi-driver case is ONLY on input pins that receive from multiple sources. Fan-out (one output to multiple inputs) is already free.

For N devices on a 1-bit bus: each device has 1 output wire to each other device's input (fan-out = N-1, free) + each device's input has N-1 incoming wires (multi-driver, resolved). Total wires: N × (N-1). For 4 devices: 12 wires per bit, 96 for 8-bit. Same count — but it's the MINIMUM for full connectivity.

### Practical Simplification: Bus Hub Pattern

For large buses (5+ devices), introduce a **Bus Hub** component — a zero-logic component that acts as a junction point:

```
CPU.dOut ──→ HUB.in[0]     HUB.out[0] ──→ CPU.dIn
RAM.dOut ──→ HUB.in[1]     HUB.out[1] ──→ RAM.dIn
ROM.dOut ──→ HUB.in[2]     HUB.out[2] ──→ ROM.dIn
GPIO.dOut──→ HUB.in[3]     HUB.out[3] ──→ GPIO.dIn
```

The HUB's evaluate function: resolve all inputs, output the resolved value to all outputs.

```typescript
evaluate: (inputs, state) => {
  const resolved = resolveSignal(inputs);
  return { outputs: new Array(inputs.length).fill(resolved), state: null };
};
```

This reduces wiring from N×(N-1) to 2×N (each device has one wire to hub, one from hub). The hub IS the junction. It's a component, not a special graph concept. Zero engine changes needed.

**This is the cleanest solution:**

- Junction = Bus Hub component
- Wires remain point-to-point, directed, single-driver (mostly)
- The hub resolves multi-driver signals
- Connectivity survives all visual changes (it's just wires to/from a component)
- Deletion of one wire disconnects one device cleanly
- No N² wiring for large buses

For 2-3 devices: direct multi-driver wires (simpler, fewer components)  
For 4+ devices: Bus Hub pattern (scales linearly)

---

## 4. Incremental Updates

### Revised Assessment

With derived nets (no stored net objects), there's nothing to "incrementally update." The question becomes: does any cached data need invalidation?

### What Gets Invalidated

When a wire is added/removed:

1. **Topological sort cache** → already invalidated by existing `addWire()`/`removeWire()`
2. **Downstream cache** in SignalPropagator → already invalidated by `invalidateCache()`
3. **Multi-driver status of a pin** → derived from `inputWires[pin].length > 1` — no cache needed, it's a direct array length check

### Conclusion

**No incremental update logic needed.** There's no net state to maintain. The inputWires array IS the state. Adding/removing a wire directly changes it. The propagator reads it fresh each pass. Done.

---

## 5. Serialization

### Revised Recommendation: **Save Wires Only, Derive Everything Else**

```json
{
  "version": 2,
  "name": "My Circuit",
  "savedAt": 1721000000000,
  "circuit": {
    "components": {
      "comp-1": { "id": "comp-1", "type": "RAM_16x8", ... },
      "comp-2": { "id": "comp-2", "type": "CPU", ... }
    },
    "wires": {
      "wire-1": { "id": "wire-1", "from": {"comp":"comp-2","pin":0}, "to": {"comp":"comp-1","pin":4} },
      "wire-2": { "id": "wire-2", "from": {"comp":"comp-1","pin":0}, "to": {"comp":"comp-2","pin":4} }
    }
  }
}
```

**No `nets` field. No `junctions` field. No `pinToNet` field.**

On load:

1. Restore components and wires (existing behavior)
2. `GraphManager.addWire()` populates `inputWires` arrays — if an input pin gets multiple wires, it's automatically multi-driver
3. `recomputeAll()` propagates signals including multi-driver resolution
4. Done

### Why This Is Correct

- **Single source of truth:** Wires define connectivity. Period.
- **No divergence possible:** You can't have a "stale net" because nets don't exist as objects
- **Backward compatibility:** Old v1 files load identically (they have no multi-driver pins). No migration needed for the wire format.
- **Undo/redo:** `CircuitSnapshot` already includes wires. Restoring a snapshot restores exact connectivity. Nets emerge automatically.
- **Copy/paste:** Copy wires between selected components. Multi-driver relationships are preserved if both endpoints are copied.

### What About Version Bump?

Actually — **no version bump is needed at all.** The wire format is unchanged. The only difference is that `addWire()` now allows multiple wires to the same input pin (for bidir-flagged pins). Old files work unchanged because they never have multi-driver pins.

### Migration

```typescript
const migrate = (project: SerializedProject): SerializedProject => {
  // No migration needed! Wire format is identical.
  // Multi-driver behavior emerges from the relaxed addWire() validation
  // and new component types (RAM etc.) that have bidirPorts metadata.
  return project;
};
```

---

## 6. Propagation Integration — Respecting Read/Evaluate/Commit

### The Problem (Feedback #4)

The previous revision proposed:

```typescript
comp.inputs[reader.pin] = resolved; // DIRECT MUTATION during propagation
```

This violates the existing propagation contract:

1. **Read** committed state
2. **Evaluate** (pure function)
3. **Commit** (write new state atomically)

Direct mutation during the evaluation pass creates race conditions: a component evaluated later in the same delta cycle would see the updated value, breaking snapshot consistency.

### Revised Approach: Multi-Driver Resolution in the Read Phase

The fix is simple and elegant. Don't mutate inputs during propagation. Instead, **resolve multi-driver pins during the input-read phase**, the same place where single-driver pins are read.

Currently in the propagation loop:

```typescript
// Read phase: build inputs from current committed state
for (let pin = 0; pin < def.inputs; pin += 1) {
  const wire = this.graph.getInputWire(compId, pin);
  if (wire) {
    const liveOutputs = components[wire.from.comp]?.outputs;
    if (liveOutputs)
      liveInputs[pin] = liveOutputs[wire.from.pin] ?? LogicValue.ZERO;
  }
}
```

**Revised:**

```typescript
// Read phase: build inputs from current committed state
for (let pin = 0; pin < def.inputs; pin += 1) {
  const wires = this.graph.getInputWires(compId, pin);

  if (wires.length === 0) continue; // unconnected → stays ZERO

  if (wires.length === 1) {
    // Single-driver (common path — unchanged behavior)
    const wire = wires[0];
    const liveOutputs = components[wire.from.comp]?.outputs;
    if (liveOutputs)
      liveInputs[pin] = liveOutputs[wire.from.pin] ?? LogicValue.ZERO;
  } else {
    // Multi-driver: resolve all sources
    const drivers: LogicValue[] = [];
    for (const wire of wires) {
      const src = components[wire.from.comp];
      drivers.push(src?.outputs[wire.from.pin] ?? LogicValue.HIGH_IMPEDANCE);
    }
    liveInputs[pin] = resolveSignal(drivers);
  }
}
```

### Why This Is Correct

1. **No mutation during propagation.** The resolved value is written into `liveInputs[]` — a local array that gets passed to `evaluate()`. The component's committed `comp.inputs` is only updated in the commit phase (after evaluation), exactly as today.

2. **Snapshot consistency preserved.** All components in a delta cycle read from committed outputs of other components. The multi-driver resolution reads those same committed outputs — just from multiple sources instead of one. Same consistency guarantee.

3. **Existing commit mechanism handles everything.** After evaluation:

   ```typescript
   components[compId] = {
     ...comp,
     inputs, // NEW inputs (including resolved multi-driver values)
     outputs: result.outputs,
     state: result.state ?? comp.state,
   };
   ```

   This is already the commit point. The resolved inputs are committed here alongside outputs and state. No new commit mechanism needed.

4. **Sequential snapshot also works.** The `snapshotInputs` path (for sequential components) would use the same multi-driver read logic but against the pre-propagation snapshot — same pattern as today, just reading from multiple wires.

### Scheduling Downstream from Multi-Driver Changes

When a component's output changes and that output fans out to multiple input pins (some of which are multi-driver), the existing scheduling works:

```typescript
if (outputChanged) {
  const downstream = this.getDownstreamCached(compId);
  for (const downId of downstream) nextDirty.add(downId);
}
```

`getDownstream()` already returns ALL components that have any wire from this component. If RAM.dOut[0] has wires going to both CPU.dIn[0] and DISPLAY.dIn[0], both CPU and DISPLAY are already in the downstream set. They get marked dirty, re-evaluated next delta, and their read phase resolves the multi-driver input correctly.

**No additional "net resolution" step. No mutation. No special scheduling.** The multi-driver resolution is entirely contained within the read phase.

### Impact Assessment

| Aspect                             | Change                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| Lines modified in propagation loop | ~10-15 (replace single-wire read with multi-wire read)                      |
| New behavior                       | Only for pins with `wires.length > 1` (zero overhead for existing circuits) |
| Commit semantics                   | Unchanged                                                                   |
| Snapshot consistency               | Unchanged                                                                   |
| Sequential isolation               | Unchanged                                                                   |
| Oscillation detection              | Unchanged                                                                   |

---

## 7. Topological Sort

### Recommendation (Unchanged from v1)

**Do not modify the topological sort at all.**

With the derived-net approach, there's even LESS reason to touch it:

- Multi-driver input wires create multiple upstream edges in the graph (A→C, B→C)
- This may create cycles if C also drives A or B (bidirectional bus)
- Cycle participants already get `MAX_SAFE_INTEGER` rank
- Delta-cycle convergence resolves them

The topological sort does the right thing already. Components with only standard wires are ordered correctly. Components involved in bidirectional buses (cycles) converge via iteration. No changes needed.

---

## 8. Component Model

### Recommendation: `bidirPorts` as UI-Only Metadata

```typescript
/**
 * Declares which pins render as bidirectional bus ports.
 * Used by:
 *   - UI: render combined port, draw bus-style wire
 *   - Connection validation: allow multi-driver wiring to these input pins
 * NOT used by:
 *   - evaluate()
 *   - SignalPropagator
 *   - Serialization
 */
bidirPorts?: Array<{
  outputPins: number[];  // which output pin indices drive this port
  inputPins: number[];   // which input pin indices read from this port
  label: string;         // "D[7:0]"
}>;
```

### How Connection Validation Uses It

```typescript
// In CircuitManager.addWire():
const existing = this.graph.getInputWires(toComp, toPin);
if (existing.length > 0) {
  // Pin already has a wire. Is this pin multi-driver capable?
  const def = this.library.get(this.components[toComp].type);
  const isMultiDriverPin = def.bidirPorts?.some((port) =>
    port.inputPins.includes(toPin),
  );
  if (!isMultiDriverPin) return null; // reject — standard pin
  // Allow — this pin accepts multiple drivers
}
```

This is the ONLY place the engine uses `bidirPorts`. Everything else (propagation, resolution, scheduling) works purely from wire connectivity.

---

## 9. RAM Implementation — Complete Walkthrough

### Setup

```
[BUS_INPUT "0xAB"] ──(out0..7)──→ RAM.input[4..11]   (data_in)
[RAM] output[0..7] ──→ CPU.input[4..11]              (data_out → CPU reads)
[CPU] output[0..7] ──→ RAM.input[4..11]              (cpu_out → RAM data_in, MULTI-DRIVER)
[TOGGLE "WE"] ──→ RAM.input[12]
```

Wait — let me use the Bus Hub pattern for clarity:

### Setup (Bus Hub Pattern)

```
                    ┌──────────┐
CPU.dOut[0..7] ──→ │ BUS_HUB  │ ──→ CPU.dIn[0..7]
RAM.dOut[0..7] ──→ │ (resolve) │ ──→ RAM.dIn[0..7]
                    └──────────┘

TOGGLE(WE) ──→ RAM.input[WE]
TOGGLE(ADDR) ──→ RAM.input[ADDR0..3]
```

BUS_HUB evaluate:

```typescript
evaluate: (inputs, state) => {
  // inputs[0..7] = CPU driver, inputs[8..15] = RAM driver
  const resolved: SignalValue[] = [];
  for (let bit = 0; bit < 8; bit++) {
    resolved.push(resolveSignal([inputs[bit], inputs[bit + 8]]));
  }
  // outputs[0..7] → CPU reads, outputs[8..15] → RAM reads
  return { outputs: [...resolved, ...resolved], state: null };
};
```

### OR: Direct Multi-Wire (2 Devices, No Hub)

```
CPU.dOut[0] ──wire A──→ RAM.dIn[0]     (CPU writes to RAM)
RAM.dOut[0] ──wire B──→ CPU.dIn[0]     (RAM writes to CPU)
```

Each input pin has exactly ONE wire. No multi-driver. Resolution is trivial:

- When CPU is writing: CPU.dOut = 0xAB → RAM.dIn reads 0xAB. RAM.dOut = Z → CPU.dIn reads Z (normalized to 0, but CPU ignores its input during write).
- When RAM is reading: RAM.dOut = memValue → CPU.dIn reads memValue. CPU.dOut = Z → RAM.dIn reads Z (but RAM ignores data_in during read).

For 2 devices: paired wires work perfectly. No multi-driver needed.

For 3+ devices: use Bus Hub OR multi-driver wires.

### Write Cycle (Direct Paired Wires, 2 Devices)

**Initial:** WE toggled HIGH. CPU.dOut driving 0xAB.

**Delta Cycle 1:**

1. TOGGLE(WE) output changes → RAM in dirty set

**Delta Cycle 2:** 2. RAM evaluated:

- WE = 1 → write mode
- Read dIn (wire A from CPU.dOut): value = 0xAB
- Store 0xAB to memory[addr]
- Output dOut = [Z,Z,Z,Z,Z,Z,Z,Z] (not driving — Hi-Z)
- Output changed? If it was already Z → no. If it was driving → yes.

3. If RAM output changed → CPU in dirty set (downstream of RAM)

**Delta Cycle 3 (if CPU re-evaluated):** 4. CPU reads dIn (wire B from RAM.dOut): value = Z → normalized to 0 5. CPU state unchanged → no output change → stable

**Stable.** 2-3 delta cycles.

### Read Cycle (Direct Paired Wires, 2 Devices)

**Initial:** WE toggled LOW.

**Delta Cycle 1:**

1. TOGGLE(WE) → RAM dirty

**Delta Cycle 2:** 2. RAM evaluated:

- WE = 0 → read mode
- Output dOut = memory[addr] = 0xAB
- Output changed (was Z, now 0xAB) → CPU dirty

**Delta Cycle 3:** 3. CPU evaluated:

- Reads dIn (wire B from RAM.dOut): value = 0xAB
- CPU now has data on its input → processes it

**Stable.** 3 delta cycles.

### Multi-Driver Case (3 Devices, Using Multi-Wire)

```
RAM.dOut[0] ──wire B──→ CPU.dIn[0]    (RAM drives CPU's input)
ROM.dOut[0] ──wire C──→ CPU.dIn[0]    (ROM drives CPU's input — MULTI-DRIVER)
```

CPU.dIn[0] has 2 input wires. During CPU's read phase:

```typescript
const drivers = [RAM.dOut[0], ROM.dOut[0]]; // e.g. [Z, 0xCD]
liveInputs[0] = resolveSignal(drivers); // resolveSignal([Z, 1]) = 1
```

If ROM is driving and RAM is Hi-Z: CPU reads ROM's value. Correct.
If both drive different values: `resolveSignal([0, 1]) = X`. Contention. Correct.

---

## 10. Performance — Realistic Estimates

### Change in Hot Path

The propagation inner loop change:

```typescript
// BEFORE (single wire):
const wire = this.graph.getInputWire(compId, pin);

// AFTER (possibly multiple wires):
const wires = this.graph.getInputWires(compId, pin);
if (wires.length === 1) {
  /* same as before */
} else if (wires.length > 1) {
  /* resolve */
}
```

### Cost of the Change

| Operation                | Before                    | After (single-driver pin)                | After (multi-driver pin)                    |
| ------------------------ | ------------------------- | ---------------------------------------- | ------------------------------------------- |
| Input read per pin       | 1 Map.get + 1 array index | 1 Map.get + length check + 1 array index | 1 Map.get + N array indexes + resolveSignal |
| Overhead for common case | —                         | +1 length check (~0.5ns)                 | N/A                                         |
| Multi-driver resolution  | N/A                       | N/A                                      | O(drivers) — drivers ≤ 10                   |

### Scaling

| Circuit                           | Extra cost per propagation pass       | Notes                    |
| --------------------------------- | ------------------------------------- | ------------------------ |
| 100 comps, 0 multi-driver pins    | ~50 extra length checks               | Negligible (~25ns total) |
| 500 comps, 10 multi-driver pins   | ~500 length checks + 10 resolutions   | Negligible               |
| 2000 comps, 100 multi-driver pins | ~2000 length checks + 100 resolutions | < 1% overhead            |

### Memory

| Change                                                           | Cost                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `inputWires: Map<string, Wire[]>` instead of `Map<string, Wire>` | Each entry is now an array (8 bytes overhead per pin for the array object). For 2000 pins: 16KB extra. Negligible. |

### Conclusion

Effectively zero performance impact for existing circuits. The array length check in the common path (length === 1) is branch-predicted and costs < 1ns per pin. Multi-driver resolution only activates for pins with multiple wires — a tiny fraction of total pins.

---

## 11. Missing Edge Cases

### 11.1 Overlapping Multi-Driver Groups

**Scenario:** Output pin A drives input pin X via wire 1. Output pin B also drives input pin X via wire 2. Now output pin C also wants to drive pin X.

**Handling:** Just add wire 3 from C to X. The `inputWires[X]` array now has length 3. Resolution considers all three. No special "merge" operation needed.

### 11.2 Bus Splitters on Multi-Driver Pins

**Scenario:** A DEBUS4 receives from a multi-driver pin.

**Solution:** DEBUS4's input pins have multiple wires feeding them. Its read phase resolves all drivers. Its evaluate function is unchanged — it just sees resolved input values. Zero special handling.

### 11.3 Partially Connected Buses

**Scenario:** 8-bit bus where only bits [0..3] are wired.

**Solution:** Bits [4..7] have no input wires → stay at ZERO (default). Correct behavior.

### 11.4 Custom Circuits Containing Bidirectional Components

**Scenario:** Custom circuit uses RAM internally.

**Solution:** The compiled sub-simulation includes all internal wires. Multi-driver pins within the sub-circuit are resolved normally during internal evaluation. No special handling — just wires.

### 11.5 Wire Deletion

**Scenario:** User deletes one of the wires feeding a multi-driver pin.

**Solution:** `removeWire()` removes the wire from `inputWires[pin]` array. Array shrinks. If length becomes 1, pin reverts to single-driver behavior. If length becomes 0, pin is disconnected. All automatic.

### 11.6 Undo/Redo

**Scenario:** User creates multi-driver connection, undoes.

**Solution:** Snapshot includes wires. Restore snapshot → wires restored → multi-driver state derived from wires. Completely automatic.

### 11.7 Copy/Paste

**Scenario:** Copy components with multi-driver connections.

**Solution:** Same as today — wires are copied if both endpoints are in selection. Multi-driver status is a consequence of which wires exist. Automatic.

### 11.8 Probes

**Scenario:** Probe a multi-driver bus.

**Solution:** Connect probe's input pin to the bus (add a wire from bus driver to probe input). If you want the probe to see the RESOLVED value, connect it as an additional reader on a multi-driver pin. Or better: connect it downstream of the bus hub.

### 11.9 Oscillating Bus

**Scenario:** Bus oscillates between drivers.

**Solution:** Existing oscillation detection. Pattern-based (period-2) and eval-count limit both trigger. The resolution value oscillates between states → detected as unstable.

### 11.10 Standard Output Driving a Multi-Driver Pin

**Scenario:** A regular AND gate output connected to a multi-driver pin alongside tri-state outputs.

**Solution:** The AND gate always drives (never Hi-Z). `resolveSignal([AND_output, tristate_output])` — if both drive, resolution follows the truth table. AND output "wins" over Hi-Z from disabled tri-states. If AND drives 0 and a tri-state drives 1: contention (X). Physically correct — don't connect non-tri-state outputs to shared buses.

### 11.11 `recomputeAll()` with Multi-Driver Pins

**Scenario:** Full recomputation after loading a circuit with multi-driver pins.

**Solution:** `readLiveInputs()` in `recomputeAll()` uses the same multi-wire read logic. The topological pass evaluates components. Each component's inputs are read (with resolution) from currently committed outputs of others. Iterates until stable. Works identically to single-driver case — just the read step consults multiple sources.

### 11.12 `reconcileOutputSinks()` with Multi-Driver Pins

**Scenario:** An output sink (LED) connected via multi-driver pin.

**Solution:** Same as non-sink. The `reconcileOutputSinks()` method rebuilds inputs for sinks — it would use the same `getInputWires()` + resolve pattern. Minimal change.

### 11.13 `buildInputs()` in CircuitManager

**Scenario:** `CircuitManager.buildInputs()` is called when a new wire is connected.

**Solution:** Update to use `getInputWires()` with resolution for multi-driver pins. Same pattern as in the propagator.

---

## 12. Implementation Roadmap

### Phase 0: Type Change in GraphManager (1 Hour)

**Goal:** Change `inputWires` type, preserve all existing behavior.

1. Change `private inputWires: Map<string, Wire>` to `private inputWires: Map<string, Wire[]>`
2. Update `addWire()`: push to array instead of set
3. Update `removeWire()`: splice from array instead of delete
4. Update `getInputWire()`: return `array[0] ?? null` (backward compatible)
5. Add `getInputWires()`: return full array
6. Add `isMultiDriver()`: return `array.length > 1`

**Files touched:** `GraphManager.ts`  
**Risk:** Low (mechanical refactor, behavior identical for length-1 arrays)  
**Compiles:** Yes  
**Tests pass:** Yes (all existing behavior preserved)

### Phase 1: Relax addWire Validation (30 Minutes)

**Goal:** Allow multiple wires to the same input pin for bidir-capable pins.

1. Add `bidirPorts` optional field to `ComponentDefinition` interface
2. In `CircuitManager.addWire()`: check `bidirPorts` before rejecting duplicate input wires

**Files touched:** `types.ts` (or component definition site), `CircuitManager.ts`  
**Risk:** Low  
**Compiles:** Yes  
**Tests pass:** Yes (existing validation unchanged for standard pins)

### Phase 2: Multi-Driver Read in Propagator (1-2 Hours)

**Goal:** Propagator resolves multi-driver pins during read phase.

1. In `SignalPropagator.propagate()` inner loop: replace single-wire read with multi-wire read + resolveSignal
2. Same change in `readLiveInputs()` helper
3. Same change in `recomputeAll()`

**Files touched:** `SignalPropagator.ts`  
**Risk:** Medium (hot path change, but guarded by length check)  
**Compiles:** Yes  
**Tests pass:** Yes (length-1 path is identical to before)

### Phase 3: Update CircuitManager Helpers (1 Hour)

**Goal:** `buildInputs()` and `reconcileOutputSinks()` handle multi-driver.

1. Update `buildInputs()` to use `getInputWires()` + resolve
2. Update `SimulationEngine.reconcileOutputSinks()` similarly

**Files touched:** `CircuitManager.ts`, `SimulationEngine.ts`  
**Risk:** Low  
**Compiles:** Yes

### Phase 4: RAM Component (Half Day)

**Goal:** First bidirectional component.

1. Add `evalRam16x8()` to `logic.ts`
2. Register in `ComponentLibrary` with `bidirPorts` metadata
3. Add constants

**Files touched:** `logic.ts`, `ComponentLibrary.ts`, `constants.ts`  
**Risk:** Low (additive)

### Phase 5: Bus Hub Component (Half Day)

**Goal:** Junction component for 3+ device buses.

1. Add `evalBusHub` to `logic.ts` — resolves N inputs, outputs resolved value to N outputs
2. Register with appropriate pin counts and category

**Files touched:** `logic.ts`, `ComponentLibrary.ts`, `constants.ts`  
**Risk:** Low (additive)

### Phase 6: UI Integration (2-3 Days)

**Goal:** Visual support for bidirectional ports and bus connections.

1. Render `bidirPorts` pins with distinct style
2. Connection validation: allow wiring to multi-driver pins
3. Visual bus wire rendering (thicker/colored)
4. Contention indicator (X on resolved bus)

**Files touched:** UI components  
**Risk:** Low (isolated)

### Total Estimated Time: 4-6 Working Days

(Down from 8-12 in v1 — because we eliminated all net storage, net CRUD, net serialization, net migration, net undo/redo handling)

---

## 13. Final Self-Review (v2)

### Things I Would Keep

1. **Bidirectional = paired unidirectional pins + resolution.** Still the correct fundamental insight.

2. **Using existing `resolveSignal()`.** No new resolution logic needed.

3. **Zero impact on existing components.** Non-negotiable. Achieved by array length check in hot path.

4. **No topological sort changes.** Confirmed correct in both v1 and v2.

5. **`bidirPorts` as UI-only metadata.** Clean separation of concerns.

6. **Read/Evaluate/Commit preserved.** Resolution happens in the read phase, not as a side-effect during commit.

### Things I Simplified (v1 → v2)

1. **Eliminated all net storage.** No `createNet()`, no `addToNet()`, no `removeFromNet()`, no net map, no pinToNet map. Topology derived from wires.

2. **Eliminated net serialization.** No `nets` field in snapshots. No version migration. Wires are the truth.

3. **Eliminated net CRUD in CircuitManager.** No new public API beyond the existing `addWire()`/`removeWire()`.

4. **Eliminated direct input mutation.** Resolution moved to read phase, respecting existing commit semantics.

5. **Replaced junction complexity with Bus Hub component.** Junction is just a component. No special graph concept.

### Things I Redesigned (v1 → v2)

1. **GraphManager type change** (`Wire` → `Wire[]`) instead of adding net infrastructure. This is ~30 lines of mechanical refactoring vs ~120 lines of new net CRUD + coordination.

2. **Multi-driver resolution in read phase** instead of post-evaluation pass. Respects snapshot consistency. Zero new commit mechanisms.

3. **Bus Hub component** for N-device junctions instead of N² wires or a special junction concept. Scales linearly. Is just a component — no engine concept needed.

4. **No serialization changes.** Not even a version bump. Wire format is unchanged. Multi-driver capability is a runtime behavior enabled by the relaxed `addWire()` validation.

---

## Summary: Total Engine Changes (Superseded — see Section 16 for final summary)

---

## 14. Routing Interaction

### The Question

```
move component
    ↓
wire rerouted (visual path changes)
    ↓
still same net?
```

### The Answer: Yes, Always

In this architecture, a wire's identity is its `from` and `to` pin references — NOT its visual path. Moving a component changes its `x, y` coordinates. The UI re-draws the wire's visual path to follow the new positions. But the wire object in GraphManager is unchanged:

```typescript
// Before move:
wire: { id: "w1", from: { comp: "cpu", pin: 0 }, to: { comp: "ram", pin: 4 } }

// After move:
wire: { id: "w1", from: { comp: "cpu", pin: 0 }, to: { comp: "ram", pin: 4 } }
// Identical. Only the visual rendering recalculates the path.
```

The multi-driver relationship is derived from which wires exist, not from geometry. Therefore:

- **Moving a component:** Multi-driver status unchanged. Wires unchanged. Only visual path recalculated.
- **Re-routing a wire (visual drag of waypoints):** Multi-driver status unchanged. Wire `from`/`to` unchanged.
- **Auto-layout / rearrange all:** Multi-driver status unchanged. All wires still connect the same pins.

**Explicit guarantee:** No user action that changes only positions or visual routing can ever create, destroy, or modify multi-driver relationships. Only adding/removing wires (which changes `from`/`to` connectivity) affects them.

---

## 15. Transactions and Undo Granularity

### The Requirement

```
connect wire A
    ↓
connect wire B
    ↓
connect wire C
    ↓
undo → all three removed (one undo step)
```

### How This Works with Existing Transaction System

The `CircuitManager` already supports transactions:

```typescript
manager.beginTransaction();
manager.addWire(cpu, 0, ram, 4); // wire A
manager.addWire(ram, 0, cpu, 4); // wire B
manager.addWire(rom, 0, cpu, 4); // wire C (multi-driver on cpu.in[4])
manager.commitTransaction();
```

On commit:

1. All three wires are in GraphManager
2. A single `recomputeAll()` runs (not three separate propagations)
3. A single `SNAPSHOT_CHANGED` event fires
4. ProjectManager records ONE history entry

Undo restores the snapshot from before the transaction → all three wires gone in one step.

### UI-Level Transaction Examples

**Example 1: User connects a bidirectional port (auto-creates paired wires)**

When the user drags from CPU's bidir "D[7:0]" port to RAM's bidir "D[7:0]" port, the UI creates paired wires inside a transaction:

```typescript
manager.beginTransaction();
// CPU → RAM direction (8 wires)
for (let bit = 0; bit < 8; bit++) {
  manager.addWire(cpu, outputBase + bit, ram, inputBase + bit);
}
// RAM → CPU direction (8 wires)
for (let bit = 0; bit < 8; bit++) {
  manager.addWire(ram, outputBase + bit, cpu, inputBase + bit);
}
manager.commitTransaction();
projectManager.push(); // one undo point
```

One user action ("connect bus") → one undo step removes all 16 wires.

**Example 2: User connects third device to existing bus via Bus Hub**

```typescript
manager.beginTransaction();
// Wire ROM outputs to hub inputs
for (let bit = 0; bit < 8; bit++) {
  manager.addWire(rom, outputBase + bit, hub, romInputBase + bit);
}
// Wire hub outputs to ROM inputs
for (let bit = 0; bit < 8; bit++) {
  manager.addWire(hub, romOutputBase + bit, rom, inputBase + bit);
}
manager.commitTransaction();
projectManager.push();
```

One undo step disconnects ROM from the bus entirely.

**Example 3: User connects via direct multi-driver wires (no hub)**

```typescript
manager.beginTransaction();
// ROM → CPU direction (ROM can drive CPU's multi-driver input pins)
for (let bit = 0; bit < 8; bit++) {
  manager.addWire(rom, outputBase + bit, cpu, inputBase + bit);
  // cpu.inputBase pins already have wires from RAM — now they have 2 drivers each
}
manager.commitTransaction();
projectManager.push();
```

One undo step removes ROM's connection to the bus.

**Example 4: Multi-delete (user selects and deletes a bus-connected component)**

```typescript
manager.beginTransaction();
manager.removeComponent(ramId); // internally removes ALL wires to/from RAM
manager.commitTransaction();
projectManager.push();
```

RAM removed + all its bus wires removed + multi-driver arrays shrink — one undo step restores everything.

### Key Principle

Every user-visible action that creates/destroys bus connectivity MUST be wrapped in a single transaction by the UI layer. The undo system sees only transaction boundaries — individual wire adds within a transaction are invisible to the undo stack.

---

## 16. Fundamental Design Principle — User Mental Model

### Requirement (Explicit and Non-Negotiable)

> **The user NEVER manually creates or deletes a "net" or "bus" object.**
> **There IS no net object.**
> **The user's mental model is "connecting wires."**
> **The editor automatically handles all multi-driver relationships based on wire connectivity.**
> **Bus behavior emerges from the wires the user creates — nothing more.**

### What This Means Concretely

| User Action                                | What Happens Internally                                       | User Sees                           |
| ------------------------------------------ | ------------------------------------------------------------- | ----------------------------------- |
| Drag from bidir port A to bidir port B     | UI creates paired wires in a transaction                      | A bus line appears between A and B  |
| Drag from bidir port C to existing bus hub | UI creates wires to/from the hub in a transaction             | C joins the bus visually            |
| Delete a bus wire                          | Wire removed from GraphManager. `inputWires[]` array shrinks. | Device disconnected from bus        |
| Delete a bus-connected component           | All its wires removed (existing behavior). Arrays shrink.     | Component and connections disappear |
| Move a component                           | Nothing changes in connectivity                               | Bus line re-routes visually         |
| Undo bus connection                        | Snapshot restored → wires restored → multi-driver restored    | Previous state                      |

### What the User NEVER Does

- Never creates a "net" or "bus" object
- Never names a net
- Never sees a net ID
- Never manages net membership
- Never "adds to net" or "removes from net"
- Never encounters a net in any UI, property panel, or menu
- Never has to think about nets at all

### What the Editor Does Automatically

The editor's connection logic (the UI layer handling drag-and-drop wire creation) is responsible for:

1. **Detecting bidir-to-bidir connections:** When the user drags from a `bidirPorts` port to another `bidirPorts` port, the editor creates PAIRED wires (both directions) in a single transaction. The user drags one line; the system creates the bidirectional link.

2. **Detecting connection to Bus Hub:** When the user drags from a bidir port to a Bus Hub component, the editor creates the appropriate wires (device output → hub input, hub output → device input) in a transaction.

3. **Grouping into transactions:** All wires created by a single user gesture are wrapped in one transaction → one undo step. The user never has to know that 16 individual wires were created for an 8-bit bus connection.

4. **Removing cleanly:** When the user deletes a "bus connection" (visually: the thick bus line between two ports), the editor removes all paired wires for that device in one transaction. One undo step restores them all.

### Implementation Note

The `bidirPorts` metadata serves exactly two purposes:

1. **UI rendering:** Draw combined bidir ports instead of separate input/output pins
2. **Editor automation:** When the user connects two bidir ports, the editor knows to create paired bidirectional wires (both directions) rather than a single unidirectional wire

The engine itself has no concept of "bidirectional" or "net" or "bus." It simply:

- Stores wires (directed, from output pin to input pin)
- Allows multiple wires to arrive at the same input pin (if flagged by `bidirPorts`)
- Resolves multi-driver pins using `resolveSignal()` during the read phase
- Propagates as usual

Everything else — the "bus" appearance, the "junction" visual, the "bidirectional port" — is UI sugar built on top of standard directed wires.

---

## Summary: Total Engine Changes (Final)

| File                  | Change                                                                              | Lines          |
| --------------------- | ----------------------------------------------------------------------------------- | -------------- |
| `GraphManager.ts`     | `inputWires` type `Wire` → `Wire[]`, add `getInputWires()`, `isMultiDriver()`       | ~30            |
| `CircuitManager.ts`   | Relax `addWire()` validation for bidir pins, update `buildInputs()`                 | ~20            |
| `SignalPropagator.ts` | Multi-wire read + resolve in read phase (propagate + recomputeAll + readLiveInputs) | ~30            |
| `SimulationEngine.ts` | Update `reconcileOutputSinks()` for multi-driver                                    | ~10            |
| `types.ts`            | Add optional `bidirPorts` to `ComponentDefinition`                                  | ~8             |
| `logic.ts`            | Add `evalRam16x8`, `evalBusHub`                                                     | ~80            |
| `ComponentLibrary.ts` | Register RAM, Bus Hub                                                               | ~40            |
| `constants.ts`        | Add gate type constants                                                             | ~5             |
| **Total engine**      |                                                                                     | **~225 lines** |

UI layer (editor connection logic, bidir port rendering, bus wire styling) is additional but fully isolated from the simulation engine.

**Guarantees:**

- Single source of truth (wires only)
- No stored net/bus objects anywhere
- No serialization changes, no version migration
- Read/Evaluate/Commit semantics fully preserved
- User never manages nets — they just connect wires
- Full backward compatibility for all existing circuits
- Zero performance overhead for circuits without multi-driver pins

---

---

## 17. Net Data Structure Design

### Context

The previous sections established that net objects are NOT stored as persistent state — they are derived from wire connectivity. However, during simulation the propagation engine still needs a **runtime representation** of multi-driver groups to efficiently resolve signals. This section defines that internal runtime structure.

A Net is an internal runtime object. It is never serialized. It is never exposed to the user. It is never edited directly. It exists solely to answer one question efficiently during propagation:

> Which pins are electrically connected together on this shared bus?

---

### Design Goals

- Keep the Net as simple as possible
- Represent electrical connectivity only
- Must NOT contain simulation logic
- Must NOT contain UI or routing information
- Must NOT duplicate state that already exists elsewhere
- Support efficient propagation (nets resolved frequently during simulation)

---

### Responsibilities

A Net answers ONE question:

> Which output pins drive this shared connection, and which input pins read from it?

It does NOT:

- Evaluate signals (that's `resolveSignal()` in `logic.ts`)
- Own component state (that's `ComponentInstance`)
- Track dirty status (that's `SignalPropagator`'s dirty set)
- Store resolved values (that's computed fresh each read phase)
- Know about rendering (that's the UI layer)

---

### Required Fields

#### `id: string`

Unique identifier for this net instance. Used for internal lookups only. Never shown to user. Could be auto-generated from connected pin keys or a UUID.

**Justification:** Needed for O(1) lookup when the propagator needs to identify which net a pin belongs to. Without an ID, every resolution would require scanning all nets.

#### `width: number`

Bus width in bits. All pins on this net must carry signals of this width.

**Justification:** Determines how many parallel `resolveSignal()` calls are needed. Allows early validation that all connected pins have compatible widths. A 4-bit output cannot drive an 8-bit bus — this catches wiring errors at connection time rather than producing silent corruption during simulation.

#### `drivers: NetPinRef[]`

Array of output pins that can drive this net. Each driver contributes a signal value (or HIGH_IMPEDANCE when not driving).

**Justification:** During resolution, the propagator iterates this array, collects each driver's current output value, and calls `resolveSignal()`. Must be a flat array for cache-friendly iteration.

#### `readers: NetPinRef[]`

Array of input pins that read the resolved net value. After resolution, the resolved value is distributed to all readers.

**Justification:** After resolving the net, the propagator needs to know which components to update and which input pins to write to. Separating readers from drivers avoids unnecessary iteration.

---

### Pin Reference Structure

```typescript
/**
 * References a specific pin on a specific component.
 * Used within Net to identify connected pins.
 */
interface NetPinRef {
  /** Component instance ID */
  comp: string;
  /** Pin index (0-based) */
  pin: number;
}
```

#### Why Only Two Fields

| Rejected Field             | Why Excluded                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `direction: 'in' \| 'out'` | Already implied by which array the ref is in (drivers vs readers)                            |
| `bitOffset: number`        | Not needed — pin index already maps to a specific bit within the component's pin array       |
| `componentType: string`    | Can be looked up from the component map if ever needed. Don't duplicate.                     |
| `signalValue: SignalValue` | This is runtime state owned by `ComponentInstance.outputs[]`. Never duplicate signal values. |
| `netId: string`            | The ref is already contained within a Net — circular reference adds nothing.                 |
| `label: string`            | UI concern. Not the net's job.                                                               |

---

### Explicitly Excluded from Net

The following are intentionally NOT stored in the Net object:

| Excluded Field                | Reason                                                          | Where It Actually Lives                 |
| ----------------------------- | --------------------------------------------------------------- | --------------------------------------- |
| Current resolved signal value | Computed fresh each read phase — caching risks staleness        | Computed inline in `SignalPropagator`   |
| Cached driver values          | Driver outputs change every delta cycle — cache is always stale | `ComponentInstance.outputs[]`           |
| Cached reader values          | Same — stale immediately                                        | `ComponentInstance.inputs[]`            |
| Dirty flag                    | Net doesn't know if it's dirty — the propagator does            | `SignalPropagator`'s dirty set          |
| Pending values                | Violates read/evaluate/commit by introducing a buffer           | Propagator's local `liveInputs[]` array |
| Simulation state              | Nets have no state — they're passive connections                | `ComponentInstance.state`               |
| Wire routing info             | Visual path is irrelevant to resolution                         | UI rendering layer                      |
| Junction geometry             | Visual only                                                     | UI layer                                |
| Wire segments                 | Nets don't own wires — wires define nets                        | `GraphManager.wires`                    |
| Screen coordinates            | Rendering concern                                               | Component `x, y` and UI layout          |
| UI state (selected, hovered)  | Not the engine's job                                            | UI component state                      |
| Connection validation         | Done at `addWire()` time, not stored                            | `CircuitManager.addWire()`              |

---

### Width Determination

#### How Width Is Determined

Width is determined at net construction time from the `bidirPorts` metadata of the first component added to the net:

```typescript
// Example: RAM has bidirPorts: [{ outputPins: [0..7], inputPins: [4..11], label: "D[7:0]" }]
// Width = outputPins.length = 8
```

For the Bus Hub pattern: the hub's definition specifies its width (e.g., 8-bit hub, 16-bit hub).

For direct multi-driver: width = 1 per pin (each pin is an independent 1-bit net). An 8-bit bus is 8 separate single-bit nets, one per pin pair.

#### When Width Is Validated

At **wire creation time** (`addWire()`). If a wire would connect an output pin to an input pin on a net with incompatible width, the wire is rejected. This is a connection validation check — the same place that already rejects self-connections and duplicate input wires.

#### What Happens When Widths Differ

The wire is NOT created. `addWire()` returns `null`. The UI shows a connection error ("incompatible bus width"). This is identical to how the current system rejects invalid connections.

#### Can Width Change After Creation

**No.** Width is immutable. If the user wants a different width, they must disconnect and reconnect with a different bus configuration. This prevents partial-width corruption during simulation.

In practice, width is implicit in the wiring structure. A "4-bit bus" is just 4 wires to 4 input pins. An "8-bit bus" is 8 wires. Width changing would mean adding/removing wires — which is already handled by normal wire add/remove operations.

---

### Pin Membership Rules

#### Can a pin belong to multiple nets?

**No.** Each pin can be on at most one net. Physically, a wire is either connected to this bus or that bus — not both simultaneously. If the user tries to connect a pin that's already on net A to net B, the correct behavior depends on context:

- If it's direct multi-driver wires: the pin already has input wires. Adding another just extends the `inputWires[]` array. There's no explicit "net" to conflict with.
- If using Bus Hub: connect to the hub. One hub per bus. No conflict possible.

In the derived-net model (nets from wires), this constraint is naturally satisfied: a pin's "net membership" IS its set of input wires. There's no separate net object to have conflicts with.

#### Can duplicate pins exist?

**No.** Adding the same wire twice is already rejected by `addWire()` (wire with same `from`/`to` already exists check). Duplicate pin refs in a runtime Net would mean duplicate wires exist — which is prevented at the API level.

#### Can the same component contribute both drivers and readers?

**Yes.** This is the normal case for bidirectional components. RAM has output pins (drivers when reading memory) and input pins (readers when writing memory) on the same net. The component appears in both `drivers[]` and `readers[]` but with different pin indices.

#### How are bidirectional ports represented?

A bidirectional port on component X is represented as:

- `drivers`: includes `{ comp: X, pin: outputPin }` for each output pin in the bidir group
- `readers`: includes `{ comp: X, pin: inputPin }` for each input pin in the bidir group

The same component, different pins, different roles. No special "bidir" pin type needed.

#### Partially connected buses

If only pins [0..3] of an 8-bit bidir port are wired:

- Only those 4 pins appear in the net (4 driver refs + 4 reader refs)
- Pins [4..7] are not on any net — they behave as standard disconnected pins (default to ZERO)
- This is not an error — it's a valid partial connection

---

### Runtime Performance — Structure Comparison

#### Option A: Separate `drivers[]` and `readers[]`

```typescript
interface Net {
  id: string;
  width: number;
  drivers: NetPinRef[];
  readers: NetPinRef[];
}
```

**Resolution operation:**

```typescript
for each bit b in [0..width):
    values = drivers.map(d => components[d.comp].outputs[d.pin + b])
    resolved[b] = resolveSignal(values)
for each reader r in readers:
    components[r.comp].inputs[r.pin + b] = resolved[b]  // (via read phase, not direct mutation)
```

**Complexity:** O(drivers × width) for resolution + O(readers × width) for distribution  
**Memory:** Two arrays, each with N refs (N ≤ 10 typically)  
**Cache behavior:** Sequential array iteration — excellent cache locality

#### Option B: Single `endpoints[]` with role tag

```typescript
interface Net {
  id: string;
  width: number;
  endpoints: Array<NetPinRef & { role: "driver" | "reader" }>;
}
```

**Resolution operation:** Must filter array by role on every resolution  
**Complexity:** O(all endpoints) filtering + same resolution cost  
**Memory:** One array, same total refs  
**Cache behavior:** Slightly worse — interleaved roles means branching during iteration

**Verdict:** Worse. Filtering costs cycles on every propagation pass. Pre-separating drivers from readers avoids per-pass filtering.

#### Option C: Indexed by component

```typescript
interface Net {
  id: string;
  width: number;
  members: Map<string, { driverPins: number[]; readerPins: number[] }>;
}
```

**Resolution operation:** Iterate map values, for each member collect driver pin outputs  
**Complexity:** O(members × pins per member × width)  
**Memory:** Higher — Map overhead per member  
**Cache behavior:** Map iteration is less cache-friendly than array

**Verdict:** Worse. Map lookup overhead adds nothing. The propagator doesn't need per-component grouping — it needs all drivers in one pass and all readers in one pass.

#### Recommendation: **Option A — Separate `drivers[]` and `readers[]`**

This is the simplest and fastest. The resolution operation iterates `drivers` once (collect values) then iterates `readers` once (distribute). No filtering, no map lookups, pure sequential array access.

For the typical case (2-4 drivers, 2-4 readers, 8-bit width): resolution is ~64-128 array accesses + 8 `resolveSignal()` calls. Sub-microsecond.

---

### Ownership

#### Recommendation: **GraphManager owns Net instances**

Justification:

1. **GraphManager already owns topology.** Wires represent connectivity. Nets represent shared connectivity. Same domain.

2. **Lifecycle is tied to wire operations.** Nets are constructed/destroyed when wires are added/removed. GraphManager already handles wire lifecycle.

3. **Propagator queries GraphManager.** The propagator already depends on GraphManager for `getInputWire()`, `getDownstream()`, etc. Adding net queries (`getNetForPin()`, `getNetDrivers()`) to the same dependency is natural.

4. **No new dependencies.** CircuitManager owns GraphManager. SignalPropagator receives GraphManager as a constructor argument. Both already have access. No wiring changes.

5. **Cache invalidation is unified.** GraphManager already calls `invalidate()` on structural changes. Net cache (if ever added) invalidates through the same path.

#### How Nets Are Constructed

In the derived-net model, the runtime Net objects are **built lazily or eagerly** from the `inputWires` arrays:

```typescript
// In GraphManager or a utility called by the propagator:
buildNets(): Net[] {
  const nets: Net[] = [];
  for (const [pinKey, wires] of this.inputWires) {
    if (wires.length <= 1) continue;  // not multi-driver
    // This pin has multiple input wires → it's part of a multi-driver group
    const [compId, pinStr] = pinKey.split(KEY_SEPARATOR);
    const pin = parseInt(pinStr);
    nets.push({
      id: pinKey,  // use pin key as net ID (unique per multi-driver pin)
      width: 1,    // each pin is 1-bit; the "bus" is just multiple 1-bit nets
      drivers: wires.map(w => ({ comp: w.from.comp, pin: w.from.pin })),
      readers: [{ comp: compId, pin }],
    });
  }
  return nets;
}
```

**Key insight:** In the pure derived-wire model, each multi-driver INPUT PIN is its own 1-bit "net." An 8-bit bus is 8 independent 1-bit nets (8 input pins, each with multiple wires). This is simpler and avoids width-matching complexity entirely.

For the Bus Hub pattern: there are no multi-driver pins at all. The hub is a standard component with single-driver inputs and outputs. No Net object needed.

**This means:** In the simplest implementation, Net objects may not even need to be explicitly constructed. The propagator can detect multi-driver pins inline during the read phase (`wires.length > 1`) and resolve on the spot. The "Net" is conceptual, not a materialized data structure.

---

### Validation Invariants

The following must always hold for any multi-driver pin group (conceptual "net"):

1. **Every driver wire connects an existing component's output pin.** If a component is deleted, its wires are removed first (existing behavior).

2. **Every reader is an existing component with a valid pin index.** Same guarantee from existing wire validation.

3. **No duplicate wires.** `addWire()` already prevents creating the same wire twice.

4. **Every referenced component exists in the circuit.** Guaranteed by `addWire()` validation (checks both `fromComp` and `toComp` exist).

5. **Every referenced pin index is within bounds.** Validated at `addWire()` time against the component definition's pin count.

6. **Multi-driver pins are explicitly allowed.** Only pins on components with `bidirPorts` metadata (or Bus Hub inputs) accept multiple input wires. Standard pins reject the second wire.

7. **No circular single-pin dependency.** A component cannot have its own output wire back to its own input (self-connection rejected by existing `addWire()` validation: `if (fromComp === toComp) return null`).

---

### Serialization

#### Recommendation: **Nets are NEVER serialized. Reconstructed from wires on load.**

| Approach            | Pros                                                                            | Cons                                                                                            |
| ------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Serialize nets      | Faster load (skip reconstruction)                                               | Two sources of truth. Divergence risk. Must maintain compatibility. Must version. Must migrate. |
| Reconstruct on load | Single source of truth. Zero divergence. Zero migration. Wire format unchanged. | Must rebuild on load (~O(wires) scan).                                                          |

**Reconstruction cost on load:** Iterate all wires once, check which input pins have multiple wires. For 10,000 wires: <1ms. Negligible compared to `recomputeAll()` which already runs on load.

**Recommendation: Never serialize.** The cost of reconstruction is trivial. The benefit of single-source-of-truth is enormous.

---

### Final TypeScript Interfaces

```typescript
/**
 * References a specific pin on a specific component within a Net.
 * Minimal structure — contains only what's needed for resolution lookups.
 */
export interface NetPinRef {
  /** Component instance ID */
  readonly comp: string;
  /** Pin index (0-based, relative to the component's input or output array) */
  readonly pin: number;
}

/**
 * Runtime representation of a shared electrical connection (multi-driver bus).
 *
 * INTERNAL ONLY — never serialized, never exposed to UI, never shown to user.
 * Constructed at runtime from wire connectivity in GraphManager.
 * Used by SignalPropagator during the read phase to resolve multi-driver pins.
 *
 * Design principles:
 *   - Contains connectivity information ONLY
 *   - No simulation state (no cached values, no dirty flags)
 *   - No UI state (no coordinates, no rendering hints)
 *   - No duplicated state (signal values live in ComponentInstance)
 *   - Immutable once constructed (rebuilt on topology change)
 */
export interface Net {
  /**
   * Unique identifier for this net.
   * Derived from the input pin key (e.g., "comp-id:pinIndex").
   * Used for internal lookups only. Never shown to user.
   */
  readonly id: string;

  /**
   * Bus width in bits.
   * For the derived-wire model where each pin is independent: always 1.
   * For the Bus Hub model: matches the hub's per-device port width.
   * Determines how many resolveSignal() calls are needed per resolution.
   */
  readonly width: number;

  /**
   * Output pins that can drive this net.
   * During resolution, each driver's current output value is collected.
   * Typical count: 2-4 drivers per net (e.g., CPU + RAM + ROM on shared bus).
   * Ordered by insertion order (deterministic iteration).
   */
  readonly drivers: readonly NetPinRef[];

  /**
   * Input pins that read the resolved net value.
   * After resolution, the resolved value is fed to all readers during the read phase.
   * Typical count: 1-4 readers per net.
   * Ordered by insertion order (deterministic iteration).
   */
  readonly readers: readonly NetPinRef[];
}
```

### Field Justification Summary

| Field     | Why Included                                                                   | What Happens Without It                                           |
| --------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `id`      | O(1) lookup from pin → net. Without it, must scan all nets.                    | Linear scan per pin per delta cycle — unacceptable                |
| `width`   | Determines resolution loop bound. Enables width validation at connection time. | Must infer width from pin metadata on every resolution — wasteful |
| `drivers` | Direct iteration for signal collection. No filtering needed.                   | Must scan all endpoints and filter by role — extra branching      |
| `readers` | Direct iteration for value distribution. No filtering needed.                  | Same — must filter combined list                                  |

### Why Nothing Else Is Needed

Every other conceivable field either:

1. **Duplicates state** that already lives in `ComponentInstance` (signal values, component state)
2. **Belongs to a different layer** (UI rendering, wire routing, connection validation)
3. **Is computed fresh each pass** and would be stale if cached (resolved values, dirty status)
4. **Adds complexity without improving performance** (nested Maps, indices, back-references)

The Net is a pure, minimal, read-only connectivity descriptor. It contains exactly what the propagation engine needs to resolve multi-driver pins — nothing more.

---

_End of Design Review v2.1_
