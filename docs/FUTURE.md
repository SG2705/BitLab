# BitLab — Future Roadmap

A living document of planned enhancements, new features, and improvements to move BitLab toward being a professional-grade digital design tool while maintaining its approachable, educational core.

---

## Priority Legend

| Tag   | Meaning                                         |
| ----- | ----------------------------------------------- |
| 🔴 P0 | Critical — blocks real-world adoption           |
| 🟠 P1 | High — significant usability or capability gain |
| 🟡 P2 | Medium — quality-of-life improvements           |
| 🟢 P3 | Low — nice-to-have polish                       |

---

## 1. New Components

### 1.1 Memory & Storage

| Component                    | Priority | Description                                                                                             |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| **RAM (4×4, 8×8, 16×8)**     | 🟠 P1    | Read/write memory with address bus, data bus, R/W control, and chip enable. Essential for building CPUs |
| **ROM (Programmable)**       | 🟠 P1    | Read-only memory that users can pre-load with data via a hex editor UI. Used for instruction storage    |
| **Stack (LIFO 8-deep)**      | 🟡 P2    | Push/pop memory with overflow/underflow flags                                                           |
| **FIFO Queue**               | 🟡 P2    | First-in-first-out buffer with full/empty indicators                                                    |
| **Register File (4×4, 8×8)** | 🟠 P1    | Multi-port register bank with independent read/write addressing — the backbone of a CPU datapath        |

### 1.2 Arithmetic & Logic

| Component                    | Priority | Description                                                                                      |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| **ALU (4-bit, 8-bit)**       | 🟠 P1    | Arithmetic Logic Unit — performs add, subtract, AND, OR, XOR, shift based on opcode select lines |
| **Barrel Shifter**           | 🟡 P2    | Shifts/rotates an N-bit value by any amount in a single cycle                                    |
| **Multiplier (4×4)**         | 🟡 P2    | Combinational multiplier producing 8-bit product from two 4-bit inputs                           |
| **Carry-Lookahead Adder**    | 🟡 P2    | Fast multi-bit adder without ripple delay                                                        |
| **Priority Encoder 8:3**     | 🟡 P2    | Encodes the highest-priority active input                                                        |
| **Parity Generator/Checker** | 🟢 P3    | Computes even/odd parity for error detection                                                     |

### 1.3 Timing & Control

| Component                      | Priority | Description                                                                              |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| **Programmable Clock Divider** | 🟠 P1    | Divides clock by user-configurable ratio (2, 4, 8, N). Essential for multi-speed designs |
| **Monostable (One-Shot)**      | 🟡 P2    | Produces a single pulse of configurable width on trigger                                 |
| **Debouncer**                  | 🟡 P2    | Filters noisy button presses into clean single pulses                                    |
| **Watchdog Timer**             | 🟢 P3    | Resets after timeout if not periodically refreshed                                       |
| **PWM Generator**              | 🟡 P2    | Outputs a pulse-width-modulated signal with configurable duty cycle                      |

### 1.4 I/O & Interface

| Component                        | Priority | Description                                                             |
| -------------------------------- | -------- | ----------------------------------------------------------------------- |
| **Keypad (4×4 Matrix)**          | 🟡 P2    | 16-button matrix input producing 4-bit key code + valid signal          |
| **LCD Display (16×2 character)** | 🟡 P2    | Text output display accepting ASCII character input + cursor control    |
| **Stepper Motor (visual)**       | 🟢 P3    | Animated motor visualization responding to step/direction signals       |
| **DAC (4-bit)**                  | 🟢 P3    | Digital-to-analog converter showing an analog voltage bar graph         |
| **ADC (4-bit)**                  | 🟢 P3    | Analog-to-digital converter with a slider input producing binary output |
| **UART TX/RX**                   | 🟡 P2    | Serial communication transmitter/receiver for inter-circuit messaging   |
| **SPI Master/Slave**             | 🟢 P3    | Serial Peripheral Interface for chaining circuits                       |

### 1.5 Tri-State & Shared Bus

| Component                     | Priority | Description                                                                                                            |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Tri-State Buffer**          | 🟠 P1    | Output can be HIGH, LOW, or disconnected (Hi-Z). Required for shared buses. Already stubbed in code                    |
| **Tri-State Inverter**        | 🟠 P1    | Inverting tri-state buffer                                                                                             |
| **Bidirectional Transceiver** | 🟡 P2    | Two-way data transfer controlled by direction pin                                                                      |
| **Shared Data Bus**           | 🟠 P1    | A bus wire where multiple tri-state sources can drive; engine must support bus resolution (last writer / conflict = X) |

---

## 2. Simulation Engine Enhancements

### 2.1 Timing Model

| Feature                        | Priority | Description                                                                                                 |
| ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| **Propagation Delay per Gate** | 🟠 P1    | Each component has a configurable delay (ns). Signals don't arrive instantly — enables real timing analysis |
| **Setup/Hold Time Checking**   | 🟡 P2    | Warn when sequential components receive data too close to the clock edge                                    |
| **Rise/Fall Time Modeling**    | 🟢 P3    | Signal transitions are not instantaneous; model slew rate for analog-aware simulation                       |
| **Timing Hazard Detection**    | 🟡 P2    | Automatically flag glitches and race conditions in combinational logic                                      |
| **Critical Path Analysis**     | 🟠 P1    | Identify the longest propagation path (determines maximum clock speed)                                      |

