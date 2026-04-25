# Task ID: ZSAFE-WEIGHTED-YSAFE
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Create `ZSafeWeightedYSafeAlgorithm`, extending `ZSafeWeightedAlgorithm` with an extra placement restriction for boxes going to the same destination.

**Success Criteria:**
- `ZSafeWeightedYSafeAlgorithm` exists in `controllers/algorithm/algorithms.py`.
- It is registered in `main/main.py` as `Z-Safe Weighted Y-Safe`.
- It keeps weighted and Z-safe behavior from `ZSafeWeightedAlgorithm`.
- For same-destination boxes, a placement must either:
  - stack behind the same destination in a Z-safe lane, or
  - use a different height `Y`, or
  - if using the same height `Y`, use a different aisle.
- Architecture documentation is updated.
- Syntax validation passes.
- A smoke run confirms the algorithm appears and completes.

**Definition of Done:**
- [x] Add task file.
- [x] Implement `ZSafeWeightedYSafeAlgorithm`.
- [x] Register it in the sandbox.
- [x] Resolve existing merge markers in touched files.
- [x] Update architecture documentation.
- [x] Run syntax validation.
- [x] Run a smoke test.

## Current State Analysis

**What Exists Now:** `ZSafeWeightedAlgorithm` learns destination frequency online, uses a small `max_weighted_backoff`, and enforces Z-safe stacking. It does not restrict same-destination boxes by height/aisle beyond Z-safety.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: Add the new class.
- `main/main.py`: Register the new algorithm.
- `bot readme/architecture/OUTLINE.md`: Document the new algorithm.

**Known Issues:** `main/main.py` and `OUTLINE.md` had unresolved merge-conflict markers before this task. Those must be resolved before validation.

## Implementation Roadmap

### Phase 1: Add Algorithm
**Dependencies:** Existing `ZSafeWeightedAlgorithm`.

**Sub-tasks:**
- **1.1** Create `ZSafeWeightedYSafeAlgorithm(ZSafeWeightedAlgorithm)`.
- **1.2** Reuse weighted target-X behavior.
- **1.3** Reuse same-destination Z=2 stacking.
- **1.4** Override the Z-safe slot search so new `z=1` lanes for the same destination avoid an existing box with the same `(aisle, y)`.

### Phase 2: Integration
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Add import in `main/main.py`.
- **2.2** Add display name `Z-Safe Weighted Y-Safe`.
- **2.3** Resolve merge markers while preserving valid existing algorithms.

### Phase 3: Documentation And Validation
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Update `OUTLINE.md`.
- **3.2** Compile Python files.
- **3.3** Run a smoke benchmark.

## Progress Tracking

**Overall Progress:** 3/3 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete

**Last Activity:** Implemented and smoke-tested `ZSafeWeightedYSafeAlgorithm`.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** The new algorithm is a weighted online storage strategy with two locality constraints: Z-safety within a lane and Y/aisle separation for same-destination boxes opening a new front slot.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Syntax Validation:** `python -m py_compile controllers/algorithm/algorithms.py main/main.py`

**Smoke Test:** Ran `python main/main.py`, selected `Z-Safe Weighted Y-Safe`, packing time `0`, and `4` destinations. The algorithm completed all configured capacity levels.

**Invariant Check:** Stored a deterministic 1000-box stream directly with `ZSafeWeightedYSafeAlgorithm` and checked all `z=1` lanes. Result: `violations 0` for duplicate `(destination, aisle, y)` lanes.

**Residual Risk:** The Y-safe rule is stricter than the weighted rule. If the warehouse is highly constrained, it may leave boxes unplaced rather than violating the restriction. In the smoke run, high-capacity scenarios processed slightly fewer than 1000 boxes because the hard rule limited valid placements.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Resolve merge markers in touched files.
- [x] Update documentation.

**Handoff Notes:** "Direction" is interpreted as `destination`, consistent with the rest of the simulator.

## Agent Notes

**Decisions Made:** A new `z=1` lane is considered Y-safe for a destination only if no existing box of that destination already uses the same `(aisle, y)`. A matching `z=2` placement remains allowed because it is explicitly Z-safe.

**Alternative Approaches:** Could make the rule a soft preference with fallback, but the user asked for a restriction, so this implementation keeps it hard.

**Next Agent Instructions:** If completion drops at high capacity, consider adding a visible metric for unplaced boxes before weakening the rule.
