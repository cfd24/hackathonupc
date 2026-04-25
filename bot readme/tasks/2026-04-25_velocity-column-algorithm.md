# Task ID: TASK-006
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Implement a Velocity Column Algorithm that dynamically evaluates destination frequency to allocate front/back columns without altering sandbox logic.

**Success Criteria:**
- `VelocityColumnAlgorithm` learns destination frequencies dynamically from incoming boxes.
- "Fast" destinations (above average frequency) are allocated columns starting from X=1.
- "Slow" destinations (below average frequency) are allocated columns starting from X=60.
- `main.py` is NOT modified except for adding the algorithm to the execution list.

**Definition of Done:**
- [x] Create `VelocityColumnAlgorithm` in `algorithms.py`.
- [x] Add it to `AVAILABLE_ALGORITHMS` in `main.py`.
- [x] Update architecture documentation in `OUTLINE.md`.

## Current State Analysis

**What Exists Now:** `ColumnGroupingAlgorithm` assigns columns purely starting from X=1. `main.py` dynamically generates destinations and weights per execution.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: Logic for storage.
- `main/main.py`: `AVAILABLE_ALGORITHMS` list.

**Known Issues:** None. The previous `ColumnGroupingAlgorithm` works perfectly but does not optimize for destination velocity (ABC slotting).

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** None

**Sub-tasks:**
- **1.1** Inherit `VelocityColumnAlgorithm` from `ColumnGroupingAlgorithm`.
- **1.2** Add dynamic frequency counting (`dest_counts`).
- **1.3** Implement X=1 to 60 vs X=60 to 1 allocation logic.

### Phase 2: Integration & Documentation
**Dependencies:** Phase 1

**Sub-tasks:**
- **2.1** Add to `main.py`.
- **2.2** Document in `OUTLINE.md`.

## Progress Tracking

**Overall Progress:** 2/2 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: ✅ Complete
- Phase 2: ✅ Complete

**Last Activity:** Executed algorithm, benchmarked results.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Same as `ColumnGroupingAlgorithm`, taking advantage of Y-level parallelization, but adding ABC velocity slotting based on dynamic frequency observation.

## Validation & Testing

**Automated Tests:** Execute sandbox via `python main/main.py` and benchmark `VelocityColumnAlgorithm` against `ColumnGroupingAlgorithm`.

## Deployment & Cleanup

**Deployment Checklist:**
- [ ] Update `OUTLINE.md`

## Agent Notes

**Decisions Made:** Opted to dynamically learn weights (counting occurrences) rather than passing weights from `main.py`, preserving the sandbox logic entirely intact.
