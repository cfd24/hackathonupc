# Task ID: FIX-VARIANCE-THROUGHPUT-REPORTING
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Bugfix

## Objective & Success

**Primary Objective:** Make `ZSafeRWeightedYSafeVarianceAlgorithm` visibly respect `max_avg_squared_wagon_distance` in benchmarks.

**Issue:** The variance gate controls pallet retrieval/export, but the sandbox displayed a single throughput metric based on boxes processed into storage. That made strict variance settings look like they were still successful even when pallet exports were blocked.

**Success Criteria:**
- Use strict `< max_avg_squared_wagon_distance`, matching the task wording.
- Keep the variance check in `get_retrieval_plan`.
- Add separate stored-box, exported-box, and pallet export throughput metrics to benchmark output.
- Validate with syntax checks and a direct threshold check.

## Implementation

- Changed the retrieval threshold comparison from `<=` to `<`.
- Added `pallet_throughput = sent_pallets / hours`.
- Added `exported_box_throughput = sent_pallets * 12 / hours`.
- Renamed the incoming-box metric to `Stored/h`.
- Added separate `Exported/h` and `Pallets/h` columns so exported boxes always equal pallets times 12.

## Progress Tracking

**Overall Progress:** 1/1 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete

**Last Activity:** Split benchmark throughput into stored boxes, exported boxes, and pallets so prefilled-box exports cannot be compared against incoming-box storage by mistake.
**Last Updated:** 2026-04-25

## Validation

**Syntax Validation:** `python -m py_compile controllers/algorithm/algorithms.py main/main.py`

**Threshold Check:**
```text
max_avg_squared_wagon_distance=1     -> retrieval plan blocked
max_avg_squared_wagon_distance=10000 -> retrieval plan allowed
```

## Agent Notes

The variance can still pass with a low threshold when the selected boxes are already aligned with their Y-level shuttles, because the metric is based on current `warehouse.shuttles_x[y]`, not distance to the dock.