### 2.2 Simulation Performance

| Feature                         | Priority | Description                                                                                        |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| **Web Worker Simulation**       | 🟠 P1    | Move the engine to a Web Worker so the UI never freezes during complex simulations                 |
| **Compiled Simulation**         | 🟡 P2    | JIT-compile the circuit graph into a fast evaluation function instead of interpreting on each tick |
| **Hierarchical Simulation**     | 🟡 P2    | Custom circuits simulate as black boxes until inspected — reduces computation for large designs    |
| **Breakpoints & Watchpoints**   | 🟠 P1    | Pause simulation when a signal reaches a specific value or condition. Essential for debugging      |
| **Simulation Speed: Unlimited** | 🟡 P2    | Remove the 10 Hz cap — run as fast as the machine allows (with frame-skip for UI)                  |
| **Clock Domain Crossing**       | 🟡 P2    | Support multiple independent clocks with metastability detection                                   |

### 2.3 Advanced Logic Model

| Feature                      | Priority | Description                                                                                               |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| **Tri-State Bus Resolution** | 🟠 P1    | When multiple drivers connect to one bus, resolve value (no driver = Z, one driver = value, conflict = X) |
| **Weak Pull-Up / Pull-Down** | 🟡 P2    | Resistive pulls that can be overridden by active drivers (for I²C-style buses)                            |
| **Strength Levels**          | 🟢 P3    | IEEE 1164 full strength model (strong, pull, weak, high-impedance)                                        |
| **Asynchronous Reset**       | 🟡 P2    | Sequential components respond to reset immediately, not just on clock edges                               |

---

## 3. Editor & UX Improvements

### 3.1 Wire Drawing

| Feature                           | Priority | Description                                                                               |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| **Wire Waypoints / Bendpoints**   | 🟠 P1    | Click to add manual bend points to wires for cleaner routing                              |
| **Wire Labels / Net Names**       | 🟠 P1    | Name a wire (e.g., "DATA[3:0]") and connect distant points by name without a visible wire |
| **Auto-Router Improvements**      | 🟡 P2    | Better A* obstacle avoidance, Manhattan routing, avoid crossing other wires               |
| **Wire Color Coding**             | 🟡 P2    | Color wires by function (clock = blue, data = green, control = orange)                    |
| **Tunnels / Off-page Connectors** | 🟡 P2    | Connect signals between distant parts of the canvas without long wires                    |
| **Wire Drag & Reroute**           | 🟡 P2    | Grab a wire segment and drag to reroute without disconnecting                             |

### 3.2 Component Interaction

| Feature                         | Priority | Description                                                                                |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| **Flip (Mirror) Components**    | 🟠 P1    | Mirror a component horizontally/vertically (currently only rotation exists)                |
| **Component Grouping**          | 🟡 P2    | Select multiple components → group them visually (not a custom circuit, just a visual box) |
| **Align & Distribute**          | 🟡 P2    | Align selected components to top/bottom/left/right, distribute evenly                      |
| **Snap to Wire**                | 🟢 P3    | When placing a component, snap its pins to nearby wires for quick insertion                |
| **Component Resize**            | 🟢 P3    | Allow resizing comments, displays, and custom circuit instances                            |
| **Drag from Canvas to Library** | 🟡 P2    | Drag a selection directly into the Custom category as a shortcut                           |

### 3.3 Canvas & Navigation

| Feature                               | Priority | Description                                                                                |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| **Multi-Tab / Multi-Sheet**           | 🟠 P1    | Work on multiple circuit pages in tabs (like browser tabs). Essential for complex projects |
| **Canvas Bookmarks**                  | 🟢 P3    | Save named viewport positions to jump between areas in large circuits                      |
| **Infinite Canvas with Page Markers** | 🟢 P3    | Optional A4/letter page boundaries for print layout                                        |
| **Touch / Tablet Support**            | 🟡 P2    | Finger-based pan, pinch zoom, long-press for context menu on touch devices                 |
| **Dark/Light per-Panel**              | 🟢 P3    | Independent theme for schematic vs. UI (some prefer dark UI with white schematic)          |

### 3.4 Selection & Editing

| Feature                      | Priority | Description                                                                          |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------ |
| **Find & Replace Component** | 🟡 P2    | Search for all instances of a gate type and replace with another (preserving wiring) |
| **Lock Components**          | 🟡 P2    | Prevent accidental edits to finalized sub-sections                                   |
| **Selection Filters**        | 🟢 P3    | Filter selection to "only gates", "only wires", "only inputs", etc.                  |
| **Multi-Level Undo**         | 🟢 P3    | Show an undo history list with named entries (not just linear back/forward)          |

---

## 4. Analysis & Verification Tools

### 4.1 Truth Table Generator

