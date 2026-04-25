# Task ID: Z-SAFE-R-WEIGHTED-Y-SAFE-VARIANCE
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Create `ZSafeRWeightedYSafeVarianceAlgorithm`, based on `ZSafeRWeightedYSafeAlgorithm`, that prioritizes closer carriers for incoming boxes and only exports a pallet when 12 boxes are sufficiently aligned with their carriers/wagons.

**Success Criteria:**
- `ZSafeRWeightedYSafeVarianceAlgorithm` exists in `controllers/algorithm/algorithms.py`.
- It is registered in `main/main.py` as `Z-Safe-R Weighted Y-Safe Variance`.
- It keeps the storage behavior of `ZSafeRWeightedYSafeAlgorithm`.
- Incoming boxes prioritize carriers closer to `x=1` by favoring lower Y levels when scanning candidate slots at the same X/side/aisle.
- Retrieval only returns a 12-box pallet if:
  - all 12 boxes share the same destination, and
  - the average squared difference between each box X and its Y-level wagon/shuttle X is below a configurable threshold.
- Architecture documentation is updated.
- Syntax validation and a smoke benchmark pass.

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** Existing `ZSafeRWeightedYSafeAlgorithm`.

**Sub-tasks:**
- **1.1** Create `ZSafeRWeightedYSafeVarianceAlgorithm(ZSafeRWeightedYSafeAlgorithm)`.
- **1.2** Add a parameter such as `max_avg_squared_wagon_distance`.
- **1.3** Use a sensible default that allows the algorithm to export pallets in normal benchmark runs.

### Phase 2: Carrier Priority
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Add helper to order Y levels by carrier/shuttle closeness to `x=1`.
- **2.2** Use that Y order in the reordered storage slot scan.
- **2.3** Keep side and aisle ordering from the R variant.

### Phase 3: Variance-Based Retrieval
**Dependencies:** Phase 1.

**Sub-tasks:**
- **3.1** Group boxes by destination.
- **3.2** For each destination with at least 12 boxes, sort candidate boxes by squared distance to their Y-level wagon.
- **3.3** Evaluate the best 12 boxes.
- **3.4** Calculate:
  - `sum((box_x - warehouse.shuttles_x[y]) ** 2) / 12`
- **3.5** Return the pallet only if the value is strictly less than the threshold.
- **3.6** Sort selected boxes by Z then X before returning codes to preserve Z-safety.

### Phase 4: Integration And Docs
**Dependencies:** Phase 3.

**Sub-tasks:**
- **4.1** Register in `main/main.py`.
- **4.2** Add documentation to `OUTLINE.md`.
- **4.3** Run syntax validation and a smoke benchmark.

## Progress Tracking

**Overall Progress:** 4/4 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete

**Last Activity:** Tightened the variance threshold to strict `<` and added a benchmark metric that separates box intake throughput from pallet export throughput.
**Last Updated:** 2026-04-25

## Validation & Testing

**Syntax Validation:** `python -m py_compile controllers/algorithm/algorithms.py main/main.py`

**Smoke Test:** Ran `python main/main.py`, selected `Z-Safe-R Weighted Y-Safe Variance`, packing time `0`, and `4` destinations. The algorithm completed all configured capacity levels.

**Smoke Result:**
- Processed boxes: `1000`, `999`, `998`, `997` across 0%, 25%, 50%, 75%.
- Z-blocks: `0`, `0`, `0`, `0`.

**Threshold Check:** A direct retrieval check confirmed that threshold `1` blocks a misaligned pallet while threshold `10000` allows it.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] Remove generated `__pycache__` noise if validation creates it.
- [x] Update architecture documentation.
- [x] Record benchmark observations.

## Agent Notes

**Decisions Made:** Interpreted carriers/wagons as the Y-level shuttles tracked by `warehouse.shuttles_x[y]`. Used average squared X-distance as the variance-style export threshold.
