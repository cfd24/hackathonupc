# Task ID: TASK-009
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Implement a Mix Algorithm that combines Column Grouping (parallel shuttle retrieval via dedicated columns) with Z-Safe (Z-depth destination compatibility) to achieve zero relocations AND maximum shuttle parallelism.

**Success Criteria:**
- `MixAlgorithm` dedicates columns to destinations like `ColumnGroupingAlgorithm`.
- Z=2 is only used when Z=1 has the same destination (guaranteed by column dedication + explicit Z-safe check on fallback).
- Retrieval plan sorts by Z ascending to guarantee zero relocations.
- Z-Blocks should be 0 and throughput should match or beat `ColumnGroupingAlgorithm`.

**Definition of Done:**
- [x] Create `MixAlgorithm` in `algorithms.py`.
- [x] Add it to `AVAILABLE_ALGORITHMS` in `main.py`.
- [x] Update architecture documentation in `OUTLINE.md`.

## Current State Analysis

**What Exists Now:**
- `ColumnGroupingAlgorithm`: Dedicates columns per destination, parallel retrieval, but no explicit Z-safety on fallback.
- `ZSafeSimpleAlgorithm`: Enforces Z-depth compatibility, but scatters boxes without column grouping.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: All algorithm logic.
- `main/main.py`: `AVAILABLE_ALGORITHMS` list.

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** None

**Sub-tasks:**
- **1.1** Create `MixAlgorithm` inheriting from `BaseAlgorithm`.
- **1.2** Implement column dedication logic (from ColumnGrouping).
- **1.3** Add Z-safe gate on all storage paths including fallback.
- **1.4** Implement Z-aware retrieval plan with Z then X sorting.

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

**Last Activity:** Implemented algorithm, integrated into sandbox, updated docs.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Combines column dedication (ColumnGrouping) with Z-depth destination compatibility (ZSafe). Within dedicated columns, Z-safety is naturally guaranteed. On fallback (no empty columns), the Z-safe rule is explicitly enforced.

## Validation & Testing

**Automated Tests:** Execute sandbox via `python main/main.py`. Expect Z-Blocks = 0 and throughput comparable to or better than ColumnGrouping.

## Agent Notes

**Decisions Made:** The algorithm uses its own `dest_columns` state rather than inheriting from `ColumnGroupingAlgorithm` to keep it fully self-contained and avoid touching existing code.