| Feature                   | Priority | Description                                                                                     |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| **Auto Truth Table**      | 🟠 P1    | Select a sub-circuit → automatically generate its complete truth table by exhaustive simulation |
| **Truth Table Editor**    | 🟡 P2    | Define desired behavior as a truth table → auto-generate the circuit (synthesis)                |
| **Don't-Care Conditions** | 🟡 P2    | Mark outputs as "don't care" for certain input combinations (for optimization)                  |

### 4.2 Timing Analysis

| Feature                          | Priority | Description                                                                                          |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| **Timing Diagram View**          | 🟠 P1    | Multi-signal waveform viewer (like a logic analyzer) showing all probed signals aligned to the clock |
| **Timing Constraints**           | 🟡 P2    | Define max propagation time between two points; warn if violated                                     |
| **Setup/Hold Violation Markers** | 🟡 P2    | Highlight on the timing diagram where timing was violated                                            |

### 4.3 Boolean Algebra

| Feature                | Priority | Description                                                                    |
| ---------------------- | -------- | ------------------------------------------------------------------------------ |
| **Expression Viewer**  | 🟡 P2    | Show the boolean expression (e.g., Y = A·B + C̄) for any output in the circuit  |
| **Karnaugh Map**       | 🟡 P2    | Auto-generate K-map from a sub-circuit for visual minimization                 |
| **Logic Minimization** | 🟡 P2    | Quine-McCluskey / Espresso minimization suggesting simpler equivalent circuits |

### 4.4 Formal Verification

| Feature                        | Priority | Description                                                                      |
| ------------------------------ | -------- | -------------------------------------------------------------------------------- |
| **Equivalence Checking**       | 🟢 P3    | Verify that two circuits produce identical outputs for all inputs                |
| **Assertion-Based Monitoring** | 🟡 P2    | User defines rules (e.g., "output must never be X"); simulation flags violations |
| **State Machine Extraction**   | 🟡 P2    | Auto-detect FSM structure from sequential circuits and display state diagram     |

---

## 5. Project & Collaboration

### 5.1 File & Storage

| Feature                            | Priority | Description                                                                    |
| ---------------------------------- | -------- | ------------------------------------------------------------------------------ |
| **Cloud Save (Supabase/Firebase)** | 🟠 P1    | Save projects to cloud for access from any device                              |
| **Auto-Save**                      | 🟠 P1    | Periodic auto-save to prevent work loss                                        |
| **Project Gallery / Examples**     | 🟡 P2    | Built-in example circuits (half adder, 4-bit counter, simple CPU) for learning |
| **Version History**                | 🟡 P2    | Browse and restore previous versions of a project                              |
| **Multi-File Projects**            | 🟡 P2    | A project contains multiple circuit files referencing each other               |

### 5.2 Collaboration

| Feature                     | Priority | Description                                                                    |
| --------------------------- | -------- | ------------------------------------------------------------------------------ |
| **Share Link**              | 🟠 P1    | Generate a URL that opens a read-only view of your circuit (no account needed) |
| **Real-Time Collaboration** | 🟡 P2    | Multiple users editing the same circuit simultaneously (like Google Docs)      |
| **Comments & Annotations**  | 🟡 P2    | Leave review comments on specific components or sections                       |
| **Public Circuit Library**  | 🟡 P2    | Browse and import circuits shared by the community                             |

### 5.3 Import / Export

| Feature                    | Priority | Description                                                                |
| -------------------------- | -------- | -------------------------------------------------------------------------- |
| **Verilog Export**         | 🟠 P1    | Export your circuit as Verilog HDL code for use in real FPGA toolchains    |
| **VHDL Export**            | 🟡 P2    | Export as VHDL (alternative hardware description language)                 |
| **Verilog/VHDL Import**    | 🟡 P2    | Parse HDL code and generate a visual schematic                             |
| **SVG/PNG/PDF Export**     | 🟠 P1    | Export the schematic as a high-quality image for reports and documentation |
| **Netlist Export (SPICE)** | 🟢 P3    | Export as a SPICE netlist for analog simulation in external tools          |
| **BLIF/EDIF Import**       | 🟢 P3    | Import standard electronic design interchange formats                      |

---

## 6. Educational Features

### 6.1 Guided Learning

| Feature                   | Priority | Description                                                                             |
| ------------------------- | -------- | --------------------------------------------------------------------------------------- |
| **Interactive Tutorials** | 🟠 P1    | Step-by-step walkthroughs teaching basic gates → adders → flip-flops → CPUs             |
| **Challenge Mode**        | 🟡 P2    | "Build a circuit that satisfies this truth table" with auto-verification                |
| **Hint System**           | 🟡 P2    | Context-aware suggestions when you're stuck (e.g., "This input pin needs a connection") |
| **Concept Explanations**  | 🟡 P2    | Inline tooltips explaining what each gate does when you hover (togglable)               |

### 6.2 Visualization

| Feature                            | Priority | Description                                                                               |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| **Signal Flow Animation**          | 🟠 P1    | Animate signal propagation showing "waves" of values flowing through wires in slow motion |
| **Gate-Level Simulation Stepping** | 🟡 P2    | Step through propagation one gate at a time (not one clock at a time)                     |
| **Data Path Highlighting**         | 🟡 P2    | Click an output → highlight all paths that contributed to its value                       |
| **Bit Value Annotations**          | 🟡 P2    | Show the current value (0/1) directly on each wire segment (toggleable)                   |

