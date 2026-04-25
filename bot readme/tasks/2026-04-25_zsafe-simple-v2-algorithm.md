# Task ID: ZSAFE-SIMPLE-V2-ALGORITHM
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Recreate the Z-safe simple algorithm as `ZSafeSimpleV2Algorithm`, this time inheriting from `SimpleAlgorithm` instead of directly from `BaseAlgorithm`.

**Success Criteria:**
- `ZSafeSimpleV2Algorithm` exists in `controllers/algorithm/algorithms.py`.
- It inherits from `SimpleAlgorithm`.
- It keeps simple sequential storage behavior while enforcing Z destination compatibility.
- It reuses or extends simple retrieval behavior with Z-safe ordering.
- It is available from the sandbox as `Z-Safe Simple V2`.
- Architecture documentation is updated.

**Definition of Done:**
- [x] Implement `ZSafeSimpleV2Algorithm`.
- [x] Add it to `AVAILABLE_ALGORITHMS` in `main/main.py`.
- [x] Validate Python syntax.
- [x] Run a small sandbox smoke test.
- [x] Update `bot readme/architecture/OUTLINE.md`.

## Current State Analysis

**What Exists Now:** `ZSafeSimpleAlgorithm` already exists, but it inherits directly from `BaseAlgorithm`. The requested V2 should be explicitly based on `SimpleAlgorithm` so the relationship to the simple baseline is represented in code.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: Algorithm implementation.
- `main/main.py`: Algorithm registry.
- `bot readme/architecture/OUTLINE.md`: Architecture documentation.

**Known Issues:** The current task file for `ZSafeSimpleAlgorithm` says inheriting from `BaseAlgorithm` was a deliberate choice, but the new request supersedes that for V2 only.

## Implementation Roadmap

### Phase 1: Algorithm Creation
**Dependencies:** Existing `SimpleAlgorithm`.

**Sub-tasks:**
- **1.1** Add `ZSafeSimpleV2Algorithm(SimpleAlgorithm)`.
- **1.2** Override `get_storage_location()` to keep simple scan order.
- **1.3** Allow `z=2` only when `z=1` contains the same destination.
- **1.4** Override `get_retrieval_plan()` to select 12 boxes by destination and sort them by Z before X.

### Phase 2: Integration
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Import/register the algorithm in `main/main.py`.
- **2.2** Add the display name `Z-Safe Simple V2`.

### Phase 3: Documentation And Validation
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Update architecture documentation.
- **3.2** Compile touched Python files.
- **3.3** Run a smoke benchmark.

## Progress Tracking

**Overall Progress:** 3/3 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete

**Last Activity:** Implemented `ZSafeSimpleV2Algorithm`, registered it in the sandbox, updated architecture docs, and ran a smoke benchmark.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Algorithms expose `get_storage_location(box_data, warehouse)` and `get_retrieval_plan(warehouse)`. `ZSafeSimpleV2Algorithm` should preserve the simple algorithm's baseline shape while adding the Z compatibility gate.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run the sandbox with all algorithms.
- Confirm `Z-Safe Simple V2` appears in the algorithm list.
- Confirm it completes without storage Z-depth violations.
- Compare `Z-Blocks` against `Simple Baseline`.

**Syntax Validation:** `python -m py_compile controllers/algorithm/algorithms.py main/main.py controllers/silo_simulator/warehouse.py controllers/silo_simulator/simulator.py`

**Smoke Test:** Ran `python main/main.py` with `Run All`, packing time `0`, and `4` destinations. `Z-Safe Simple V2` completed at all configured capacity levels.

**Residual Risk:** Under prefilled-capacity scenarios, `Z-Safe Simple V2` can still report some Z relocations in the current simulator benchmark. This matches the existing `ZSafeSimpleAlgorithm` behavior and may need a separate retrieval-plan refinement if zero relocations under prefill is mandatory.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] No dependency changes required.
- [x] Remove generated `__pycache__` noise from the diff if it appears.
- [x] Update documentation.

**Handoff Notes:** This task intentionally creates a V2 rather than replacing `ZSafeSimpleAlgorithm`, so existing benchmark comparisons remain available.

## Agent Notes

**Decisions Made:** V2 should inherit from `SimpleAlgorithm` and override only the methods needed for Z-safety.

**Alternative Approaches:** Could refactor common Z-safe helpers into a mixin, but keeping this local is simpler unless more algorithms need the same helper.

**Next Agent Instructions:** Execute this task together with `Z-SAFE-WEIGHTED-ALGORITHM`; the weighted algorithm can reuse V2's Z-safe retrieval behavior.
