# Task ID: TASK-002
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

---

## Objective & Success

**Primary Objective:** Build a second page in the frontend where the user can 
pick an algorithm and a starting capacity %, then watch a live step-by-step 
simulation of the warehouse running in the browser — slowed down so every 
action is visible.

**Success Criteria:**
- User can select any algorithm + starting capacity % and hit Play
- Warehouse renders as a 2D top-down grid showing every cell
- Simulation runs step by step at human-readable speed (controllable)
- Every action the algorithm takes is visible in real time
- Page lives at /visualizer route, linked from the main benchmark page

**Definition of Done:**
- [ ] /visualizer page exists and is navigable from main page
- [ ] Algorithm selector + capacity % selector working
- [ ] 2D warehouse grid renders correctly
- [ ] Simulation plays step by step with visible actions
- [ ] Speed control works (slow / normal / fast)
- [ ] Event log panel shows what's happening in plain English
- [ ] Stats panel updates live (throughput, Z-blocks, pallets so far)

---

## Technical Context

**Warehouse Structure:**
- Grid of cells, each cell is a stack of pallets (Z-axis = stacking height)
- Cells are organized into aisles and columns
- Each cell has: position (aisle, column), current stack height (Z-level), 
  and contents (empty / pallet / blocked)
- Z-Block = a pallet that needs to be moved because something underneath 
  it needs to be retrieved first

**Simulation Logic (JS reimplementation — do not call backend):**
Reimplement the core warehouse sim logic in JS/React state. It does not 
need to be 100% identical to Python — it needs to be faithful enough to 
show realistic algorithm behavior. Core loop:

1. Initialize warehouse grid with starting capacity % of cells filled randomly
2. Each tick: generate a retrieval request for a random pallet
3. Algorithm decides: can it retrieve directly, or does it need to relocate 
   blocking pallets first?
4. If relocation needed: algorithm picks where to move the blocking pallet 
   (this is where algos differ)
5. Move is executed, pallet retrieved, stats updated
6. Repeat

**Algorithm Behaviors to Implement:**
- **Simple Baseline:** relocate blocking pallets to first available free slot 
  anywhere
- **Z-Safe Simple:** prefer placing pallets in slots where they won't block 
  others (low Z positions, away from high-demand items)
- **Column Grouping:** keep pallets grouped by column, minimizing cross-aisle 
  relocations
- **Z-Weighted Pro:** score every available slot and pick highest score based 
  on Z-safety + proximity
- **Distance Greedy:** relocate to nearest free slot in same aisle only → 
  crashes when no slot available in aisle (show this visually!)

**Visual Design — 2D Top-Down Grid:**
Each cell in the grid is a colored square:
- ⬜ Empty cell
- 🟦 Pallet present (color intensity = stack height, darker = taller stack)
- 🟨 Cell being accessed this tick (retrieval target)
- 🟧 Cell being relocated (source of a Z-block move)
- 🟩 Cell receiving a relocated pallet (destination)
- 🟥 Cell that caused a crash / error (Distance Greedy failure)

Animate transitions — flash the relevant cells when an action happens.

**UI Layout:**
Left panel (70%): warehouse grid
Right panel (30%): 
  - Controls: algorithm picker, capacity % slider, play/pause, speed slider
  - Live stats: pallets retrieved, Z-blocks so far, throughput/h, elapsed sim time
  - Event log: last 20 actions in plain English e.g.:
    "Retrieved pallet at A3-C2"
    "Z-Block! Moved pallet from A3-C2 to A5-C1 first"
    "⚠️ Distance Greedy: no slot in aisle — CRASHED"

**Speed Control:**
- Slow: 1 step per second
- Normal: 5 steps per second  
- Fast: 30 steps per second
- (Turbo: instant / skip animation for stress testing)

---

## Implementation Roadmap

### Phase 1: Warehouse State + Sim Engine
- **1.1** Define warehouse grid state in JS (aisles × columns × Z-height)
- **1.2** Implement capacity % initializer (randomly fill X% of cells)
- **1.3** Implement core sim tick loop (request → check → relocate → retrieve)
- **1.4** Implement all 5 algorithm strategies as swappable functions

### Phase 2: Grid Renderer
- **2.1** Render 2D grid with correct color coding per cell state
- **2.2** Animate active cells on each tick (flash yellow/orange/green)
- **2.3** Show Z-height as color intensity (darker = higher stack)

### Phase 3: Controls + Stats Panel
- **3.1** Algorithm dropdown + capacity % slider
- **3.2** Play / Pause / Reset buttons
- **3.3** Speed slider (slow → turbo)
- **3.4** Live stats updating every tick
- **3.5** Scrolling event log, last 20 actions

### Phase 4: Navigation + Polish
- **4.1** /visualizer route, back button to main benchmark page
- **4.2** Link from main benchmark table ("▶ Watch this algo" per row)
- **4.3** Crash state for Distance Greedy — red flash, log entry, sim stops 
  with clear error message
- **4.4** Clean responsive layout

---

## Validation & Testing

**Manual Testing:**
- Run Simple Baseline at 75% — should see lots of orange (relocations)
- Run Z-Weighted Pro at 75% — should see almost no orange
- Run Column Grouping — relocations should stay within same column visually
- Run Distance Greedy at 25%+ — should crash visibly with red cell + error log
- Speed slider should smoothly control tick rate
- Reset should fully reinitialize the grid

**Edge Cases:**
- Warehouse completely full (100%) → sim should handle gracefully
- Algorithm crashes on tick 1 → don't freeze UI, show error state
- Very large grid → grid should scroll, not overflow layout

---

## Agent Notes

**Key Constraint:** JS sim does not need to match Python output exactly — 
it needs to be visually faithful and show the correct behavioral differences 
between algorithms. The benchmark page has the real numbers; this page is 
for intuition and debugging.

**Why 2D top-down:** easiest to see aisle/column structure and Z-blocking 
behavior simultaneously. Color intensity handles the Z-axis without needing 3D.

**Linked from TASK-001:** Main benchmark table should have a 
"▶ Watch" button per algorithm that links to /visualizer?algo=<name>&cap=<pct>