### 6.3 Assessment

| Feature                    | Priority | Description                                                                  |
| -------------------------- | -------- | ---------------------------------------------------------------------------- |
| **Classroom Mode**         | 🟡 P2    | Teacher creates assignments; students submit circuits for automated grading  |
| **Circuit Grading Engine** | 🟡 P2    | Compare student circuit behavior against a reference truth table/timing spec |
| **Progress Tracking**      | 🟢 P3    | Track completed tutorials and challenges                                     |

---

## 7. Help Center & Component Knowledge Base

An integrated help system that provides documentation, theory explanations, and usage guides for every component — directly inside the editor. Designed for users from any engineering background who may not have digital electronics knowledge.

### 7.1 In-App Help Panel

| Feature                    | Priority | Description                                                                                                     |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| **Help Sidebar Panel**     | 🟠 P1    | A dedicated "Help" or "Learn" panel (togglable from the top bar) that shows documentation contextually          |
| **Context-Sensitive Help** | 🟠 P1    | Select any component → Help panel auto-shows its documentation (what it does, pin descriptions, usage examples) |
| **Search Help**            | 🟡 P2    | Full-text search across all help articles ("what is a flip-flop?", "how to add numbers")                        |
| **Help Shortcut**          | 🟠 P1    | Press F1 or ⌘? to open help. If a component is selected, jump directly to its docs                              |
| **"What's This?" Mode**    | 🟡 P2    | Click a ? button then click any UI element to see what it does                                                  |

### 7.2 Component Documentation Pages

Each component in the library should have a rich documentation page containing:

| Section                         | Priority | Description                                                                                                                |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Plain-English Description**   | 🟠 P1    | What the component does explained for non-EE users (with real-world analogies)                                             |
| **Pin Reference Table**         | 🟠 P1    | Every pin listed with its name, direction (in/out), and purpose                                                            |
| **Truth Table**                 | 🟠 P1    | Complete truth table for combinational components (AND, OR, MUX, etc.)                                                     |
| **Timing Diagram**              | 🟡 P2    | Visual waveform showing how sequential components respond to clock edges                                                   |
| **Interactive Mini-Demo**       | 🟡 P2    | A tiny embedded live circuit (like CircuitViewer) where users can toggle inputs and see outputs — learn by doing           |
| **Common Use Cases**            | 🟡 P2    | 2-3 examples of where this component is typically used (e.g., "D Flip-Flop is used in registers, counters, and pipelines") |
| **Related Components**          | 🟡 P2    | Links to similar or complementary components (e.g., from SR Latch → D Flip-Flop → Register)                                |
| **Gotchas & Tips**              | 🟡 P2    | Common mistakes (e.g., "Don't leave the CLK pin unconnected — it will float as UNKNOWN")                                   |
| **Symbol / Schematic Standard** | 🟢 P3    | Show the IEEE/IEC standard symbol alongside BitLab's representation                                                        |

### 7.3 Concept Articles (Theory Library)

Beyond individual components, provide articles explaining digital design concepts:

| Article Topic                    | Priority | Description                                                                          |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| **What is Binary?**              | 🟠 P1    | Ones, zeros, bits, bytes — the absolute basics for non-technical users               |
| **Boolean Algebra Basics**       | 🟠 P1    | AND, OR, NOT, truth tables, De Morgan's laws — with visual examples                  |
| **Combinational vs. Sequential** | 🟠 P1    | The difference between circuits with and without memory                              |
| **How Clocks Work**              | 🟠 P1    | What clock edges are, why sequential circuits need them, and what "setup time" means |
| **Number Systems**               | 🟡 P2    | Binary, hexadecimal, two's complement — how computers represent numbers              |
| **Building an Adder**            | 🟡 P2    | Step-by-step walkthrough from half adder → full adder → 4-bit ripple carry           |
| **Building a Counter**           | 🟡 P2    | How flip-flops chain to count, with toggle and synchronous variants                  |
| **State Machines (FSM)**         | 🟡 P2    | Moore vs. Mealy, state diagrams, and how to implement them in BitLab                 |
| **Memory & Storage**             | 🟡 P2    | From a single flip-flop → register → RAM. How computers remember things              |
| **Building a Simple CPU**        | 🟡 P2    | From ALU + registers + control → a programmable processor (capstone article)         |
| **Bus Architecture**             | 🟡 P2    | Why buses exist, how tri-state works, and how to share wires                         |
| **Debugging Circuits**           | 🟡 P2    | Using probes, the console, step mode, and signal tracing to find bugs                |

### 7.4 Tooltips & Inline Hints

| Feature                   | Priority | Description                                                                                                |
| ------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| **Pin Tooltips**          | 🟠 P1    | Hover any pin on the canvas → tooltip shows pin name, direction, and current value                         |
| **Component Hover Card**  | 🟡 P2    | Hover a component in the Category Panel → show a summary card (description + pin count + mini truth table) |
| **First-Use Hints**       | 🟡 P2    | On first launch, show unobtrusive hints ("Drag a component here", "Click a pin to start a wire")           |
| **Dismiss & Reset Hints** | 🟢 P3    | Users can dismiss hints permanently or re-enable them from Settings                                        |

