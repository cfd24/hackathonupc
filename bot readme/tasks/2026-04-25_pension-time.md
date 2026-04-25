# Task ID: PENSION-TIME
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Refactor

## Objective & Success

**Primary Objective:** Add a sandbox option called `Run All (Compare) Except Retirees` that excludes retired algorithms from the comparison run.

**Retired Algorithms:**
- `Simple Baseline`
- `Distance Greedy`
- `Velocity Column`
- `Velocity Simple`
- `Z-Safe Weighted`
- `Z-Safe Weighted Y-Safe`
- `Z-Weighted Pro`
- `Destination Zones`
- `Maturity First`

**Success Criteria:**
- `main/main.py` has a clearly defined retired algorithm list or set.
- The existing individual algorithm options remain available.
- The existing `Run All (Compare)` option remains available and still runs everything.
- A new option `Run All (Compare) Except Retirees` is added.
- Selecting the new option runs all algorithms except the retired list above.
- The new option still uses the same generated streams for fair comparison among included algorithms.
- Architecture documentation is updated.
- Syntax validation passes.

## Current State Analysis

**What Exists Now:** `main/main.py` has `AVAILABLE_ALGORITHMS` and one `Run All (Compare)` option that runs every algorithm in the list.

**Code Locations:**
- `main/main.py`: Sandbox menu, algorithm selection, and benchmark execution.
- `bot readme/architecture/OUTLINE.md`: Sandbox documentation.

**Known Issues:**
- The retired algorithms should not be deleted, because users may still want to run them individually.
- The new option should filter by display name to avoid changing class implementations.

## Implementation Roadmap

### Phase 1: Define Retirees
**Dependencies:** Existing `AVAILABLE_ALGORITHMS`.

**Sub-tasks:**
- **1.1** Add a `RETIRED_ALGORITHM_NAMES` set near `AVAILABLE_ALGORITHMS`.
- **1.2** Include exactly the retired algorithm display names listed in this task.
- **1.3** Keep the names synchronized with `AVAILABLE_ALGORITHMS`.

### Phase 2: Add Menu Option
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Keep existing individual numbered options.
- **2.2** Keep existing `Run All (Compare)`.
- **2.3** Add `Run All (Compare) Except Retirees` after the existing run-all option.
- **2.4** Update selection parsing to handle the new option.

### Phase 3: Filter Algorithms
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** For the new option, build:
  - `[(name, cls) for name, cls in AVAILABLE_ALGORITHMS if name not in RETIRED_ALGORITHM_NAMES]`
- **3.2** If the filtered list is empty, print a helpful message and exit.
- **3.3** Ensure the benchmark code path is otherwise unchanged.

### Phase 4: Documentation And Validation
**Dependencies:** Phase 3.

**Sub-tasks:**
- **4.1** Update `bot readme/architecture/OUTLINE.md`.
- **4.2** Run syntax validation:
  - `python -m py_compile main/main.py`
- **4.3** Run a quick smoke test of the new menu option.

## Progress Tracking

**Overall Progress:** 4/4 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete

**Last Activity:** Added `Run All (Compare) Except Retirees`, documented it, and smoke-tested the filtered comparison.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** The sandbox should support two comparison modes: full comparison and comparison excluding retired algorithms. This is a menu/selection change only.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run `python main/main.py`.
- Confirm the new menu option appears.
- Select `Run All (Compare) Except Retirees`.
- Confirm excluded algorithms do not appear in the benchmark output.
- Confirm non-retired algorithms still run.

**Validation Run:**
- Syntax: `python -m py_compile main/main.py`
- Smoke benchmark: `python main/main.py`, option `15`, packing time `0`, destinations `4`
- Confirmed included algorithms: `Column Grouping`, `Z-Safe Simple`, `Z-Safe Pro`, `Z-Safe-R Weighted Y-Safe`
- Confirmed retired algorithms were excluded from benchmark output.

**Expected Included Algorithms:** Depends on the current `AVAILABLE_ALGORITHMS`, but should include any algorithm not listed under Retired Algorithms, such as `Z-Safe Simple`, `Z-Safe Pro`, and `Z-Safe-R Weighted Y-Safe` if present.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Update documentation.
- [x] Record smoke-test observations.

**Documentation Updates:** `bot readme/architecture/OUTLINE.md` should mention both run-all modes.

**Handoff Notes:** Do not remove retired algorithms from `AVAILABLE_ALGORITHMS`; only exclude them from the new comparison mode.

## Agent Notes

**Decisions Made:** Filter by display name because the user named the algorithms as menu options.

**Alternative Approaches:** Could add a metadata object per algorithm, but a small set is enough for now.

**Next Agent Instructions:** Implement this in `main/main.py` without changing algorithm classes.
