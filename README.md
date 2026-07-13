# BitLab

A digital logic circuit designer built on an infinite canvas. Place gates, wire them together, and simulate in real time.

## Features

- **Infinite canvas** — pan, zoom, and snap-to-grid placement
- **Real-time simulation** — run, pause, step, and reset the circuit clock
- **Undo / Redo** — full history for every action
- **Save / Load** — export and import circuits as JSON
- **Light and dark themes**

## Component Library

| Category | Components |
|---|---|
| Logic Gates | AND, OR, XOR, XNOR, NAND, NOR, NOT, Buffer |
| Inputs | Toggle, Button, Clock, Constant |
| Outputs | LED, Lamp |
| Sequential | SR Latch, D Flip-Flop |
| Arithmetic | Half Adder, Full Adder, MUX 2:1 |

## Stack

- [TanStack Start](https://tanstack.com/start) — SSR / full-stack framework
- [TanStack Router](https://tanstack.com/router) — type-safe file-based routing
- [React 19](https://react.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Radix UI](https://www.radix-ui.com) — accessible primitives
- [Vite](https://vitejs.dev)
- TypeScript

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