### 7.5 Video & Media

| Feature                        | Priority | Description                                                                                   |
| ------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| **Embedded GIFs / Animations** | 🟡 P2    | Short animations in help articles showing interaction patterns (e.g., how to draw a wire)     |
| **Video Tutorial Links**       | 🟢 P3    | Link to YouTube/video walkthroughs for complex topics                                         |
| **Printable Cheat Sheet**      | 🟡 P2    | A one-page PDF/HTML reference card with all gates, their symbols, truth tables, and shortcuts |

---

## 8. Performance & Scalability

| Feature                                        | Priority | Description                                                                                                            |
| ---------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Canvas Virtualization**                      | 🟠 P1    | Only render components visible in the viewport. Currently all components render always — causes lag at 500+ components |
| **Wire Culling**                               | 🟠 P1    | Skip rendering off-screen wires                                                                                        |
| **Incremental Re-render**                      | 🟡 P2    | Only re-render components whose signals changed (not the full SVG tree)                                                |
| **GPU-Accelerated Rendering (WebGL/Canvas2D)** | 🟡 P2    | Replace SVG with WebGL or Canvas2D for 10x rendering performance at scale                                              |
| **Lazy Component Library**                     | 🟢 P3    | Don't load evaluation functions for unused gate types until they're placed                                             |
| **Large Circuit Benchmarks**                   | 🟡 P2    | Target: 2000+ components, 5000+ wires at 60fps                                                                         |

---

## 9. Accessibility & Internationalization

| Feature                           | Priority | Description                                                                   |
| --------------------------------- | -------- | ----------------------------------------------------------------------------- |
| **Full Keyboard Navigation**      | 🟠 P1    | Navigate between components, draw wires, and open menus without a mouse       |
| **Screen Reader Announcements**   | 🟡 P2    | Announce signal changes, connection results, and errors via ARIA live regions |
| **High Contrast Mode**            | 🟡 P2    | Signal colors and component outlines meet WCAG AAA contrast ratios            |
| **Additional Languages**          | 🟡 P2    | Hindi, Spanish, Mandarin, Japanese, German, French localization               |
| **RTL Layout Support**            | 🟢 P3    | Right-to-left UI for Arabic/Hebrew                                            |
| **Dyslexia-Friendly Font Option** | 🟢 P3    | OpenDyslexic or similar for pin labels and UI text                            |

---

## 10. Mobile & Cross-Platform

| Feature                          | Priority | Description                                                           |
| -------------------------------- | -------- | --------------------------------------------------------------------- |
| **Responsive Layout**            | 🟠 P1    | Collapsible panels, bottom sheet for properties on narrow screens     |
| **Touch Gestures**               | 🟠 P1    | Tap to place, two-finger pan, pinch zoom, long-press for context menu |
| **PWA (Installable App)**        | 🟡 P2    | Service worker for offline use + "Add to Home Screen"                 |
| **Desktop App (Electron/Tauri)** | 🟡 P2    | Native wrapper with filesystem access and better performance          |
| **iPad Pencil Support**          | 🟢 P3    | Draw wires with a stylus for a natural sketching feel                 |

---

## 11. Testing & Quality

| Feature                          | Priority | Description                                                                            |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| **Unit Test Suite**              | 🟠 P1    | Vitest + fast-check for engine logic (pin filtering, propagation, transactions)        |
| **E2E Tests**                    | 🟡 P2    | Playwright tests for key user flows (place component, draw wire, simulate, undo)       |
| **Visual Regression Tests**      | 🟡 P2    | Screenshot comparison for SVG rendering (gate shapes, wire paths, signal colors)       |
| **Property-Based Testing**       | 🟠 P1    | Fast-check generators for circuit states, verifying engine invariants hold universally |
| **CI/CD Pipeline**               | 🟠 P1    | GitHub Actions running lint, type-check, test on every PR                              |
| **Performance Regression Tests** | 🟢 P3    | Benchmark suite tracking simulation speed across commits                               |

---

## 12. Advanced Features (Toward Real-World Simulators)

### 11.1 Hardware Description Language Integration

| Feature                       | Priority | Description                                                                         |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------- |
| **Inline Verilog Components** | 🟡 P2    | Write a component's behavior in Verilog; BitLab compiles it into a simulatable gate |
| **Testbench Generation**      | 🟡 P2    | Auto-generate a Verilog testbench from your circuit for external simulation         |
| **Synthesis Preview**         | 🟢 P3    | Show estimated gate count, LUT usage, and critical path if targeting an FPGA        |

### 11.2 Microprocessor Design Kit

| Feature                       | Priority | Description                                                          |
| ----------------------------- | -------- | -------------------------------------------------------------------- |
| **Instruction Set Simulator** | 🟡 P2    | Define a custom ISA; BitLab assembles and loads programs into ROM    |
| **Assembly Editor**           | 🟡 P2    | Write assembly code alongside the circuit; step through instructions |
| **Pipeline Visualization**    | 🟢 P3    | Show instruction flow through fetch/decode/execute stages            |
| **Memory Map View**           | 🟡 P2    | Hex dump of RAM contents updated in real-time during simulation      |

