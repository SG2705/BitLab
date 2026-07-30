# BitLab

A digital logic circuit designer built on an infinite canvas. Place components, wire them together, and simulate in real time — with a waveform probe that tracks signal timing across clock cycles.

## Features

- **Infinite canvas** — pan, zoom, and snap-to-grid placement
- **Real-time simulation** — run, pause, step, and reset the circuit clock
- **Waveform probe** — time-mapped signal display with a running clock-cycle x-axis; multiple probes share the same tick scale for side-by-side timing comparison
- **Custom gates** — compose any sub-circuit into a reusable black-box component
- **Bus system** — group 4/8/16 wires into a single visual connection with bitwise logic
- **Wire routing** — Bezier, orthogonal, and A*-optimized obstacle-avoiding paths
- **Undo / Redo** — full history for every edit action (up to 100 states)
- **Save / Load** — export and import circuits as JSON; persists to localStorage
- **Light and dark themes**
- **i18n ready** — string catalogue managed with react-intl / FormatJS

## How to Use

### Quick Start

1. **Add components** — Drag gates from the Category Panel (left sidebar) onto the canvas
2. **Connect wires** — Click and drag from an output pin (right side) to an input pin (left side)
3. **Interact** — Click Toggle switches or hold Buttons to drive signals
4. **Simulate** — Press Play to start the clock; sequential circuits advance on each tick
5. **Observe** — Add LED outputs or Probes to see signal states and waveforms

### Building a Simple Circuit

```
1. Drag two Toggle inputs onto the canvas
2. Drag an AND gate onto the canvas
3. Wire each Toggle output → AND gate inputs
4. Drag an LED and wire the AND output → LED input
5. Click the Toggles to flip them — the LED lights when both are HIGH
```

### Creating Custom Components

1. Build a circuit with input sources (Toggle, Button, Clock) and output sinks (LED)
2. Label your inputs/outputs (these become pin names on the custom chip)
3. Click the Package icon in the top bar
4. Name your circuit — it appears in the Custom category for reuse

### Keyboard Shortcuts

| Shortcut           | Action               |
| ------------------ | -------------------- |
| ⌘K / Ctrl+K        | Command Palette      |
| ⌘Z / Ctrl+Z        | Undo                 |
| ⌘Shift+Z / Ctrl+Y  | Redo                 |
| ⌘D / Ctrl+D        | Duplicate            |
| ⌘S / Ctrl+S        | Save to localStorage |
| ⌘A / Ctrl+A        | Select all           |
| Delete / Backspace | Delete selected      |
| Space (hold)       | Pan tool             |

## Component Library

| Category    | Components                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Logic Gates | AND, OR, XOR, XNOR, NAND, NOR, NOT, Buffer (2/3/4/8/16-input variants, Ctrl AND)                                    |
| Inputs      | Toggle, Button, Constant, Clock, Digit→Binary, VCC, GND, Bus Input 4/8/16                                           |
| Outputs     | LED, 7-Segment Display, Signal Probe, Bus Display 4/8/16                                                            |
| Sequential  | SR Latch, D Latch, D Flip-Flop, JK Flip-Flop, T Flip-Flop, Register 4, Counter 4, Shift Register 4                  |
| Arithmetic  | Half/Full Adder, Half/Full Subtractor, MUX 2/4/8, Demux 1:2, Decoder 2:4/3:8, Encoder 4:2, Comparator, Comparator 4 |
| Bus         | Bus/Debus 4/8/16, Bus AND/OR/NOT 4/8/16                                                                             |
| Utility     | Splitter, Comment, Broadcaster, Receiver, U-Reg 4/8                                                                 |
| Custom      | Any sub-circuit saved as a reusable gate                                                                            |

## Simulation Engine

The engine is UI-agnostic and operates on a zero-delay, tick-based model:

- **Dirty-set propagation** — only re-evaluates components whose inputs actually changed, sorted by topological rank for deterministic ordering
- **Topological sort** — Kahn's algorithm computes evaluation order; cached and invalidated only on structural changes (add/remove nodes or wires)
- **Non-blocking assignment semantics** — sequential gates (flip-flops, latches) read a pre-clock-edge input snapshot so chained registers advance correctly on the same clock edge
- **Oscillation guard** — propagation halts after 64 evaluations per component per pass and emits an `OSCILLATION` event
- **Exception isolation** — faulted components are skipped without crashing the simulation
- **Tick context** — the engine tick counter is threaded through every `evaluate()` call; the Probe uses it to timestamp samples for time-accurate waveform rendering

