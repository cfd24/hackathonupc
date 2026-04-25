# Task ID: SOFTEN-ZSAFE-WEIGHTED-REMOVE-V2
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Refactor

## Objective & Success

**Primary Objective:** Remove `ZSafeSimpleV2Algorithm` and adjust `ZSafeWeightedAlgorithm` so destination weighting is softer and tunable instead of spreading destinations across the full warehouse width.

**Success Criteria:**
- `ZSafeSimpleV2Algorithm` is removed from `controllers/algorithm/algorithms.py`.
- `Z-Safe Simple V2` is removed from `AVAILABLE_ALGORITHMS` in `main/main.py`.
- `ZSafeWeightedAlgorithm` no longer inherits from V2.
- `ZSafeWeightedAlgorithm` keeps Z-safe behavior: never place a box in `z=2` unless `z=1` contains the same destination.
- Frequent destinations still prefer the beginning of the warehouse near `x=1`.
- Low-frequency destinations only move a limited number of positions backward while there are plenty of free spaces.
- The backward shift is controlled by a clearly named parameter that can be tuned.
- Architecture documentation is updated.

**Definition of Done:**
- [x] Delete `ZSafeSimpleV2Algorithm`.
- [x] Remove `Z-Safe Simple V2` from sandbox registration.
- [x] Update `ZSafeWeightedAlgorithm` to inherit from `ZSafeSimpleAlgorithm` or implement its own Z-safe retrieval directly.
- [x] Add a tunable weighting parameter, for example `max_weighted_backoff` or `weighting_strength`.
- [x] Replace full-width rank mapping with a softer target-X formula.
- [x] Validate syntax.
- [x] Run a benchmark smoke test.
- [x] Update `bot readme/architecture/OUTLINE.md`.

## Current State Analysis

**What Exists Now:** `ZSafeWeightedAlgorithm` inherits from `ZSafeSimpleV2Algorithm` and maps destination rank across the whole X range. With 4 destinations, ranks may map roughly to `x=1`, `x=21`, `x=40`, and `x=60`, which is too extreme and causes poor scores.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: `ZSafeSimpleV2Algorithm` and `ZSafeWeightedAlgorithm`.
- `main/main.py`: `AVAILABLE_ALGORITHMS` registration.
- `bot readme/architecture/OUTLINE.md`: Architecture documentation.

**Known Issues:**
- `ZSafeSimpleV2Algorithm` is behaviorally redundant with `ZSafeSimpleAlgorithm`.
- `ZSafeWeightedAlgorithm` currently pushes low-rank destinations too far back even when the warehouse has plenty of free space.
- Weighting should become more noticeable naturally as front slots fill up, not by immediately sending less frequent destinations to the far end.

## Implementation Roadmap

### Phase 1: Remove V2
**Dependencies:** Existing `ZSafeSimpleAlgorithm`.

**Sub-tasks:**
- **1.1** Delete `ZSafeSimpleV2Algorithm` from `controllers/algorithm/algorithms.py`.
- **1.2** Remove `ZSafeSimpleV2Algorithm` from the `main/main.py` import.
- **1.3** Remove `("Z-Safe Simple V2", ZSafeSimpleV2Algorithm)` from `AVAILABLE_ALGORITHMS`.
- **1.4** Remove V2 documentation from `OUTLINE.md`.

### Phase 2: Soften Weighted Placement
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Make `ZSafeWeightedAlgorithm` inherit from `ZSafeSimpleAlgorithm` or directly duplicate the existing Z-safe retrieval logic.
- **2.2** Add a tuning parameter, recommended:
  - `max_weighted_backoff = 1`
  - Meaning: the least frequent destination starts only a small number of X positions behind the most frequent destination while space is available.
- **2.3** Calculate a destination frequency score from observed arrivals:
  - `frequency = dest_count / total_boxes`
- **2.4** Calculate the current observed min/max frequency.
- **2.5** Convert frequency to a soft backoff:
  - highest frequency -> backoff `0`
  - lowest frequency -> backoff up to `max_weighted_backoff`
  - middle frequencies -> proportional backoff