### 11.3 Mixed-Signal Preview

| Feature                        | Priority | Description                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------------ |
| **Analog Voltage Display**     | 🟢 P3    | Show approximate voltage levels (0V, 3.3V, 5V) instead of just 0/1 |
| **RC Delay Modeling**          | 🟢 P3    | Simulate wire capacitance effects on signal edges                  |
| **Power Consumption Estimate** | 🟢 P3    | Estimate dynamic + static power based on switching activity        |

### 11.4 FPGA Targeting

| Feature                   | Priority | Description                                                                   |
| ------------------------- | -------- | ----------------------------------------------------------------------------- |
| **Verilog → Bitstream**   | 🟢 P3    | Compile circuits for real FPGAs (iCE40, ECP5) via Yosys + nextpnr integration |
| **Pin Assignment Editor** | 🟢 P3    | Map BitLab inputs/outputs to physical FPGA pins                               |
| **USB Programming**       | 🟢 P3    | Flash the bitstream to a connected FPGA dev board from the browser (WebUSB)   |

---

## 13. Infrastructure & DevOps

| Feature                       | Priority | Description                                                                        |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------- |
| **Error Reporting (Sentry)**  | 🟡 P2    | Capture and report production errors automatically                                 |
| **Analytics (Privacy-First)** | 🟢 P3    | Understand which features are used without tracking individuals                    |
| **Documentation Site**        | 🟠 P1    | Public docs site with guides, API reference (for custom components), and examples  |
| **Plugin / Extension API**    | 🟡 P2    | Let users write plugins that add new gate types, wire renderers, or analysis tools |
| **Changelog & Release Notes** | 🟡 P2    | In-app "What's New" after updates                                                  |

---

## 14. Miscellaneous Quality-of-Life

| Feature                              | Priority | Description                                                            |
| ------------------------------------ | -------- | ---------------------------------------------------------------------- |
| **Search in Canvas**                 | 🟡 P2    | Find a component by label/type and zoom to it                          |
| **Wire Count on Bus Hover**          | 🟢 P3    | Show "8 wires" tooltip when hovering a bus                             |
| **Copy as Image**                    | 🟡 P2    | ⌘Shift+C copies the current view to clipboard as PNG                   |
| **Dark Mode for Exports**            | 🟢 P3    | Export schematic images with white background even in dark mode        |
| **Recent Projects**                  | 🟡 P2    | Quick access list of recently opened circuits                          |
| **Notification Toasts**              | 🟢 P3    | Brief confirmation toasts for save, export, copy actions               |
| **Custom Component Editor**          | 🟡 P2    | Edit a custom circuit in-place without re-creating from scratch        |
| **Undo for Custom Circuit Deletion** | 🟢 P3    | Accidentally deleted a custom gate? Undo should restore it             |
| **Batch Wire Deletion**              | 🟢 P3    | Select and delete multiple wires without selecting their components    |
| **Probe Export as CSV**              | 🟡 P2    | Export probe waveform data for analysis in Excel/Python                |
| **Configurable Pin Names**           | 🟡 P2    | Rename pins on any component instance (override default labels)        |
| **Component Color Picker**           | 🟢 P3    | Assign colors to components for visual grouping                        |
| **Zoom to Selection**                | 🟢 P3    | After selecting, press a key to zoom the viewport to fit the selection |

---

## 15. Assembly Code Execution

Load and run assembly programs on circuits you've built (e.g., a custom CPU).

### 14.1 Assembly File Support

| Feature                         | Priority | Description                                                                                                 |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| **Assembly File Loader**        | 🟠 P1    | Open `.asm` or `.s` files from disk, parse them, and load binary into the circuit's ROM/RAM component       |
| **Built-In Assembler**          | 🟠 P1    | Assemble instructions into machine code in-browser (no external tools needed). Supports user-defined ISAs   |
| **ISA Definition File**         | 🟠 P1    | JSON/YAML schema where users declare their instruction set (opcode map, operand formats, addressing modes)  |
| **Program Counter Binding**     | 🟡 P2    | Bind the assembler output to a specific counter/register in the circuit so execution advances automatically |
| **Inline Assembly Editor**      | 🟡 P2    | A code editor panel (with syntax highlighting, line numbers, error markers) alongside the circuit canvas    |
| **Step Through Instructions**   | 🟠 P1    | Step one instruction at a time and see the corresponding circuit signals change                             |
| **Breakpoints on Instructions** | 🟡 P2    | Set breakpoints on assembly lines; simulation pauses when PC reaches that address                           |
| **Register/Memory Watch Panel** | 🟡 P2    | Live display of register contents and memory contents in hex/decimal/binary during execution                |
| **Assembly Error Reporting**    | 🟡 P2    | Syntax errors, undefined labels, and out-of-range immediates shown inline with line numbers                 |
| **Multiple ISA Presets**        | 🟡 P2    | Ship with common ISA templates (MIPS-lite, RISC-V RV32I subset, custom 8-bit) that users can pick from      |
| **Instruction Trace Log**       | 🟢 P3    | Log every executed instruction with timestamp/tick for post-mortem analysis                                 |

### 14.2 Circuit ↔ Assembly Integration

