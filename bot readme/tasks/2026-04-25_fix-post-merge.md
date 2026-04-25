# Task ID: TASK-007
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Bug Fix

## Objective & Success

**Primary Objective:** Fix regressions in the sandbox introduced by the remote `git pull` so that multiple algorithms can run and be benchmarked effectively again.

**Success Criteria:**
- `main.py` successfully calls `sim.run` with `arrival_interval` instead of `arrival_rate_per_hour`.
- `DistanceGreedyAlgorithm` correctly returns `box_code` strings from `get_retrieval_plan`.
- The Sandbox menu executes without crashing.

**Definition of Done:**
- [ ] Create task tracking document.
- [ ] Update `main.py`.
- [ ] Update `algorithms.py`.
- [ ] Verify using the "Run All" sandbox test.

## Current State Analysis

**What Exists Now:**
- `main.py` passes `arrival_rate_per_hour`, which causes a `TypeError` in the newly merged `simulator.py`.
- `DistanceGreedyAlgorithm` returns tuples of coordinates, which causes a `KeyError` or mismatch in `simulator.py` because it now expects a `box_code` string for retrieval lookups.

## Implementation Roadmap

### Phase 1: API Synchronization
- **1.1** In `main.py`, calculate `arrival_interval = 3600.0 / BOXES_PER_HOUR`. Pass this as the `arrival_interval` kwarg. Disable `real_time` to keep benchmarking fast.
- **1.2** In `algorithms.py`, adjust `DistanceGreedyAlgorithm.get_retrieval_plan` to append `box_data['code']` instead of `coords`.

## Progress Tracking

**Overall Progress:** 0/1 phases completed
**Current Phase:** Phase 1
