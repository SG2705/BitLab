# BitLab

A digital logic circuit designer built on an infinite canvas. Place components, wire them together, and simulate in real time — with a waveform probe that tracks signal timing across clock cycles.

## Features

- **Infinite canvas** — pan, zoom, and snap-to-grid placement
- **Real-time simulation** — run, pause, step, and reset the circuit clock
- **Waveform probe** — time-mapped signal display with a running clock-cycle x-axis; multiple probes share the same tick scale for side-by-side timing comparison
- **Custom gates** — compose any sub-circuit into a reusable black-box component
- **Undo / Redo** — full history for every edit action
- **Save / Load** — export and import circuits as JSON
- **Light and dark themes**
- **i18n ready** — string catalogue managed with react-intl / FormatJS

## Component Library

| Category    | Components                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Logic Gates | AND, OR, XOR, XNOR, NAND, NOR, NOT, Buffer, AND-3, OR-3                                                                                                      |
| Inputs      | Toggle, Button, Constant, Clock, Digit→Binary                                                                                                                |
| Outputs     | LED, 7-Segment Display, Signal Probe                                                                                                                         |
| Sequential  | SR Latch, D Latch, D Flip-Flop, JK Flip-Flop, T Flip-Flop, Register 4, Counter 4, Shift Register 4                                                           |
| Arithmetic  | Half Adder, Full Adder, Half Sub, Full Sub, Comparator, Comparator 4, MUX 2:1, MUX 4:1, MUX 8:1, Demux 1:2, Decoder 2:4, Decoder 3:8, Encoder 4:2 |
| Utility     | Splitter, Comment                                                                                                                                            |
| Custom      | Any sub-circuit saved as a reusable gate                                                                                                                     |

### Digit→Binary input

Displays its current digit (0–9) on the chip body. Click to cycle 0 → 9; select in the Properties panel to type a value. Outputs 8-bit binary on pins B7–B0. Any value outside 0–9 outputs all-zero.

### Signal Probe

Records one sample per simulation tick and renders a digital waveform with:

- Proportional segment widths — a signal stable for N ticks occupies N× the horizontal space
- Running clock-cycle x-axis — the rightmost tick label always matches the simulation tick counter, so two probes driven by clocks of different frequencies show the correct relative timing

## Simulation Engine

The engine is UI-agnostic and event-driven:

- **Topological propagation** — signals settle within a single pass using a min-heap `EventQueue` ordered by component rank
- **Non-blocking assignment semantics** — sequential gates (flip-flops, latches) read a pre-clock-edge output snapshot so chained registers advance correctly on the same clock edge
- **Oscillation guard** — propagation halts after 64 evaluations per component per pass and emits an `OSCILLATION` event
- **Tick context** — the engine tick counter is threaded through every `evaluate()` call; the Probe uses it to timestamp each sample for time-accurate waveform rendering

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
├── engine/           # Simulation core (UI-agnostic)
│   ├── ComponentLibrary.ts   # All component definitions & evaluate()
│   ├── SimulationEngine.ts   # RAF loop, clock advancement, tick counter
│   ├── SignalPropagator.ts   # Event-driven propagation with snapshot semantics
│   ├── GraphManager.ts       # Wire topology & topological sort
│   └── EventQueue.ts         # Min-heap priority queue
├── components/
│   └── digital-gate/         # Canvas, gate nodes, waveform display, panels
├── lib/
│   ├── constants.ts          # Gate type IDs, categories, labels
│   └── utils.ts
└── i18n/                     # Locale files and compiled bundles
```