| Feature                          | Priority | Description                                                                            |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| **Auto-Detect ROM Component**    | 🟡 P2    | When assembling, automatically find the ROM in the circuit and load the binary         |
| **Address Space Mapping**        | 🟡 P2    | Define which memory ranges map to which RAM/ROM components in the circuit              |
| **I/O Port Mapping**             | 🟡 P2    | Map assembly `IN`/`OUT` instructions to specific input/output components on the canvas |
| **Call Stack Visualization**     | 🟢 P3    | Show the call stack as instructions execute (CALL/RET tracking)                        |
| **Pipeline Hazard Highlighting** | 🟢 P3    | For pipelined CPUs, highlight data/control hazards in the assembly listing             |

---

## 16. Multi-Canvas Tabs

Work on multiple circuits simultaneously in a tabbed interface, like browser tabs or IDE file tabs.

### 15.1 Tab Management

| Feature                   | Priority | Description                                                                 |
| ------------------------- | -------- | --------------------------------------------------------------------------- |
| **Tabbed Circuit Editor** | 🟠 P1    | Each circuit opens in its own tab. Switch between tabs without losing state |
| **New Tab**               | 🟠 P1    | Create a new blank circuit in a new tab (⌘T / Ctrl+T)                       |
| **Close Tab**             | 🟠 P1    | Close a tab (⌘W / Ctrl+W) with unsaved-changes warning                      |
| **Drag to Reorder Tabs**  | 🟡 P2    | Reorder tabs by dragging                                                    |
| **Tab Context Menu**      | 🟡 P2    | Right-click tab for Close, Close Others, Close All, Duplicate               |
| **Split View**            | 🟡 P2    | View two circuits side-by-side (horizontal or vertical split)               |
| **Tab Persistence**       | 🟡 P2    | Reopen all previously open tabs when BitLab restarts                        |

### 15.2 Cross-Tab Features

| Feature                              | Priority | Description                                                                                      |
| ------------------------------------ | -------- | ------------------------------------------------------------------------------------------------ |
| **Copy/Paste Between Tabs**          | 🟠 P1    | Copy components and wires from one tab and paste into another                                    |
| **Drag Components Between Tabs**     | 🟡 P2    | Drag a component from one canvas to another                                                      |
| **Reference Components Across Tabs** | 🟡 P2    | A custom circuit in Tab A can be used as a component in Tab B                                    |
| **Independent Simulation Per Tab**   | 🟠 P1    | Each tab runs its own simulation independently (different clock speeds, different states)        |
| **Linked Simulation Mode**           | 🟢 P3    | Optionally link two tabs so signals in one drive inputs in another (inter-circuit communication) |
| **Tab Pinning**                      | 🟢 P3    | Pin important tabs so they can't be accidentally closed                                          |

### 15.3 Project-Level Organization

| Feature                         | Priority | Description                                                                                       |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| **Project = Multiple Circuits** | 🟠 P1    | A `.bitlab` project file bundles multiple circuit tabs + their custom components + assembly files |
| **Circuit Dependency Graph**    | 🟡 P2    | Visualize which circuits use which custom components from other tabs                              |
| **Tab Groups / Folders**        | 🟢 P3    | Group related tabs (e.g., "ALU", "Control Unit", "Datapath") with color-coded labels              |

---

## 17. BitLang — A Domain-Specific Language for BitLab

BitLang is a purpose-built language for describing, generating, and testing digital circuits within BitLab. It bridges the gap between visual design and textual specification without requiring users to learn full Verilog/VHDL.

### 16.1 Language Overview

BitLang is designed to be:

- **Readable** — looks like pseudocode, not C or Verilog
- **Circuit-native** — first-class concepts for gates, wires, buses, clocks, and modules
- **Bidirectional** — write BitLang → generate circuit, OR select circuit → export as BitLang
- **Testable** — built-in assertions and test harness syntax

### 16.2 Core Language Features

| Feature                     | Priority | Description                                                                                       |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| **Module Declaration**      | 🟠 P1    | `module HalfAdder(in A, B → out Sum, Carry)` — defines a reusable circuit block                   |
| **Wire Declarations**       | 🟠 P1    | `wire x = A AND B` — named signals with expressions                                               |
| **Bus Declarations**        | 🟡 P2    | `bus[8] data = {D7, D6, D5, D4, D3, D2, D1, D0}` — multi-bit groupings                            |
| **Component Instantiation** | 🟠 P1    | `let reg = Register4(D0..D3, clk → Q0..Q3)` — place and connect a component                       |
| **Conditional Logic**       | 🟡 P2    | `if SEL then Y = A else Y = B` — generates a mux                                                  |
| **Loop / Generate**         | 🟡 P2    | `for i in 0..7: wire chain[i] = FullAdder(A[i], B[i], carry[i])` — generate repetitive structures |
| **Clock Domain Annotation** | 🟡 P2    | `@clock(sys_clk, 10Hz)` — associate components with a clock domain                                |
| **Parameters / Generics**   | 🟡 P2    | `module Adder<N: int>(in A[N], B[N] → out Sum[N], Cout)` — parameterized modules                  |
| **Import / Include**        | 🟡 P2    | `import "alu.bitlang"` — reuse modules across files                                               |
| **Comments**                | 🟠 P1    | `// line comment` and `/* block comment */`                                                       |

