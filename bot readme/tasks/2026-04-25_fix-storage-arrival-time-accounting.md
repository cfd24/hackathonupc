# Task ID: FIX-STORAGE-ARRIVAL-TIME-ACCOUNTING
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Bug

## Objective & Success

**Primary Objective:** Ensure storage movement time is counted while box arrival cadence is only applied once per incoming box.

**Success Criteria:**
- Storage still moves the Y-level shuttle and updates `shuttles_time`.
- The simulator advances `warehouse.global_time` once per arriving box.
- `Warehouse.move_shuttle()` no longer mutates arrival cadence.
- Architecture documentation says storage and retrieval both contribute shuttle movement time.

**Definition of Done:**
- [x] Inspect storage timing path.
- [x] Remove duplicated arrival interval increment from warehouse movement.
- [x] Keep storage movement timing in `store_box()`.
- [x] Update architecture documentation.
- [x] Run syntax validation.

## Current State Analysis

**What Exists Now:** `Simulator.run()` advances `warehouse.global_time` by `arrival_interval` before processing each incoming box. `Warehouse.store_box()` moves the shuttle to the selected storage location, which updates that shuttle's availability time.

**Code Locations:**
- `controllers/silo_simulator/simulator.py`: Incoming box loop and call to `store_box()`.
- `controllers/silo_simulator/warehouse.py`: Shuttle movement, storage, and retrieval timing.
- `bot readme/architecture/OUTLINE.md`: Architecture documentation.

**Known Issue:** Before this fix, `Simulator.run()` passed `arrival_interval` into `store_box()`, and `Warehouse.move_shuttle()` also added it to `global_time`. That meant arrival cadence could be counted twice for storage.

## Implementation Roadmap

### Phase 1: Diagnose
**Dependencies:** Existing simulator timing implementation.

**Sub-tasks:**
- **1.1** Confirm that `store_box()` calls `move_shuttle()`.
- **1.2** Confirm that `retrieve_box()` also calls `move_shuttle()`.
- **1.3** Identify duplicated arrival interval mutation.

### Phase 2: Fix
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Make `move_shuttle()` responsible only for shuttle movement timing.
- **2.2** Make `Simulator.run()` the single owner of box arrival cadence.
- **2.3** Keep final `total_time` based on shuttle, global, and robot completion clocks.

### Phase 3: Documentation
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Update architecture notes for storage and retrieval timing.

## Progress Tracking

**Overall Progress:** 3/3 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete

**Last Activity:** Removed duplicated arrival interval accounting while preserving storage shuttle movement time.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Arrival cadence is a global simulator concern. Shuttle movement duration is a warehouse concern. Storage and retrieval both call `move_shuttle()`, so both contribute to simulated shuttle time.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite exists.

**Syntax Validation:** `python -m py_compile controllers/silo_simulator/warehouse.py controllers/silo_simulator/simulator.py main/main.py`

## Deployment & Cleanup

**Deployment Checklist:**
- [x] No dependency changes required.
- [x] Documentation updated.

**Handoff Notes:** The simulator currently models one shuttle per Y level, not one shuttle per `(aisle, Y)` pair.

## Agent Notes

**Decisions Made:** Kept `arrival_interval` handling in `Simulator.run()` because arrivals belong to the input stream, not to warehouse movement.

**Alternative Approaches:** Could model a full event queue for arrivals and shuttle jobs later, but this smaller fix preserves the current architecture.

**Next Agent Instructions:** If the physical model requires one shuttle per aisle and height, change `shuttles_x` and `shuttles_time` keys from `y` to `(aisle, y)` and update algorithms that inspect shuttle positions.
