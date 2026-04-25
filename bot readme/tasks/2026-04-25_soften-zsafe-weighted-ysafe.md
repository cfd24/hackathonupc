# Task ID: SOFTEN-ZSAFE-WEIGHTED-YSAFE
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Refactor

## Objective & Success

**Primary Objective:** Soften `ZSafeWeightedYSafeAlgorithm` by adding a tunable parameter that allows more than one same-destination pair per height/aisle constraint group.

**Success Criteria:**
- `ZSafeWeightedYSafeAlgorithm` accepts a parameter that controls how many same-destination Z-safe pairs may share a height/aisle grouping.
- The default should be more permissive than the current hard limit of one pair.
- The algorithm still keeps Z-safe behavior: `z=2` may only be used when `z=1` has the same destination.
- The algorithm still prefers spreading same-destination boxes across different heights/aisles before exceeding the limit.
- If the limit is reached everywhere, the algorithm may continue placing boxes rather than leaving too many unplaced, depending on the configured parameter.
- Architecture documentation is updated.
- Syntax validation and a smoke benchmark pass.

**Definition of Done:**
- [x] Add a parameter such as `max_pairs_per_aisle_height` to `ZSafeWeightedYSafeAlgorithm`.
- [x] Replace the current boolean `(destination, aisle, y)` blocked check with a count-based check.
- [x] Allow placement when the count is below the configured limit.
- [x] Keep matching same-destination `z=2` stacking allowed.
- [x] Register/document the new behavior.
- [x] Run syntax validation.
- [x] Run a smoke benchmark.
- [x] Record whether processed-box count improves at high capacity.

## Current State Analysis

**What Exists Now:** `ZSafeWeightedYSafeAlgorithm` prevents opening a new `z=1` lane for a destination if that destination already exists in the same `(aisle, y)`. This is very strict and can leave boxes unplaced at high capacity.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: `ZSafeWeightedYSafeAlgorithm`.
- `bot readme/architecture/OUTLINE.md`: Algorithm documentation.
- `main/main.py`: Sandbox registration, likely unchanged unless exposing the parameter in the menu.

**Known Issues:**
- The current hard rule improves separation but reduces usable capacity.
- The sandbox currently constructs algorithms with no arguments, so any new parameter needs a sensible default.

## Implementation Roadmap

### Phase 1: Add Parameter
**Dependencies:** Existing `ZSafeWeightedYSafeAlgorithm`.

**Sub-tasks:**
- **1.1** Add `max_pairs_per_aisle_height` to `__init__`, recommended default `2`.
- **1.2** Keep passing through `max_weighted_backoff`.
- **1.3** Store the parameter on the instance.

### Phase 2: Count-Based Y-Safe Rule
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Replace `_build_blocked_aisle_heights()` with a count map:
  - key: `(aisle, y)`
  - value: number of `z=1` lanes for the destination in that aisle/height.
- **2.2** Replace `_destination_uses_aisle_height()` with `_destination_aisle_height_count()`.
- **2.3** Allow new `z=1` placement when:
  - `count < max_pairs_per_aisle_height`
- **2.4** Continue to allow matching same-destination `z=2` placement in an existing lane.

### Phase 3: Preference Before Fallback
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** First search for lanes under the configured count limit.
- **3.2** If no lane under the limit exists and `max_pairs_per_aisle_height` is not strict enough for full placement, decide whether to:
  - return `None`, preserving the hard limit, or
  - allow overflow via a second fallback pass.
- **3.3** Recommended behavior: keep the configured limit hard by default, but make it easy to raise the parameter.

### Phase 4: Validation
**Dependencies:** Phase 3.

**Sub-tasks:**
- **4.1** Run syntax validation:
  - `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- **4.2** Run a sandbox smoke benchmark for `Z-Safe Weighted Y-Safe`.
- **4.3** Compare processed boxes and Z-blocks before/after.
- **4.4** Add a small invariant check that no `(destination, aisle, y)` group exceeds `max_pairs_per_aisle_height` for `z=1` lanes.

## Progress Tracking

**Overall Progress:** 4/4 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete

**Last Activity:** Added `max_pairs_per_aisle_height`, updated docs, and validated the softened Y-safe behavior.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** `ZSafeWeightedYSafeAlgorithm` extends weighted online placement with spatial separation. This task keeps the same concept but makes the separation capacity-aware through a simple parameter.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run `python main/main.py`.
- Select `Z-Safe Weighted Y-Safe`.
- Use several destination counts.
- Verify high-capacity processed count improves compared with the hard one-pair rule.
- Verify `Z-Blocks` remains low.

**Validation Run:**
- Syntax: `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- Smoke benchmark: `python main/main.py`, option `8` (`Z-Safe Weighted Y-Safe`), packing time `0`, destinations `4`
- Result: completed all capacity levels.
- Processed boxes: `1000`, `995`, `996`, `995` across 0%, 25%, 50%, 75%.
- Z-blocks: `0`, `1`, `2`, `1`.

**Invariant Check:** Stored a deterministic 1000-box stream directly with `max_pairs_per_aisle_height=2`. Result: `max_count 2`, `violations 0`.

**Suggested Debug Checks:**
- Test `max_pairs_per_aisle_height` values `1`, `2`, `3`, and `4`.
- Count `z=1` lanes per `(destination, aisle, y)` after storage.
- Confirm no group exceeds the configured value.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Update documentation.
- [x] Record benchmark observations in this task file.

**Documentation Updates:** `bot readme/architecture/OUTLINE.md` must describe the new `max_pairs_per_aisle_height` parameter.

**Handoff Notes:** Keep "direction" interpreted as `destination`, consistent with the rest of the algorithm suite.

## Agent Notes

**Decisions Made:** The parameter name should describe the physical grouping directly: `max_pairs_per_aisle_height`. Default is `2`, which is more permissive than the original hard one-lane rule while still preserving a clear cap.

**Alternative Approaches:** Could make this a soft scoring penalty instead of a hard cap, but a hard parameter is easier to reason about and validate.

**Next Agent Instructions:** Execute this task by changing only the Y-safe variant unless a shared helper is clearly beneficial.