### 16.3 Test & Assertion Syntax

| Feature                   | Priority | Description                                                                                   |
| ------------------------- | -------- | --------------------------------------------------------------------------------------------- |
| **Test Blocks**           | 🟠 P1    | `test "AND gate" { set A=1, B=1; assert Y == 1; }` — define test cases inline                 |
| **Stimulus Sequences**    | 🟡 P2    | `sequence { tick; set CLK=1; tick; set CLK=0; }` — describe clock patterns                    |
| **Assert with Message**   | 🟡 P2    | `assert Q == 1 : "Flip-flop should have latched"`                                             |
| **Coverage Report**       | 🟢 P3    | After running all tests, show which input combinations were exercised                         |
| **Property Declarations** | 🟡 P2    | `property "no glitch": always(Y changes only after CLK rises)` — formal property specs        |
| **Randomized Testing**    | 🟢 P3    | `fuzz(A, B) for 1000 iterations { assert Sum == A + B; }` — property-based testing in BitLang |

### 16.4 BitLang ↔ Circuit Bidirectional Sync

| Feature              | Priority | Description                                                                                |
| -------------------- | -------- | ------------------------------------------------------------------------------------------ |
| **BitLang → Canvas** | 🟠 P1    | Parse BitLang source → place components + draw wires on the canvas automatically           |
| **Canvas → BitLang** | 🟡 P2    | Select a sub-circuit → export as BitLang code for documentation or reuse                   |
| **Live Sync Mode**   | 🟡 P2    | Edit BitLang code and see the circuit update in real-time (like a WYSIWYG ↔ source toggle) |
| **Diff View**        | 🟢 P3    | Show what changed between two versions of a BitLang file (added/removed wires)             |
| **Error Recovery**   | 🟡 P2    | Syntax errors in BitLang don't crash; show red squiggles and partial parsing               |

### 16.5 BitLang Editor Integration

| Feature                    | Priority | Description                                                                                        |
| -------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| **Integrated Code Editor** | 🟠 P1    | Monaco-based or CodeMirror editor panel with syntax highlighting, auto-complete, and error markers |
| **Autocomplete**           | 🟡 P2    | Suggest module names, pin names, and keywords as you type                                          |
| **Go to Definition**       | 🟡 P2    | Click a module name → jump to its definition                                                       |
| **Hover Documentation**    | 🟡 P2    | Hover a keyword or module → see its pin signature and description                                  |
| **Format Document**        | 🟢 P3    | Auto-format BitLang code (consistent indentation, alignment)                                       |
| **Multiple BitLang Files** | 🟡 P2    | A project can have multiple `.bitlang` files with import/export between them                       |

### 16.6 Example BitLang Code

```bitlang
// 4-bit ripple carry adder
module RippleAdder4(in A[4], B[4], Cin → out Sum[4], Cout) {
  wire carry[5]
  carry[0] = Cin

  for i in 0..3 {
    let fa = FullAdder(A[i], B[i], carry[i] → Sum[i], carry[i+1])
  }

  Cout = carry[4]
}

// Test the adder
test "3 + 5 = 8" {
  set A = 0b0011, B = 0b0101, Cin = 0
  tick
  assert Sum == 0b1000
  assert Cout == 0
}

test "15 + 1 = overflow" {
  set A = 0b1111, B = 0b0001, Cin = 0
  tick
  assert Sum == 0b0000
  assert Cout == 1
}
```

---

## Implementation Phases (Suggested)

### Phase 1 — Foundation (Stability & Testing)

- CI/CD pipeline
- Unit + property-based test suite
- Web Worker simulation
- Canvas virtualization / wire culling
- Auto-save

### Phase 2 — Core Feature Gaps

- Tri-state buffer + shared bus resolution
- RAM / ROM / Register File
- Propagation delay model
- Wire waypoints + net names
- SVG/PNG export
- Timing diagram view

### Phase 3 — Educational & Collaboration

- Interactive tutorials
- Signal flow animation
- Truth table generator
- Share link
- Cloud save
- Project gallery

### Phase 4 — Professional Features

- Verilog export / import
- ALU, programmable clock divider
- Multi-tab circuits (tabbed editor with independent simulations)
- Breakpoints & watchpoints
- Assembly file loader + built-in assembler + ISA definitions
- Assembly step-through with register/memory watch panel
- Real-time collaboration

### Phase 5 — BitLang & Platform Scale

- BitLang language design + parser + code editor integration
- BitLang → Canvas generation (modules, wires, loops)
- BitLang test/assertion execution engine
- Canvas → BitLang export
- Mobile responsive + touch
- Desktop app (Tauri)
- Plugin API
- Community circuit library
- FPGA targeting
- Additional languages

---

## Contributing

If you want to contribute to any of these features:

1. Pick a feature from this list
2. Open a discussion or issue to refine scope
3. Check if there's an existing spec in `.kiro/specs/`
4. If not, create one following the requirements → design → tasks workflow
5. Submit a PR referencing the feature

Priority levels are suggestions — community demand and contribution readiness may shift them.