- **2.6** Use `target_x = 1 + backoff`, not a full-width rank target.
- **2.7** Search for a Z-safe free slot starting near `target_x`, then gradually expand/backfill across the warehouse if needed.

### Phase 3: Capacity-Aware Optional Tuning
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Consider scaling the effective backoff based on warehouse fullness:
  - low fullness -> smaller effective backoff
  - high fullness -> closer to `max_weighted_backoff`
- **3.2** Suggested formula:
  - `fullness = len(warehouse.grid) / total_capacity`
  - `effective_backoff = max_weighted_backoff * (0.25 + 0.75 * fullness)`
- **3.3** Keep the parameter simple enough to tune during benchmarks.

### Phase 4: Validation
**Dependencies:** Phase 2 or Phase 3.

**Sub-tasks:**
- **4.1** Run syntax validation:
  - `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- **4.2** Run a sandbox smoke benchmark.
- **4.3** Confirm `Z-Safe Simple V2` no longer appears in the algorithm list.
- **4.4** Confirm `Z-Safe Weighted` appears and completes.
- **4.5** Compare `Z-Safe Weighted` against `Z-Safe Simple` and `Simple Baseline`.

## Progress Tracking

**Overall Progress:** 4/4 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete

**Last Activity:** Removed `ZSafeSimpleV2Algorithm`, softened `ZSafeWeightedAlgorithm`, updated architecture documentation, and ran validation.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Algorithms choose storage positions through `get_storage_location(box_data, warehouse)` and retrieval plans through `get_retrieval_plan(warehouse)`. `ZSafeWeightedAlgorithm` should remain an online learner: it only uses boxes observed so far, not the final generated distribution.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run `python main/main.py`.
- Choose `Run All`.
- Use several destination counts and capacity scenarios.
- Confirm weighted placement is no longer pushed immediately to the far end.
- Check `Z-Blocks` remains low.
- Compare `Sim Time (s)` and `Throughput/h`.

**Validation Run:**
- Syntax: `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- Smoke benchmark: `python main/main.py`, option `10` (`Run All`), packing time `0`, destinations `4`
- Confirmed `Z-Safe Simple V2` no longer appears in the menu.
- Confirmed `Z-Safe Weighted` appears and completes at 0%, 25%, 50%, and 75% capacity.

**Smoke Benchmark Observation:**
- `Z-Safe Weighted` uses a small default backoff so it does not collapse into the exact same behavior as `ZSafeSimpleAlgorithm`, but it avoids the earlier full-width spread.
- `max_weighted_backoff=0` was verified to produce the same result as `ZSafeSimpleAlgorithm`.
- Chosen parameter: `max_weighted_backoff=1`, with effective backoff scaled by warehouse fullness and an added preference for stacking same-destination boxes in compatible Z=2 lanes near the front.

**Suggested Debug Checks:**
- Temporarily inspect average X by destination after storage.
- Tune `max_weighted_backoff` values such as `0`, `1`, `2`, `3`, and `4`.
- Prefer the setting that improves high-capacity runs without punishing empty/low-capacity runs too much.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Remove obsolete V2 docs.
- [x] Update weighted task notes if implementation changes its assumptions.

**Documentation Updates:** `bot readme/architecture/OUTLINE.md` must describe the softened weighted placement parameter.

**Handoff Notes:** Do not reintroduce full-width rank mapping. The intended behavior is: start near the beginning, nudge rare destinations back modestly, and let scarcity of front slots make the weighting matter more as capacity increases.

## Agent Notes

**Decisions Made:** The preferred first parameter is `max_weighted_backoff`, because it is easy to reason about in warehouse coordinates. Implemented default `max_weighted_backoff=1` and scaled it by warehouse fullness using `0.25 + 0.75 * fullness`.

**Alternative Approaches:** A column-based weighted algorithm may score better, but this task is specifically about softening the existing simple weighted behavior rather than replacing it with column grouping.

**Next Agent Instructions:** After implementation, record benchmark observations in this file, especially which backoff value was chosen and why.
