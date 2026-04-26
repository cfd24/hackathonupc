# Task ID: OPERATION-VARIANCE
**Created Date:** 2026-04-26
**Last Modified:** 2026-04-26
**Current Agent:** Codex
**Task Type:** Rebuild/Optimization

## Objective & Success

**Primary Objective:** Build a new `Variance` algorithm into a production-quality operation-aware algorithm that keeps the best parts of Z-safe weighted R/Y-safe storage, makes `z2_start_x_ratio` meaningful, and uses variance as an export timing/selection policy instead of a brittle hard blocker.

**Success Criteria:**
- Keep the original `ZSafeRWeightedYSafeVarianceAlgorithm` available under its existing name.
- Add/keep the rebuilt operation-aware implementation under the short class name `Variance`.
- Preserve Z-safety: never place a different destination behind another destination in `z=2`.
- Preserve Y-safety: avoid concentrating same-destination boxes in the same `(aisle, y)` beyond a tunable limit.
- Preserve R-order storage: scan by `x`, then `side`, then `aisle`, then prioritized `y`, spreading pressure across the warehouse face.
- Make `z2_start_x_ratio` work predictably:
  - `0.0` allows `z=2` immediately.
  - `0.5` starts allowing `z=2` around half of `x_max`.
  - `1.0` delays `z=2` until the deepest X region.
- Make variance work predictably:
  - `max_avg_squared_wagon_distance=1` should export almost no pallets unless 12 same-destination boxes are essentially aligned with their Y-level wagons.
  - Larger values should progressively allow more exports.
  - The algorithm should not fake throughput by confusing stored boxes with exported boxes.
- Maximize exported pallet throughput while keeping Z-block relocations at or near zero.
- Add validation checks that specifically prove both variance and `z2_start_x_ratio` affect behavior.
- Update architecture documentation if behavior changes.

## Design Requirements

### Storage Policy

The first rebuild scored candidate storage slots globally, but validation showed that it made the algorithm much slower without improving exported throughput enough. The optimized implementation keeps fast R-order storage and applies operation-aware scoring only to retrieval.

Storage should still consider:
- Destination frequency: frequent destinations closer to `x=1`.
- Current destination distribution: avoid putting all same-destination boxes on one `y`/aisle.
- Shuttle/wagon position: prefer placements that do not create unnecessary future movement.
- `z2_start_x_ratio`: penalize or forbid `z=2` before the configured X threshold.
- Z safety: `z=2` is only valid if `z=1` has the same destination.
- Y safety: obey `max_pairs_per_aisle_height` unless no better slot exists.

### Retrieval Policy

The rebuilt retrieval should choose the best 12 boxes for export using an operation-aware score.

Candidate pallet score should consider:
- All 12 boxes must share one destination.
- Average squared wagon distance:
  ```python
  sum((box_x - warehouse.shuttles_x[y]) ** 2) / 12
  ```
- Estimated retrieval time from current shuttle positions.
- Z order: retrieve `z=1` before `z=2` where needed.
- Pair quality: prefer complete `z=1 + z=2` pairs only when it improves retrieval, not blindly.
- Frontness: prefer pallets whose boxes are generally closer to `x=1` if variance is comparable.

The algorithm should return no retrieval plan if no destination has 12 boxes under the configured variance threshold.

### Metrics And Debuggability

The implementation should be easy to reason about:
- Use small helper methods with descriptive names.
- Keep tunable parameters in `__init__`.
- Add lightweight comments only around non-obvious scoring formulas.
- Avoid hidden coupling between storage and retrieval state unless explicitly documented.

Suggested tunable parameters:
```python
max_weighted_backoff
max_pairs_per_aisle_height
z2_start_x_ratio
max_avg_squared_wagon_distance
retrieval_time_weight
retrieval_frontness_weight
retrieval_unit_limit
```

## Implementation Roadmap

### Phase 1: Baseline Characterization
**Dependencies:** Current simulator and benchmark.

**Sub-tasks:**
- **1.1** Run the current algorithm with at least two variance thresholds, such as `1` and `144`.
- **1.2** Run with at least two `z2_start_x_ratio` values, such as `0.0` and `0.8`.
- **1.3** Record exported boxes/hour, pallets/hour, stored boxes/hour, and Z-blocks.
- **1.4** Identify the specific behavior to beat.

### Phase 2: Rebuild Storage
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Keep fast R-order storage after scored storage proved too expensive.
- **2.2** Enforce strict Z-safe validity.
- **2.3** Enforce `z2_start_x_ratio` as a real validity/penalty rule.
- **2.4** Keep a fallback path so storage does not fail unnecessarily when the warehouse has valid space.
- **2.5** Add targeted checks showing low and high `z2_start_x_ratio` produce different Z usage.

### Phase 3: Rebuild Retrieval
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Build same-destination candidate groups.
- **3.2** Select 12-box pallet candidates using wagon-distance variance and retrieval-time scoring.
- **3.3** Enforce `score < max_avg_squared_wagon_distance`.
- **3.4** Ensure threshold `1` exports almost no pallets except true near-perfect alignment cases.
- **3.5** Sort returned boxes in a Z-safe retrieval order.

### Phase 4: Benchmark And Tune
**Dependencies:** Phase 3.

**Sub-tasks:**
- **4.1** Run smoke benchmarks at 0%, 25%, 50%, and 75% capacity.
- **4.2** Compare against current `ZSafeRWeightedYSafeAlgorithm` and previous variance behavior.
- **4.3** Tune defaults for exported boxes/hour and pallets/hour.
- **4.4** Keep Z-blocks at or near zero.
- **4.5** Record final recommended defaults.