### Signal Model

| State       | Meaning              | Wire Color |
| ----------- | -------------------- | ---------- |
| LOW (0)     | No voltage           | Gray       |
| HIGH (1)    | Voltage present      | Cyan/Green |
| UNKNOWN (X) | Indeterminate        | Yellow     |
| HIGH-Z (Z)  | No driver (floating) | Purple     |

## Stack

| Layer         | Library                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| Framework     | [React 19](https://react.dev) + [Vite](https://vitejs.dev)                |
| Routing       | [TanStack Router](https://tanstack.com/router)                            |
| Styling       | [Tailwind CSS v4](https://tailwindcss.com)                                |
| UI Primitives | [Radix UI](https://www.radix-ui.com) + [Lucide](https://lucide.dev) icons |
| i18n          | [react-intl / FormatJS](https://formatjs.io)                              |
| Language      | TypeScript 5                                                              |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Start development server                                   |
| `npm run build`        | Production build                                           |
| `npm run preview`      | Preview production build                                   |
| `npm run lint`         | Run ESLint                                                 |
| `npm run format`       | Format with Prettier                                       |
| `npm run i18n:extract` | Extract translatable strings to `src/i18n/locales/en.json` |
| `npm run i18n:compile` | Compile locale JSON to AST bundle                          |

## Project Structure

```
src/
├── engine/                   # Simulation core (UI-agnostic)
│   ├── CircuitManager.ts     # Orchestrates components, wires, and propagation
│   ├── ComponentLibrary.ts   # Component registry, validation, custom circuit compiler
│   ├── SimulationEngine.ts   # RAF loop, clock advancement, tick counter
│   ├── SignalPropagator.ts   # Dirty-set propagation with snapshot semantics
│   ├── GraphManager.ts       # Wire topology, adjacency, and Kahn's topological sort
│   ├── ProjectManager.ts     # Persistence: save/load/undo/redo
│   ├── BatchConnect.ts       # Multi-wire batch connection utility
│   ├── ViaService.ts         # Broadcaster/Receiver signal bridging
│   ├── EventQueue.ts         # Min-heap priority queue (reserved for future use)
│   └── definitions/          # Component definitions by category
│       ├── logic/            # AND, OR, XOR, NAND, NOR, NOT, Buffer
│       ├── input/            # Toggle, Button, Clock, Constant, Bus inputs
│       ├── output/           # LED, 7-Segment, Probe, Bus displays
│       ├── sequential/       # Flip-flops, latches, registers, counters
│       ├── arithmetic/       # Adders, subtractors, MUX, decoders, comparators
│       └── utility/          # Splitter, Comment, Broadcaster, Receiver
├── components/
│   ├── layout/               # App shell, panels, toolbars
│   └── ui/                   # Reusable UI primitives (GateNode, WirePath, etc.)
├── hooks/                    # React hooks (canvas interaction, wire drawing, etc.)
├── wirerouter/               # A*-based obstacle-avoiding wire routing engine
├── stores/                   # Zustand stores (settings, UI state)
├── lib/                      # Shared utilities and constants
├── i18n/                     # Locale files and compiled bundles
└── routes/                   # TanStack Router page definitions
```

## Architecture Notes

- **ComponentLibrary** is a singleton registry. All built-in definitions are validated on startup (pin counts, labels, evaluator contracts). Custom circuits are compiled into black-box `evaluate()` functions with internal topological execution.
- **GraphManager** maintains downstream/upstream adjacency with O(1) per-pin wire lookups and reference-counted edge cleanup.
- **SignalPropagator** collects dirty components into a set, sorts by cached topological rank, and evaluates in order. Sequential components use pre-tick input snapshots for correct pipeline behavior.
- **CircuitManager** is the top-level facade that coordinates all engine modules and exposes the public API consumed by React hooks.

## License

This project is dual-licensed:

Community Edition: GNU Affero General Public License v3.0 (AGPL-3.0)
Commercial Use: A commercial license is required for proprietary or closed-source use that does not comply with the AGPL. See COMMERCIAL_LICENSE.md for details.
