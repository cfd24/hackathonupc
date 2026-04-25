# Task ID: TASK-007
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Implement a Velocity Simple Algorithm that applies dynamic ABC slotting (front/back allocation) to the naive SimpleBaseline logic.

**Success Criteria:**
- `VelocitySimpleAlgorithm` inherits from `SimpleAlgorithm`.
- Learns destination frequencies dynamically.
- Allocates slots from X=1 for "Fast" destinations and from X=60 for "Slow" destinations.
- Does not group boxes into columns or optimize retrieval (behaves naively on retrieval like SimpleBaseline).

**Definition of Done:**
- [ ] Create `VelocitySimpleAlgorithm` in `algorithms.py`.
- [ ] Add it to `AVAILABLE_ALGORITHMS` in `main.py`.
- [ ] Update architecture documentation in `OUTLINE.md`.

## Current State Analysis

**What Exists Now:** `SimpleAlgorithm` assigns slots from X=1 for all boxes regardless of destination frequency. 

**Code Locations:**
- `controllers/algorithm/algorithms.py`: Logic for storage.
- `main/main.py`: `AVAILABLE_ALGORITHMS` list.

**Known Issues:** None.

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** None

**Sub-tasks:**
- **1.1** Inherit `VelocitySimpleAlgorithm` from `SimpleAlgorithm`.
- **1.2** Add dynamic frequency counting (`dest_counts`).
- **1.3** Implement X=1 to 60 vs X=60 to 1 loop directions for slot searching.

### Phase 2: Integration & Documentation
**Dependencies:** Phase 1

**Sub-tasks:**
- **2.1** Add to `main.py`.
- **2.2** Document in `OUTLINE.md`.

## Progress Tracking

**Overall Progress:** 0/2 phases completed
**Current Phase:** Phase 1

**Phase Status:**
- Phase 1: ⏳ Pending
- Phase 2: ⏳ Pending

**Last Activity:** Task file created.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Combines dynamic velocity counting with basic sequential empty slot finding.

## Validation & Testing

**Automated Tests:** Execute sandbox via `python main/main.py` and benchmark `VelocitySimpleAlgorithm` against `SimpleAlgorithm`.

## Deployment & Cleanup

**Deployment Checklist:**
- [ ] Update `OUTLINE.md`

## Agent Notes

**Decisions Made:** Opted to use a threshold of `1.0 / len(dest_counts)` to determine if a destination is Fast or Slow.
