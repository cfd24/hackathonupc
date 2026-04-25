# Task ID: Z-SAFE-R-Z2-THRESHOLD
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Modify `ZSafeRWeightedYSafeAlgorithm` so it has a tunable parameter controlling the X threshold at which matching `z=2` placements begin, and rename the sandbox display to include the hyphenated `Z-Safe-R` spelling.

**Success Criteria:**
- The sandbox display name is changed from `ZSafe-R Weighted Y-Safe` to `Z-Safe-R Weighted Y-Safe`.
- `ZSafeRWeightedYSafeAlgorithm` accepts a parameter that controls when it starts filling matching `z=2` slots.
- The parameter can express a fraction of `warehouse.num_x`.
- A value of `0` means matching `z=2` may be used immediately after the first `z=1` pass at `x=1`.
- A value of `0.5` means the algorithm prioritizes opening `z=1` lanes until approximately `x = 0.5 * x_max`, then starts allowing matching `z=2`.
- Z-safe behavior is preserved: `z=2` may only be used when `z=1` contains the same destination.
- Y-safe count behavior is preserved.
- Architecture documentation is updated.
- Syntax validation and a smoke test pass.

## Current State Analysis

**What Exists Now:** `ZSafeRWeightedYSafeAlgorithm` first searches `z=1` slots across the candidate X range, then searches matching `z=2` slots. This means it tends to open many `z=1` lanes before using `z=2`. The user wants a parameter that determines how far in X the algorithm goes before allowing `z=2`.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: `ZSafeRWeightedYSafeAlgorithm`.
- `main/main.py`: Display name in `AVAILABLE_ALGORITHMS`.
- `bot readme/architecture/OUTLINE.md`: Algorithm documentation.

**Known Issues:**
- The parameter name and units should be explicit to avoid confusion between absolute X and fraction of X max.
- The sandbox constructs algorithms with no arguments, so the default must be sensible.

## Implementation Roadmap

### Phase 1: Add Parameter
**Dependencies:** Existing `ZSafeRWeightedYSafeAlgorithm`.

**Sub-tasks:**
- **1.1** Add a constructor parameter, recommended name: `z2_start_x_ratio`.
- **1.2** Default suggestion: `0.5`.
- **1.3** Store the value on the instance.
- **1.4** Clamp the value to `[0.0, 1.0]` when calculating the threshold.

### Phase 2: Calculate Threshold
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Add helper `_z2_start_x(warehouse)`.
- **2.2** If `z2_start_x_ratio == 0`, return `1`.
- **2.3** Otherwise calculate:
  - `ceil(z2_start_x_ratio * warehouse.num_x)`
- **2.4** Clamp the result to `1..warehouse.num_x`.

### Phase 3: Modify Traversal
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** In `_find_zsafe_slot()`, first search `z=1` using the reordered traversal.
- **3.2** Stop the first `z=1` pass at the threshold X.
- **3.3** After the threshold has been reached, allow matching `z=2` placements.
- **3.4** Continue to preserve fallback behavior if no slot is found.
- **3.5** Preserve `max_pairs_per_aisle_height` for new `z=1` lanes.

**Expected behavior examples:**
- `z2_start_x_ratio=0`: after trying `z=1` at `x=1`, matching `z=2` can be used.
- `z2_start_x_ratio=0.5`: for `x_max=60`, the algorithm opens `z=1` lanes until about `x=30`, then starts allowing matching `z=2`.
- `z2_start_x_ratio=1`: matching `z=2` is delayed until the far end, similar to current behavior.

### Phase 4: Integration And Docs
**Dependencies:** Phase 3.

**Sub-tasks:**
- **4.1** Change display label to `Z-Safe-R Weighted Y-Safe`.
- **4.2** Update `OUTLINE.md`.
- **4.3** Update this task file with benchmark observations.

### Phase 5: Validation
**Dependencies:** Phase 4.

**Sub-tasks:**
- **5.1** Run syntax validation:
  - `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- **5.2** Run a smoke benchmark for `Z-Safe-R Weighted Y-Safe`.
- **5.3** Add a small direct placement check with a repeated destination to verify the `z=2` threshold behavior.

## Progress Tracking

**Overall Progress:** 5/5 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete
- Phase 5: Complete

**Last Activity:** Added `z2_start_x_ratio`, renamed the sandbox label, updated documentation, and validated with direct placement and smoke tests.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** This task changes only storage placement order inside one algorithm. It does not change simulator timing, warehouse constraints, or retrieval behavior.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run the new algorithm directly through `main/main.py`.
- Try repeated boxes with the same destination and inspect placements.
- Compare processed boxes, Z-blocks, and simulation time for different `z2_start_x_ratio` values.

**Suggested Debug Checks:**
- Test ratios `0`, `0.25`, `0.5`, `0.75`, and `1`.
- Confirm `z=2` does not appear before the configured threshold except when threshold is `0`.
- Confirm `z=2` remains destination-compatible.

**Validation Run:**
- Syntax: `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- Direct placement check:
  - `z2_start_x_ratio=0` first uses Z=2 at `x=1`
  - `z2_start_x_ratio=0.5` first uses Z=2 at `x=30` in a 60-X warehouse when the Y-safe lane cap is high enough to reach that point
- Smoke benchmark: `python main/main.py`, option `10` (`Z-Safe-R Weighted Y-Safe`), packing time `0`, destinations `4`
- Result: completed all capacity levels.
- Processed boxes: `1000`, `997`, `999`, `997` across 0%, 25%, 50%, 75%.
- Z-blocks: `0`, `0`, `0`, `0`.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Update architecture documentation.
- [x] Record benchmark observations.

**Documentation Updates:** `bot readme/architecture/OUTLINE.md` must mention `z2_start_x_ratio`.

**Handoff Notes:** Keep the class name `ZSafeRWeightedYSafeAlgorithm`; only the sandbox display name needs the hyphenated `Z-Safe-R` style.

## Agent Notes

**Decisions Made:** Use a ratio parameter rather than absolute X by default, because it scales if warehouse dimensions change.

**Alternative Approaches:** Could accept both ratio and absolute X, but that adds complexity and ambiguity.

**Next Agent Instructions:** Implement in the smallest possible override inside `ZSafeRWeightedYSafeAlgorithm`.