### Phase 5: Documentation
**Dependencies:** Phase 4.

**Sub-tasks:**
- **5.1** Update `bot readme/architecture/OUTLINE.md`.
- **5.2** Document the final algorithm restrictions and tunable parameters.
- **5.3** Mark this task complete with benchmark results.

## Progress Tracking

**Overall Progress:** 5/5 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete
- Phase 5: Complete

**Last Activity:** Optimized `Variance` by removing expensive global storage scoring and keeping operation-aware scoring in retrieval.
**Last Updated:** 2026-04-26

**Follow-up:** `Variance` is now the rebuilt implementation itself, not an alias. `ZSafeRWeightedYSafeVarianceAlgorithm` remains the earlier snapshot-variance algorithm.

## Results

### Implementation Summary

- Added `Variance` with operation-aware retrieval.
- Restored/kept `ZSafeRWeightedYSafeVarianceAlgorithm` as the earlier snapshot-variance implementation.
- Removed the global scored storage pass because it caused high execution time with little or no throughput gain.
- Kept strict Z-safe validity: `z=2` is only valid behind the same destination.
- Made `z2_start_x_ratio` a real gate for `z=2`:
  - `0.0` allows early `z=2`.
  - `1.0` prevents early `z=2`.
- Kept Y-safety as a lane-opening penalty for `z=1` while allowing same-destination `z=2` to complete safe pairs.
- Rebuilt retrieval around operation variance:
  - It simulates the retrieval order.
  - After each retrieved box, that Y-level shuttle is treated as returning to `x=0`.
  - Both average squared distance and maximum squared distance must be below `max_avg_squared_wagon_distance`.
- Added tunable retrieval scoring controls:
  - `retrieval_time_weight`
  - `retrieval_frontness_weight`
  - `retrieval_unit_limit`

### Optimization Follow-up

After comparing `Variance` against `ZSafeRWeightedYSafeVarianceAlgorithm`, the global storage scoring pass was removed.

Deterministic 1000-box comparison after optimization:
```text
ZSafeRWeightedYSafeVarianceAlgorithm
0%  cap -> stored 1000 | exported 984  | exported/h 808.7 | real 0.02s | zblocks 0
25% cap -> stored 998  | exported 1104 | exported/h 814.0 | real 0.03s | zblocks 0
50% cap -> stored 998  | exported 1104 | exported/h 819.4 | real 0.03s | zblocks 0
75% cap -> stored 998  | exported 1104 | exported/h 802.9 | real 0.03s | zblocks 0

Variance
0%  cap -> stored 1000 | exported 984  | exported/h 808.7 | real 0.03s | zblocks 0
25% cap -> stored 998  | exported 1104 | exported/h 814.0 | real 0.05s | zblocks 0
50% cap -> stored 998  | exported 1104 | exported/h 819.4 | real 0.04s | zblocks 0
75% cap -> stored 998  | exported 1104 | exported/h 802.9 | real 0.04s | zblocks 0
```

Conclusion: the current optimized `Variance` keeps the operational threshold semantics, but with default parameters it performs essentially the same as the snapshot variance algorithm. The previous scored-storage version was not worth its runtime cost.

### Validation Results

Syntax validation:
```text
python -m py_compile controllers/algorithm/algorithms.py main/main.py
```

Direct variance threshold check:
```text
misaligned threshold 1     -> retrieval blocked
misaligned threshold 10000 -> retrieval allowed
```

Seeded full-run threshold check:
```text
threshold 1   -> stored 1000 | exported 0   | pallets/h 0.00  | zblocks 0
threshold 144 -> stored 1000 | exported 972 | pallets/h 37.73 | zblocks 0
threshold 400 -> stored 1000 | exported 972 | pallets/h 37.73 | zblocks 0
```

Direct `z2_start_x_ratio` check:
```text
ratio 0.0 -> next same-destination placement: (1, 1, 1, 1, 2)
ratio 1.0 -> next same-destination placement: (2, 1, 1, 1, 1)
```

Z-depth usage check over 96 same-destination boxes:
```text
ratio 0.0 -> z2 boxes 48 | min z2 x 1
ratio 1.0 -> z2 boxes 0  | min z2 x None
```

Sandbox smoke run, option `11`, packing time `0`, destinations `4`:
```text
0%  cap -> stored 1000 | exported 984  | pallets 82  | exported/h 436.0 | zblocks 0
25% cap -> stored 1000 | exported 1704 | pallets 142 | exported/h 645.6 | zblocks 0
50% cap -> stored 1000 | exported 1704 | pallets 142 | exported/h 568.0 | zblocks 0
75% cap -> stored 999  | exported 1692 | pallets 141 | exported/h 591.5 | zblocks 0
```

## Validation & Testing

Completed validation:
- [x] `python -m py_compile controllers/algorithm/algorithms.py main/main.py`
- [x] Direct variance threshold check.
- [x] Direct `z2_start_x_ratio` check.
- [x] Sandbox smoke run for `Z-Safe-R Weighted Y-Safe Variance`.

## Agent Notes

The key correction was making variance operational instead of a static snapshot. A shuttle that retrieves one box returns to `x=0`, so a second box on the same Y-level is no longer automatically aligned just because it was aligned at the beginning of the pallet.
