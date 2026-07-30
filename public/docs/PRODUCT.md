# BitLab — Product Documentation

## What is BitLab?

BitLab is a browser-based digital circuit editor and simulator. It lets you visually design electronic circuits by dragging components onto a canvas, connecting them with wires, and running real-time simulations to see how signals flow through your design.

Think of it like a virtual breadboard — but instead of physical wires and chips, everything happens on screen. You can build anything from a simple light switch to a complete 4-bit computer.

### Who is this for?

- Students learning digital electronics or computer architecture
- Engineers prototyping circuit ideas quickly
- Hobbyists exploring logic design
- Educators creating interactive demonstrations
- Anyone curious about how computers work at the gate level

### What does "digital circuit" mean?

A digital circuit processes information as **ones and zeros** (HIGH and LOW signals). Every computer, phone, and smart device is built from millions of these simple circuits. BitLab lets you build them one piece at a time.

---

## How to Use BitLab

### Getting Started (5-minute walkthrough)

1. **Open BitLab** — Navigate to the app in your browser. You'll see an empty canvas with a component panel on the left.

2. **Place your first components:**
   - From the **Inputs** category on the left, drag two **Toggle** switches onto the canvas
   - From **Logic Gates**, drag an **AND** gate onto the canvas
   - From **Outputs**, drag an **LED**

3. **Wire them together:**
   - Click and hold on a Toggle's output pin (small circle on the right edge)
   - Drag to one of the AND gate's input pins (left edge)
   - Repeat for the second Toggle → second AND input
   - Wire the AND gate's output → LED input

