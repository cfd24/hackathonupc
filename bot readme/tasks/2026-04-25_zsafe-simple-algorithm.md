# Task ID: TASK-008
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Implement a Z-Safe Simple Algorithm that prevents boxes of different destinations from sharing the same Z-lane, eliminating costly Z-relocation penalties.

**Success Criteria:**
- `ZSafeSimpleAlgorithm` never places a box at Z=2 if the box at Z=1 belongs to a different destination.
- Retrieval plan sorts by Z ascending so Z=1 is always extracted before Z=2.
- Z-Blocks (relocations) should drop to 0 in benchmarks compared to `SimpleAlgorithm`.
- `main.py` is NOT modified except for adding the algorithm to the execution list.

**Definition of Done:**
- [x] Create `ZSafeSimpleAlgorithm` in `algorithms.py`.
- [x] Add it to `AVAILABLE_ALGORITHMS` in `main.py`.
- [x] Update architecture documentation in `OUTLINE.md`.

## Current State Analysis

**What Exists Now:** `SimpleAlgorithm` places boxes in the first available slot without checking destination compatibility at Z-depth. This causes frequent Z-relocation penalties when retrieving boxes, since the box at Z=1 often belongs to a different destination than the box at Z=2.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: All algorithm logic.
- `main/main.py`: `AVAILABLE_ALGORITHMS` list and benchmark loop.

**Known Issues:** `SimpleAlgorithm` generates hundreds of Z-relocations because it blindly stacks boxes of different destinations in Z=1/Z=2.

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** None

**Sub-tasks:**
- **1.1** Create `ZSafeSimpleAlgorithm` inheriting from `BaseAlgorithm`.
- **1.2** Implement `get_storage_location`: sequential search like Simple, but when Z=2 is empty and Z=1 is occupied, check that the Z=1 box destination matches. Skip if different.
- **1.3** Implement `get_retrieval_plan`: group by destination, sort by Z ascending (extract Z=1 before Z=2), then by X ascending.

### Phase 2: Integration & Documentation
**Dependencies:** Phase 1

**Sub-tasks:**
- **2.1** Add to `main.py` import and `AVAILABLE_ALGORITHMS`.
- **2.2** Document in `OUTLINE.md`.

## Progress Tracking

**Overall Progress:** 2/2 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: ✅ Complete
- Phase 2: ✅ Complete

**Last Activity:** Implemented algorithm, integrated into sandbox, updated docs.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Same sequential search as `SimpleAlgorithm`, but with an added Z-compatibility gate. The retrieval plan adds Z-aware sorting to guarantee zero relocations.

## Validation & Testing

**Automated Tests:** Execute sandbox via `python main/main.py` and compare Z-Blocks column: `Simple Baseline` should show relocations, `Z-Safe Simple` should show 0.

## Agent Notes

**Decisions Made:** Chose to inherit from `BaseAlgorithm` (not `SimpleAlgorithm`) to keep storage and retrieval logic fully self-contained and Z-aware. The retrieval plan sorts by Z then X to guarantee no blocking scenarios.
