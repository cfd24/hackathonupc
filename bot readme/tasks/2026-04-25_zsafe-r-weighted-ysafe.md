# Task ID: ZSAFE-R-WEIGHTED-YSAFE
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Create `ZSafeRWeightedYSafeAlgorithm`, a variant of `ZSafeWeightedYSafeAlgorithm` that changes storage traversal order to reduce pressure on the same early shuttles/lanes while preserving weighted, Z-safe, and Y-safe behavior.

**Success Criteria:**
- A new algorithm class named `ZSafeRWeightedYSafeAlgorithm` exists in `controllers/algorithm/algorithms.py`.
- It is registered in `main/main.py` as `ZSafe-R Weighted Y-Safe`.
- It inherits from or reuses `ZSafeWeightedYSafeAlgorithm`.
- It keeps:
  - Z-safe behavior.
  - weighted destination behavior.
  - `max_pairs_per_aisle_height` behavior.
- Its slot traversal order for a given X is:
  - side `1`
    - aisle `1`, all Y values
    - aisle `2`, all Y values
    - aisle `3`, all Y values
    - aisle `4`, all Y values
  - side `2`
    - aisle `1`, all Y values
    - aisle `2`, all Y values
    - aisle `3`, all Y values
    - aisle `4`, all Y values
  - then move to the next X and repeat.
- Architecture documentation is updated.
- Syntax validation and a smoke benchmark pass.

## Current State Analysis

**What Exists Now:** `ZSafeWeightedYSafeAlgorithm` searches slots in an order that puts a lot of pressure on the same early coordinates. The requested traversal should spread placements across heights/aisles/sides at `x=1` before moving to `x=2`, making the front of the warehouse more balanced and potentially more efficient.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: Add the new class and slot-search override.
- `main/main.py`: Register the algorithm.
- `bot readme/architecture/OUTLINE.md`: Document the algorithm.

**Known Issues:**
- The current simulator has one shuttle per Y level, not per aisle/Y pair.
- The requested ordering may improve spatial distribution but must be benchmarked; it is not guaranteed to dominate every scenario.

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** Existing `ZSafeWeightedYSafeAlgorithm`.

**Sub-tasks:**
- **1.1** Create `ZSafeRWeightedYSafeAlgorithm(ZSafeWeightedYSafeAlgorithm)`.
- **1.2** Override the slot-search helper, likely `_find_zsafe_slot()`.
- **1.3** Preserve the count-based Y-safe rule.
- **1.4** Preserve same-destination `z=2` stacking when allowed.

### Phase 2: Traversal Order
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** For each X in the candidate X range, iterate side first.
- **2.2** For each side, iterate aisles.
- **2.3** For each aisle, iterate all Y values.
- **2.4** For each `(aisle, side, x, y)`, try `z=1` first.
- **2.5** Then allow `z=2` only if `z=1` contains the same destination.

**Desired inner order:**
```text
for x:
  for side in 1..2:
    for aisle in 1..4:
      for y in 1..8:
        try z=1
        try z=2 if same destination at z=1
```

### Phase 3: Integration
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Import/register in `main/main.py`.
- **3.2** Add display name `ZSafe-R Weighted Y-Safe`.
- **3.3** Keep existing algorithms available for comparison.

### Phase 4: Documentation And Validation
**Dependencies:** Phase 3.

**Sub-tasks:**
- **4.1** Update `bot readme/architecture/OUTLINE.md`.
- **4.2** Run syntax validation:
  - `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- **4.3** Run a sandbox smoke benchmark.
- **4.4** Compare against `Z-Safe Weighted Y-Safe`, `Z-Safe Weighted`, and `Z-Safe Simple`.

## Progress Tracking

**Overall Progress:** 4/4 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete

**Last Activity:** Implemented `ZSafeRWeightedYSafeAlgorithm`, registered it in the sandbox, updated architecture docs, and validated traversal/smoke behavior.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Algorithms choose storage positions. This task changes only the traversal order for candidate slots, not the simulator timing model.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run `python main/main.py`.
- Select `Run All` or the new algorithm directly.
- Use several destination counts.
- Compare:
  - `Sim Time (s)`
  - `Processed`
  - `Pallets`
  - `Z-Blocks`
  - `Throughput/h`

**Suggested Debug Checks:**
- Inspect average placements per Y for the new algorithm.
- Confirm placements at `x=1` distribute across sides, aisles, and heights before moving to `x=2`.
- Confirm `max_pairs_per_aisle_height` is still respected.

**Validation Run:**
- Syntax: `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- Smoke benchmark: `python main/main.py`, option `9` (`ZSafe-R Weighted Y-Safe`), packing time `0`, destinations `4`
- Result: completed all capacity levels.
- Processed boxes: `1000`, `998`, `997`, `998` across 0%, 25%, 50%, 75%.
- Z-blocks: `0`, `2`, `4`, `0`.

**Traversal Check:** Direct placement check confirmed first placements start at `x=1`, `side=1`, `aisle=1`, all Y values, then `x=1`, `side=1`, `aisle=2`, all Y values.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Update architecture documentation.
- [x] Record benchmark observations.

**Documentation Updates:** `bot readme/architecture/OUTLINE.md` must describe `ZSafeRWeightedYSafeAlgorithm`.

**Handoff Notes:** Keep "direction" interpreted as `destination`, consistent with the rest of the project.

## Agent Notes

**Decisions Made:** The `R` in `ZSafe-R` should mean reordered traversal.

**Alternative Approaches:** Could change the existing Y-safe weighted algorithm directly, but a new class keeps benchmark comparison easier.

**Next Agent Instructions:** Implement as a subclass and override the smallest possible helper to keep behavior aligned with `ZSafeWeightedYSafeAlgorithm`.