4. **Interact:**
   - Click each Toggle to flip between HIGH and LOW
   - The LED lights up only when BOTH Toggles are HIGH (that's what AND does)

5. **Run the simulation clock:**
   - Press the **Play** button in the top bar
   - Add a **Clock** component — it automatically toggles every tick
   - Add sequential components (flip-flops) to build circuits that evolve over time

### Common Workflows

#### Building combinational logic (no memory)

1. Place input sources (Toggles, Constants, Buttons)
2. Add logic gates (AND, OR, NOT, XOR, etc.)
3. Add output indicators (LEDs, 7-Segment Displays)
4. Wire everything together
5. Click inputs to test — outputs respond instantly

#### Building sequential circuits (with memory)

1. Place a **Clock** input — this drives the timing
2. Add flip-flops or registers
3. Wire data inputs and connect the Clock to CLK pins
4. Press **Play** to start the clock
5. Use **Step** to advance one tick at a time for debugging
6. Add **Probes** to record and view waveforms over time

#### Observing signal timing with Probes

1. Place a **Probe** component and wire it to any signal you want to watch
2. Start the simulation (Play)
3. The Probe records one sample per tick and draws a waveform
4. Multiple Probes share the same time axis for easy comparison

#### Creating reusable custom components

1. Build a circuit with labeled inputs and outputs
2. Use meaningful labels on your Toggle/Button/Clock inputs (e.g., "A", "B", "CLK")
3. Use LEDs as outputs — their labels become output pin names
4. Click the **Package** icon in the top bar → name your circuit
5. Your new component appears in the **Custom** category
6. Drag it onto any circuit like a built-in gate

#### Working with buses (multi-bit signals)

1. Place a **Bus Input 4** (or 8, 16) for multi-bit input
2. Place a **Bus Display 4** to see the numeric value
3. Wire them together — a thick bus wire is drawn automatically
4. Use **Bus AND/OR/NOT** for bitwise operations on the bus
5. Use **Debus** to split a bus back into individual wires

### Tips

- **Snap to grid** is on by default — components align neatly
- **⌘K / Ctrl+K** opens the Command Palette for quick access to any action
- **Right-click** a component for Replace, Duplicate, Pin, or Delete
- **Fit to screen** (canvas toolbar) auto-zooms to show your entire circuit
- Use **Comments** (Utility category) to annotate your design
- **Undo** (⌘Z) works for every action — experiment freely

---

## Core Concepts (for complete beginners)

### Signals

BitLab uses a **four-state signal model**:

| State       | Meaning                               | Color      | Example                            |
| ----------- | ------------------------------------- | ---------- | ---------------------------------- |
| LOW (0)     | The wire carries no voltage           | Gray       | A light switch in the OFF position |
| HIGH (1)    | The wire carries voltage              | Cyan/Green | A light switch in the ON position  |
| UNKNOWN (X) | The system cannot determine the value | Yellow     | A broken or conflicting connection |
| HIGH-Z (Z)  | No device is driving the wire         | Purple     | An unplugged cable                 |

### Components

A **component** (also called a "gate") is a building block that takes input signals and produces output signals based on a rule. For example, an AND gate outputs HIGH only when ALL its inputs are HIGH.

### Wires

**Wires** connect the output of one component to the input of another, carrying signals between them. Each input can receive from only one source, but one output can drive many inputs.

### Pins

**Pins** are the connection points on a component. Input pins are on the left side, output pins on the right side. You draw a wire from an output pin to an input pin.

---

## Application Layout

The BitLab interface is organized into several panels:

```
┌──────────────────────────────────────────────────────────────┐
│                         TOP BAR                              │
├──────────┬───────────────────────────────────────┬───────────┤
│          │                                       │           │
│ CATEGORY │              CANVAS                   │ PROPERTIES│
│  PANEL   │                                       │   PANEL   │
│          │                                       │           │
│          │                                       │ EXPLORER  │
│          │                                       │   PANEL   │
│          │                                       │           │
├──────────┴───────────────────────────────────────┴───────────┤
│                       CONSOLE PANEL                          │
├──────────────────────────────────────────────────────────────┤
│                        BOTTOM BAR                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. Top Bar

The top bar is the main toolbar of the application. It contains project management, simulation controls, and global actions.

### 1.1 Project Management

| Feature                   | Icon     | Description                                                                                    |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| **New Project**           | +        | Creates a blank circuit, clearing everything on the canvas                                     |
| **Open from Local**       | Folder   | Loads a previously saved project from your browser's storage                                   |
| **Save to Local**         | Disk     | Saves the current circuit to your browser's local storage. Your work persists between sessions |
| **Export to File**        | Arrow-up | Downloads the circuit as a `.bitlab.json` file you can share or back up                        |
| **Import from File**      | Folder   | Loads a `.json`, `.bitlab.json`, `.circuit.json`, or `.dgate.json` file into the canvas        |
| **Create Custom Circuit** | Package  | Saves the current design as a reusable component (see Custom Circuits section)                 |

### 1.2 Undo / Redo

| Feature  | Shortcut                | Description                                                      |
| -------- | ----------------------- | ---------------------------------------------------------------- |
| **Undo** | ⌘Z (Mac) / Ctrl+Z (Win) | Reverts the last action (add/remove component, wire, move, etc.) |
| **Redo** | ⌘Shift+Z or ⌘Y          | Re-applies an undone action                                      |

The history stores up to **100 states**. Moving a component only records after you release the mouse (not every pixel of movement).

### 1.3 Simulation Controls

| Feature         | Icon             | Description                                                                                                     |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| **Run / Pause** | Play/Pause       | Starts or pauses the simulation clock. While running, clock components tick and signals propagate automatically |
| **Stop**        | Square           | Halts the simulation entirely                                                                                   |
| **Step**        | Forward          | Advances the simulation by exactly one tick. Useful for debugging timing-dependent circuits                     |
| **Reset**       | Rotate           | Returns all components to their initial state (flip-flops cleared, counters zeroed, etc.) without removing them |
| **Clock Speed** | Slider (1-10 Hz) | Controls how fast the simulation clock ticks. 1 Hz = 1 tick per second; 10 Hz = 10 ticks per second             |

**What is a "tick"?** A tick is one step of the simulation clock. Sequential components (flip-flops, counters) only change their outputs on clock edges, which happen once per tick.

### 1.4 Status Display

- **Tick counter** — Shows the current simulation tick number
- **Waveform animation** — When running, displays an animated square wave showing the clock rhythm
- **Obstacle map toggle** — Debug feature showing the routing grid (for advanced wire routing)

### 1.5 Settings & Command Palette

| Feature             | Shortcut                | Description                                                           |
| ------------------- | ----------------------- | --------------------------------------------------------------------- |
| **Settings**        | Gear icon               | Opens the settings panel (appearance, canvas options)                 |
| **Command Palette** | ⌘K (Mac) / Ctrl+K (Win) | Opens a fuzzy-search command launcher for quick access to all actions |

---

## 2. Category Panel (Component Library)

The left sidebar contains every available component, organized into categories. This is where you pick components to add to your circuit.

### How to use

1. **Browse** — Expand/collapse categories by clicking their headers
2. **Search** — Type in the search box to filter components by name
3. **Add to canvas** — Drag any component chip from the panel onto the canvas

### 2.1 Logic Gates

Logic gates are the fundamental building blocks. They combine input signals according to boolean logic rules.

| Component                          | Inputs → Outputs | What it does (in plain English)                                                                         |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| **AND**                            | 2 → 1            | Output is HIGH only when BOTH inputs are HIGH. Like needing two keys to open a lock                     |
| **OR**                             | 2 → 1            | Output is HIGH when ANY input is HIGH. Like having two doorbells ring the same chime                    |
| **XOR**                            | 2 → 1            | Output is HIGH when inputs are DIFFERENT. Like a light switch that toggles from either end of a hallway |
| **XNOR**                           | 2 → 1            | Output is HIGH when inputs are the SAME                                                                 |
| **NAND**                           | 2 → 1            | Opposite of AND — output is LOW only when both inputs are HIGH                                          |
| **NOR**                            | 2 → 1            | Opposite of OR — output is LOW when any input is HIGH                                                   |
| **NOT**                            | 1 → 1            | Inverts the signal. HIGH becomes LOW, LOW becomes HIGH                                                  |
| **Buffer**                         | 1 → 1            | Passes the signal through unchanged. Used for signal isolation                                          |
| **AND-3 / AND-4 / AND-8 / AND-16** | 3/4/8/16 → 1     | AND gate with more inputs                                                                               |
| **OR-3 / OR-4 / OR-8 / OR-16**     | 3/4/8/16 → 1     | OR gate with more inputs                                                                                |
| **NOT-2 / NOT-4 / NOT-8**          | 2/4/8 → 2/4/8    | Multiple independent inverters in one package                                                           |
| **Ctrl AND 4/8/16**                | 5/9/17 → 4/8/16  | Data passes through when the CTRL pin is HIGH; outputs LOW when CTRL is LOW                             |

### 2.2 Inputs

Input components let you provide signals to your circuit. They have no input pins — only outputs.

| Component            | Outputs | Description                                                                                            |
| -------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| **Toggle**           | 1       | Click to switch between HIGH and LOW. Stays where you leave it                                         |
| **Button**           | 1       | Outputs HIGH only while you hold it down. Releases to LOW                                              |
| **Constant**         | 1       | Always outputs HIGH. Click to flip between HIGH and LOW permanently                                    |
| **Clock**            | 1       | Automatically alternates between HIGH and LOW at the simulation speed. This drives sequential circuits |
| **Digit→Binary**     | 4       | Click to cycle through digits 0-9. Outputs the 4-bit binary representation                             |
| **VCC (5V)**         | 1       | Always outputs HIGH. Represents a power supply connection                                              |
| **GND**              | 1       | Always outputs LOW. Represents ground                                                                  |
| **Bus Input 4/8/16** | 4/8/16  | Multi-bit input that drives a bus (group of wires). Click to cycle signal states                       |

### 2.3 Outputs

Output components display or observe signals. They have input pins but no output pins.

| Component              | Inputs | Description                                                                             |
| ---------------------- | ------ | --------------------------------------------------------------------------------------- |
| **LED**                | 1      | Lights up when the input is HIGH. The simplest way to see a signal                      |
| **7-Segment Display**  | 4      | Shows a hexadecimal digit (0-F) based on 4 binary inputs                                |
| **Probe**              | 1      | Records a waveform history showing how a signal changes over time. Like an oscilloscope |
| **Bus Display 4/8/16** | 4/8/16 | Shows the numeric value of a multi-bit bus as a decimal number                          |

### 2.4 Sequential

Sequential components have **memory** — their output depends not just on current inputs but also on what happened before. They change state on clock edges.

| Component            | Inputs           | Outputs   | Description                                                                           |
| -------------------- | ---------------- | --------- | ------------------------------------------------------------------------------------- |
| **SR Latch**         | 2 (S, R)         | 2 (Q, Q') | Set/Reset memory. Set makes Q=HIGH, Reset makes Q=LOW. Both LOW = hold previous       |
| **D Flip-Flop**      | 2 (D, CLK)       | 2 (Q, Q') | Captures the D input value on the rising edge of CLK. The workhorse of digital memory |
| **JK Flip-Flop**     | 3 (J, K, CLK)    | 2 (Q, Q') | Like SR but with a toggle mode (J=K=HIGH flips the state)                             |
| **T Flip-Flop**      | 2 (T, CLK)       | 2 (Q, Q') | Toggles output on clock edge when T is HIGH                                           |
| **D Latch**          | 2 (D, E)         | 2 (Q, Q') | Transparent when Enable is HIGH (output follows input). Latches when Enable goes LOW  |
| **Register 4**       | 5 (D0-D3, CLK)   | 4 (Q0-Q3) | Stores 4 bits on each clock edge. A tiny piece of computer memory                     |
| **Counter 4**        | 2 (CLK, RST)     | 4 (Q0-Q3) | Counts from 0 to 15 in binary, incrementing on each clock edge. RST resets to 0       |
| **Shift Register 4** | 3 (SI, CLK, RST) | 4 (Q0-Q3) | Shifts bits through a chain on each clock. Used for serial-to-parallel conversion     |

### 2.5 Arithmetic

Arithmetic components perform mathematical and routing operations on signals.

| Component           | Inputs            | Outputs              | Description                                                         |
| ------------------- | ----------------- | -------------------- | ------------------------------------------------------------------- |
| **Half Adder**      | 2 (A, B)          | 2 (Sum, Carry)       | Adds two single bits. Sum is the result, Carry is the overflow      |
| **Full Adder**      | 3 (A, B, Cin)     | 2 (Sum, Carry-out)   | Adds two bits plus a carry-in. Chain these to add multi-bit numbers |
| **Half Subtractor** | 2 (A, B)          | 2 (Diff, Borrow)     | Subtracts B from A                                                  |
| **Full Subtractor** | 3 (A, B, Bin)     | 2 (Diff, Borrow-out) | Subtracts with borrow-in                                            |
| **Mux 2:1**         | 3 (D0, D1, S)     | 1                    | Selector switch — outputs D0 when S=0, D1 when S=1                  |
| **Mux 4:1**         | 6 (D0-D3, S0-S1)  | 1                    | 4-way selector controlled by 2 select bits                          |
| **Mux 8:1**         | 11 (D0-D7, S0-S2) | 1                    | 8-way selector controlled by 3 select bits                          |
| **Demux 1:2**       | 2 (D, S)          | 2                    | Routes one input to one of two outputs based on select              |
| **Decoder 2:4**     | 2 (A, B)          | 4                    | Activates one of 4 outputs based on the 2-bit input code            |
| **Decoder 3:8**     | 3 (A, B, C)       | 8                    | Activates one of 8 outputs based on the 3-bit input code            |
| **Encoder 4:2**     | 4 (D0-D3)         | 2                    | Converts an active input line to a 2-bit binary code                |
| **Comparator**      | 2 (A, B)          | 3 (<, =, >)          | Compares two single-bit values                                      |
| **Comparator 4**    | 8 (A0-A3, B0-B3)  | 3 (<, =, >)          | Compares two 4-bit numbers                                          |

### 2.6 Utility

Utility components help organize and manage signals.

| Component          | Description                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| **Splitter (1:4)** | Copies one input signal to 4 identical outputs. Used for fan-out                                     |
| **Comment**        | A text annotation with no electrical function. For labeling your design                              |
| **Bus 4/8/16**     | Groups individual wires into a multi-bit bus. Input side takes individual bits, output is a bus port |
| **Debus 4/8/16**   | Splits a bus back into individual wires                                                              |
| **U-Reg 4/8**      | Universal register with parallel load                                                                |
| **Bus AND 4/8/16** | Performs AND on each bit of a bus with a control signal                                              |
| **Bus OR 4/8/16**  | Performs OR on each bit of a bus                                                                     |
| **Bus NOT 4/8/16** | Inverts every bit of a bus                                                                           |

### 2.7 Custom Components

User-created reusable circuits. See the "Custom Circuits" section below for details.

---

## 3. Canvas

The canvas is the main workspace where you build your circuit. It's an infinite 2D surface where components are placed and wires are drawn.

### 3.1 Navigation

| Action            | How                                                                       | Description                      |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------- |
| **Pan**           | Scroll (trackpad), Middle-click drag, Alt+click drag, or Pan tool (Space) | Move the viewport around         |
| **Zoom**          | Ctrl+scroll (or ⌘+scroll on Mac), Pinch gesture                           | Zoom in/out (20% to 300%)        |
| **Fit to Screen** | "Fit" button in canvas toolbar                                            | Auto-zoom to show all components |
| **Reset Zoom**    | "100%" button                                                             | Return to default zoom level     |

### 3.2 Component Placement

1. Drag a component from the Category Panel onto the canvas
2. Release to place it at that position
3. Use **snap-to-grid** (enabled by default) to align components neatly

### 3.3 Selection

| Action               | How                             | Description                                 |
| -------------------- | ------------------------------- | ------------------------------------------- |
| **Select one**       | Click a component               | Highlights it and shows its properties      |
| **Multi-select**     | Drag on empty canvas (lasso)    | Selects all components within the rectangle |
| **Add to selection** | Hold Shift + click (components) | Adds to existing selection                  |
| **Select all**       | ⌘A / Ctrl+A                     | Selects every component and wire            |
| **Deselect**         | Escape or click empty canvas    | Clears the selection                        |
| **Select wire**      | Click on a wire                 | Shows wire properties                       |

### 3.4 Wire Drawing

Wires connect component outputs to inputs:

1. **Click and hold** on an output pin (right side of a component)
2. **Drag** toward the target input pin (left side of another component)
3. **Release** on the input pin to create the connection

A temporary preview line follows your cursor while dragging.

**Wire Styles:**

| Style          | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| **Bezier**     | Smooth curved wires. Default and most visually clean                       |
| **Orthogonal** | Right-angle wires (horizontal and vertical segments only)                  |
| **Optimized**  | A*-routed wires that avoid obstacles. Finds the neatest path automatically |

### 3.5 Bus Wires

Bus wires carry multiple bits (4, 8, or 16) as a single thick wire. They are drawn automatically when connecting bus-compatible ports (e.g., Bus Input → Bus Display).

- Bus wires appear thicker than regular wires
- They show all bit signals at once
- You cannot mix bus and regular wires on the same port

### 3.6 Component Interaction

| Action          | How                                  | Description                                          |
| --------------- | ------------------------------------ | ---------------------------------------------------- |
| **Toggle**      | Click a Toggle or Constant component | Flips between HIGH and LOW                           |
| **Button**      | Press and hold                       | Outputs HIGH while held, LOW when released           |
| **Digit Input** | Click                                | Cycles 0 → 1 → 2 → ... → 9 → 0                       |
| **Move**        | Drag selected component(s)           | Repositions on canvas                                |
| **Rotate**      | Via Properties panel or toolbar      | Rotates 90° clockwise per click                      |
| **Duplicate**   | ⌘D / Ctrl+D                          | Creates a copy offset from the original              |
| **Delete**      | Delete or Backspace key              | Removes selected components and their wires          |
| **Right-click** | Right-click a component              | Opens context menu (Pin, Replace, Duplicate, Delete) |

### 3.7 Canvas Toolbar

Located at the top-left of the canvas:

| Tool                | Shortcut     | Description                                                |
| ------------------- | ------------ | ---------------------------------------------------------- |
| **Select**          | V            | Default tool for selecting and interacting with components |
| **Pan**             | Space (hold) | Switches to pan mode for moving the viewport               |
| **Snap to Grid**    | Toggle       | Aligns component positions to the grid                     |
| **Wire: Bezier**    | —            | Smooth curved wire routing                                 |
| **Wire: Ortho**     | —            | Right-angle wire routing                                   |
| **Wire: Optimized** | —            | Automatic obstacle-avoiding routing                        |

### 3.8 Minimap

A small overview panel in the bottom-right corner shows:

- A bird's-eye view of all components (as small colored rectangles)
- The current viewport rectangle
- Helps orient you in large circuits

### 3.9 Grid Background

The canvas has a subtle dot or line grid that helps align components. The grid color is customizable in Settings.

---

## 4. Properties Panel (Right Sidebar — Top)

When you select a single component, the Properties panel shows its details and lets you edit them.

### 4.1 Gate Properties

| Property            | Description                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**            | The component type (e.g., "AND", "D Flip-Flop") — read-only                                                                                            |
| **Label**           | An optional name you give the component (e.g., "CLK", "Data_In"). For input/clock components, this becomes the pin name when saved as a custom circuit |
| **Position (X, Y)** | Exact canvas coordinates. Editable for precise placement                                                                                               |
| **Rotation**        | Current rotation angle (0°, 90°, 180°, 270°). Click the rotate button to turn 90° CW                                                                   |
| **State**           | For Toggle/Constant: shows HIGH/LOW with a clickable toggle                                                                                            |
| **Live Inputs**     | Shows current signal values on all input pins with color coding                                                                                        |
| **Live Outputs**    | Shows current signal values on all output pins with color coding                                                                                       |

### 4.2 Wire Properties

When a wire is selected:

| Property   | Description                                             |
| ---------- | ------------------------------------------------------- |
| **From**   | Source component and output pin label                   |
| **To**     | Target component and input pin label                    |
| **Signal** | Current signal value (HIGH/LOW/UNKNOWN/Hi-Z) with color |
| **Type**   | "Bit" for single wires, "Bus" for multi-bit bus wires   |

### 4.3 Actions

| Action        | Description                              |
| ------------- | ---------------------------------------- |
| **Duplicate** | Creates a copy of the selected component |
| **Delete**    | Removes the component and all its wires  |

---

## 5. Circuit Explorer Panel (Right Sidebar — Bottom)

The Explorer panel shows a **tree view** of every component currently in your circuit, grouped by category.

### Features

- **Click any component** to select it on the canvas
- **Category counts** show how many of each type you have
- **Multi-selection toolbar** appears when multiple items are selected:
  - Duplicate (with count)
  - Rotate 90° CW
  - Delete (with count)
- **Empty state** shows "Empty circuit" when nothing is placed

This is useful for navigating large circuits where components may be off-screen.

---

## 6. Console Panel

The bottom panel provides simulation diagnostics and debugging information. It can be collapsed to save space.

### 6.1 Simulation Log

A chronological record of events:

- Wire connections made
- Bus connections
- Auto-connect results
- Custom circuit registration
- Warnings about invalid operations

### 6.2 Errors Tab

Shows evaluation errors from components that failed during simulation:

- Component ID and type
- Error message
- Tick when the error occurred

### 6.3 Warnings Tab

Non-fatal issues:

- Attempting to connect regular wires to bus ports
- Auto-connect skipped wires
- Missing dependencies in custom circuits

### 6.4 Event Timeline

A time-ordered view of all log entries (last 20 events) with timestamps.

### 6.5 Performance Tab

Circuit health metrics:

| Metric         | Description                             |
| -------------- | --------------------------------------- |
| **Components** | Total components in the circuit         |
| **Wires**      | Total wire connections                  |
| **Tick**       | Current simulation tick                 |
| **Events**     | Total component evaluations since start |
| **Faulted**    | Number of components that threw errors  |

If components have faulted, shows their error details.

### 6.6 Propagation Tab

Signal propagation analytics for the most recent evaluation:

| Metric           | Description                                             |
| ---------------- | ------------------------------------------------------- |
| **Evaluations**  | How many components were re-evaluated                   |
| **Delta Cycles** | Rounds of propagation needed to reach steady state      |
| **Max Queue**    | Deepest the evaluation queue got (high = complex paths) |
| **Skipped**      | Events deduplicated (efficiency metric)                 |
| **Duration**     | Wall-clock time for propagation (ms)                    |
| **Oscillation**  | Whether infinite loops were detected                    |

Includes a bar chart showing evaluations per delta cycle and warnings about oscillating components.

### 6.7 Signal State Legend

Always visible in the console header:

- 🟫 LOW (0) — Wire is not energized
- 🟦 HIGH (1) — Wire is energized
- 🟨 UNKNOWN (X) — Cannot determine value
- 🟪 HIGH-Z (Z) — Wire is floating (no driver)

---

## 7. Bottom Bar

A thin status bar at the very bottom showing at-a-glance information:

| Item                 | Description                          |
| -------------------- | ------------------------------------ |
| **Status indicator** | Green dot = Running, Gray dot = Idle |
| **Tick count**       | Current simulation tick              |
| **Component count**  | Total components on canvas           |
| **Wire count**       | Total wires in the circuit           |
| **Version**          | BitLab version and author credit     |

---

## 8. Command Palette

A quick-access command launcher (like Spotlight or VS Code's command palette).

### How to use

1. Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux)
2. Type to fuzzy-search available commands
3. Use **Arrow keys** to navigate, **Enter** to execute
4. Press **Escape** to close

Available commands include all toolbar actions (New, Save, Import, Export, Undo, Redo, Run, Pause, etc.).

---

## 9. Settings Panel

A modal dialog for configuring BitLab's appearance.

### 9.1 Canvas Settings

| Setting            | Range            | Description                                                                                        |
| ------------------ | ---------------- | -------------------------------------------------------------------------------------------------- |
| **Wire Glow**      | 0x – 3x          | Intensity of the glowing halo on energized (HIGH) wires. Set to 0 to disable                       |
| **Component Glow** | 0x – 3x          | Intensity of the glow effect on active components                                                  |
| **Grid Color**     | Presets + custom | Color of the background grid. Choose from presets or pick any color. Leave blank for theme default |

### 9.2 Theme Settings

| Theme     | Description                                                                          |
| --------- | ------------------------------------------------------------------------------------ |
| **Dark**  | Dark background with cyan/purple accent colors. Easier on the eyes in low light      |
| **Light** | White background with teal/magenta accents. Better visibility in bright environments |

Settings persist in your browser's local storage automatically.

### 9.3 Reset

Click "Reset to defaults" to restore all settings to their original values.

---

## 10. Right-Click Context Menu

Right-clicking a component opens a context menu with quick actions:

| Action           | Description                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Pin / Unpin**  | Pinned components cannot be deleted by "Delete All" and their position is locked                                                        |
| **Replace With** | Shows compatible components (same input/output count) that you can swap to without rewiring. Only for logic/sequential/arithmetic gates |
| **Duplicate**    | Creates a copy near the original                                                                                                        |
| **Delete**       | Removes the component and its wires                                                                                                     |

---

## 11. Custom Circuits

Custom circuits let you create your own reusable components from existing designs. This is how you build complex systems hierarchically.

### 11.1 Creating a Custom Circuit

1. Build a circuit on the canvas using standard components
2. Add **input sources** (Toggle, Button, Constant, Clock, or Bus Input) — these become the custom component's input pins
3. Add **output sinks** (LED) — these become the custom component's output pins
4. Label your inputs and outputs meaningfully (the labels become pin names)
5. Click the **Package** icon in the top bar (or use the command palette)
6. Enter a name for your circuit
7. The new component appears in the **Custom** category of the Component Library

### 11.2 Using Custom Circuits

- Drag from the Custom category like any other component
- They simulate in real-time — signals propagate through their internal circuits
- Custom circuits can contain other custom circuits (nested hierarchy)

### 11.3 Inspecting a Custom Circuit

- Right-click a custom component chip in the Category Panel → Inspect
- Opens the **Circuit Viewer** — a read-only window showing the internal circuit
- You can interact with inputs (toggle switches) and run the simulation inside it
- Zoom, pan, reset, play/pause/step controls available
- Export the internal circuit as JSON

### 11.4 Managing Custom Circuits

- **Remove** — Right-click in the Category Panel → Remove. Cannot remove if other circuits depend on it
- **Import** — Load `.json` files as custom circuits without building them first
- **Persistence** — Custom circuits are automatically saved to localStorage

---

## 12. Keyboard Shortcuts

| Shortcut           | Action                           |
| ------------------ | -------------------------------- |
| ⌘K / Ctrl+K        | Open Command Palette             |
| ⌘Z / Ctrl+Z        | Undo                             |
| ⌘Shift+Z / Ctrl+Y  | Redo                             |
| ⌘D / Ctrl+D        | Duplicate selected               |
| ⌘S / Ctrl+S        | Save project to local storage    |
| ⌘A / Ctrl+A        | Select all components and wires  |
| ⌘C / Ctrl+C        | Copy selection to clipboard      |
| ⌘V / Ctrl+V        | Paste from clipboard             |
| Delete / Backspace | Delete selected components/wires |
| Escape             | Deselect all                     |
| Space (hold)       | Pan tool                         |
| V                  | Select tool                      |

---

## 13. Simulation Engine

The simulation engine is what makes your circuits "come alive." Understanding its behavior helps you design more effectively.

### 13.1 How Signals Propagate

When you flip a Toggle switch:

1. The Toggle's output changes from LOW to HIGH
2. The engine marks all downstream components as "dirty" (needing re-evaluation)
3. Dirty components are sorted by topological rank (upstream gates first)
4. Each dirty component recalculates its outputs based on its new inputs
5. If those outputs change, their downstream components are also marked dirty
6. This continues until no more changes occur (called "settling")

This all happens **instantly** for combinational circuits (gates without memory).

### 13.2 Topological Ordering

The engine uses **Kahn's algorithm** to determine the correct evaluation order:

- Components with no upstream dependencies are evaluated first
- Each component is only evaluated after all its inputs have settled
- The sort is cached and only recomputed when you add/remove components or wires
- This guarantees deterministic results regardless of placement order on the canvas

### 13.3 Clock-Driven Behavior

Sequential components (flip-flops, registers, counters) only update on **clock edges**:

- They ignore input changes between clock ticks
- On each tick, clock components toggle, and sequential components sample their inputs
- **Snapshot semantics**: Sequential components read a frozen copy of their inputs from _before_ the clock edge, so chained registers (like a shift register) advance correctly in a single tick
- This allows you to build circuits that execute operations in steps (like a real processor)

### 13.4 Oscillation Detection

If a circuit creates an infinite feedback loop (output feeds back to input in a way that never settles), the engine detects this and:

- Stops propagation after **64 evaluations** per component per pass
- Marks involved components as "oscillating"
- Shows a warning in the Propagation console tab
- Other components continue working normally

### 13.5 Exception Isolation

If a component throws an error during evaluation:

- It is marked as "faulted" and skipped in future ticks
- Other components continue working normally
- The error is logged in the Errors tab
- This prevents one broken component from crashing the entire simulation

---

## 14. Project File Format

BitLab saves circuits as JSON with this structure:

```json
{
  "version": 1,
  "name": "My Circuit",
  "savedAt": 1721548800000,
  "circuit": {
    "components": { ... },
    "wires": { ... }
  }
}
```

- File extensions: `.bitlab.json`, `.circuit.json`, `.dgate.json`, `.json`
- Circuits are **fully portable** — share with anyone running BitLab
- Future versions will include migration support for format changes

---

## 15. Bus System

The bus system lets you group multiple wires into a single visual connection, making complex circuits much cleaner.

### 15.1 What is a Bus?

A bus is a group of 4, 8, or 16 individual wires bundled into one thick wire. Instead of drawing 8 separate wires between two components, you draw one bus wire.

### 15.2 Bus-Compatible Components

| Type                   | Role        | Description                                |
| ---------------------- | ----------- | ------------------------------------------ |
| **Bus Input 4/8/16**   | Source      | Multi-bit input (click to change signal)   |
| **Bus Display 4/8/16** | Sink        | Shows the bus value as a number            |
| **Bus 4/8/16**         | Passthrough | Groups individual wires into a bus         |
| **Debus 4/8/16**       | Splitter    | Splits a bus back into individual wires    |
| **Bus AND/OR/NOT**     | Logic       | Performs bitwise operations on bus signals |

### 15.3 Drawing Bus Wires

1. Click on a **bus output port** (appears as a single wide port instead of individual pins)
2. Drag to a **bus input port** on another component
3. The system automatically creates wires for all bits in the bus

**Rules:**

- Bus wires can only connect bus-to-bus ports
- You cannot connect a regular wire to a bus port (a warning will appear)
- Width must match (4-bit bus output → 4-bit bus input)

---

## 16. Accessibility & Localization

### 16.1 Accessibility

- All interactive elements have proper ARIA labels
- Keyboard navigation works throughout the interface
- Color-coded signals use distinct shapes and text labels in addition to color
- Screen reader support for component names and states

### 16.2 Localization

BitLab supports multiple languages through its internationalization system. Currently available:

- **English** (default)

All UI text, component names, category labels, and status messages are localizable.

---

## Glossary

| Term               | Definition                                                          |
| ------------------ | ------------------------------------------------------------------- |
| **Gate**           | A component that performs a logic operation (AND, OR, NOT, etc.)    |
| **Pin**            | A connection point on a component (input or output)                 |
| **Wire**           | A connection carrying a signal from one output pin to one input pin |
| **Bus**            | A group of wires (4, 8, or 16) bundled as one connection            |
| **Tick**           | One step of the simulation clock                                    |
| **Clock Edge**     | The moment a clock signal transitions from LOW to HIGH              |
| **Sequential**     | A component that has memory (output depends on history)             |
| **Combinational**  | A component with no memory (output depends only on current inputs)  |
| **Propagation**    | The process of signal changes flowing through connected components  |
| **Oscillation**    | An infinite feedback loop where signals never settle                |
| **Snapshot**       | A complete frozen copy of the circuit state (used for undo/save)    |
| **Fan-out**        | One output pin driving multiple input pins through multiple wires   |
| **Single-driver**  | Each input pin can receive from exactly one wire                    |
| **Custom Circuit** | A user-created component that encapsulates a sub-circuit            |
