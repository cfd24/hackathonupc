# Task ID: TASK-001
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

---

## Objective & Success

**Primary Objective:** Build a complete frontend UI that visualizes warehouse 
algorithm benchmark results, perfectly mirroring terminal output with no 
recomputation or reformatting.

**Success Criteria:**
- All 14 algorithms displayed across all 4 capacity levels (0%, 25%, 50%, 75%)
- Charts for Throughput/h vs Capacity % and Z-Blocks vs Capacity %
- Badge/highlight system for best performers per metric
- Crashed/failed runs (e.g. Distance Greedy) handled gracefully with visual indicator
- Data layer fully decoupled from UI (JSON input, easily swappable)
- Numbers match terminal output exactly — no rounding, no reformatting

**Definition of Done:**
- [ ] Comparison table renders all algorithms × all capacity levels
- [ ] Throughput line chart works correctly
- [ ] Z-Blocks line chart works correctly
- [ ] Best-performer badges display correctly
- [ ] Failed runs show clearly (red row + FAILED badge)
- [ ] JSON data layer is separate and swappable
- [ ] UI is clean, polished, and readable

---

## Current State Analysis

**What Exists Now:** Terminal benchmark script fully working in main/main.py. 
All 14 algorithms tested and producing results. No frontend exists yet.

**Known Issues:**
- Distance Greedy crashes at 25%, 50%, 75% capacity with error: 
  `No space to relocate blocking Z=1 box` — UI must handle null/failed runs
- Do not attempt to fix or recompute anything — UI is visualization only

---

## Technical Context

**Data Structure — one record per algorithm run:**
```json
{
  "algorithm": "Z-Safe Weighted Y-Safe",
  "capacity_pct": 75,
  "sim_time_s": 59425,
  "pallets": 551,
  "throughput_per_h": 60.6,
  "z_blocks": 94,
  "z_safe": true,
  "status": "ok"  // or "failed"
}
```

**All algorithms (14 total):**
- Simple Baseline
- Z-Safe Simple
- Z-Safe Weighted Y-Safe
- Z-Weighted Pro
- Column Grouping
- Distance Greedy ← crashes at 25%+ capacity, status: "failed"
- (remaining 8 Z-Safe variants — data will be provided via JSON)

**Capacity levels:** 0%, 25%, 50%, 75%

**Key benchmark results to seed as default data:**

75% Capacity Stress Test (top performers):
| Algorithm              | Sim Time (s) | Pallets | Throughput/h | Z-Blocks |
|------------------------|-------------|---------|--------------|----------|
| Z-Safe Weighted Y-Safe | 59,425      | 551     | 60.6         | 94       |
| Z-Safe Simple          | 59,547      | 551     | 60.5         | 99       |
| Z-Weighted Pro         | 59,855      | 551     | 60.1         | 0        |
| Simple Baseline        | 59,198      | 551     | 60.8         | 2,055    |
| Column Grouping        | 62,754      | 551     | 57.4         | 0        |

0% Capacity Results:
| Algorithm        | Sim Time (s) | Pallets | Throughput/h | Z-Blocks |
|------------------|-------------|---------|--------------|----------|
| Z-Safe Simple    | 5,222       | 726     | 89.4         | 0        |
| Column Grouping  | 5,372       | 726     | 70.0         | 0        |
| Simple Baseline  | 6,222       | 726     | 78.5         | 48       |

**Key Technologies:** React + Tailwind + Recharts for charts

**Entry Point:** Single page app, loads default JSON data on mount, 
allows pasting/importing new JSON to update all views

---

## Implementation Roadmap

### Phase 1: Data Layer
**Sub-tasks:**
- **1.1** Define full JSON schema as above — all fields required
- **1.2** Seed default data with all known benchmark results above
- **1.3** Add import/paste JSON panel to update data at runtime

### Phase 2: Comparison Table
**Sub-tasks:**
- **2.1** Render full table: rows = algorithms, columns = capacity levels, 
  cells = throughput/h + z-blocks + sim time
- **2.2** Highlight best value per column per metric
- **2.3** Show FAILED in red for crashed runs (Distance Greedy at 25%+)

### Phase 3: Badge System
**Sub-tasks:**
- **3.1** 🏆 Fastest — lowest sim time per capacity level
- **3.2** ⚡ Best Throughput — highest throughput/h
- **3.3** 🧹 Zero Relocations — 0 Z-Blocks
- **3.4** ⭐ Best Balance — highest throughput with lowest Z-Blocks 
  (weighted score: throughput/h minus penalty for z_blocks)

### Phase 4: Charts
**Sub-tasks:**
- **4.1** Line chart: Throughput/h vs Capacity % — one line per algorithm
- **4.2** Line chart: Z-Blocks vs Capacity % — one line per algorithm
- **4.3** Skip failed data points (don't break chart on null)
- **4.4** Legend, tooltips, clean axis labels

### Phase 5: Polish
**Sub-tasks:**
- **5.1** Responsive layout
- **5.2** Color coding: Z-Safe algorithms in one color family, 
  baseline variants in another, failed runs in red
- **5.3** Summary card at top: "Best overall: Z-Safe Weighted Y-Safe — 
  95% fewer relocations than baseline at same speed"

---

## Validation & Testing

**Manual Testing:**
- Paste in new JSON benchmark results → all views update correctly
- Distance Greedy shows FAILED at 25%, 50%, 75% — no crashes in UI
- Numbers in table match terminal output exactly
- Charts render correctly with missing data points (failed runs)

**Edge Cases:**
- Algorithm with all failed runs → entire row shown as failed
- 0 Z-Blocks → render as 0, not blank
- New algorithm in JSON not in default list → renders correctly

---

## Agent Notes

**Key Constraint:** This is a visualization layer only. Do not recompute, 
re-sort, or reformat any numbers. What comes in from JSON goes straight 
to the UI. Terminal output is the source of truth.

**Next Steps After This Task:** Once UI is live, we will pipe terminal 
benchmark output directly into the JSON import panel to keep everything 
in sync.