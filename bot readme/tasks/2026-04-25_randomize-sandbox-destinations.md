# Task ID: RANDOMIZE-SANDBOX-DESTINATIONS
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Make the sandbox ask for the number of destinations and generate non-deterministic destination weights and box streams.

**Success Criteria:**
- User can choose how many destinations to simulate.
- Destination weights are randomly generated and normalized each run.
- Box generation is non-deterministic by default.
- Architecture documentation reflects the sandbox behavior.

**Definition of Done:**
- [x] Add destination-count prompt.
- [x] Generate random destination weights.
- [x] Remove fixed-seed box generation from sandbox runs.
- [x] Update architecture documentation.
- [x] Run syntax validation.

## Current State Analysis

**What Exists Now:** `main/main.py` previously used five fixed destination weights and a fixed seed, so every run generated the same 1000-box stream.

**Code Locations:**
- `main/main.py`: Sandbox prompts, destination weight generation, and box stream generation.
- `bot readme/architecture/OUTLINE.md`: Architecture documentation.

**Known Issues:** The simulator still models one shuttle per Y level, not one per Y level and aisle.

## Implementation Roadmap

### Phase 1: Sandbox Inputs
**Dependencies:** Existing `main/main.py` prompt flow.

**Sub-tasks:**
- **1.1** Add a positive integer prompt for destination count.
- **1.2** Keep packing-time validation.

### Phase 2: Random Box Flow
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** Generate destination codes from the requested count.
- **2.2** Generate random weights and normalize them to sum to 1.
- **2.3** Use an unseeded RNG so runs are non-deterministic.

### Phase 3: Documentation
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Update `bot readme/architecture/OUTLINE.md`.

## Progress Tracking

**Overall Progress:** 3/3 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete

**Last Activity:** Updated `main/main.py` to generate random destination weights and non-deterministic box streams.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** The sandbox creates one shared incoming box stream and runs each selected algorithm against that same stream. Within a single benchmark run, algorithms are still compared fairly because they share the generated stream. Across separate executions, the stream now changes.

**Key Technologies:** Python standard library only.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite exists.

**Manual Testing:** Use interactive prompts to choose an algorithm, packing time, and destination count.

**Syntax Validation:** `python -m py_compile main/main.py`

## Deployment & Cleanup

**Deployment Checklist:**
- [x] No dependency changes required.
- [x] Documentation updated.

**Handoff Notes:** Randomness is intentionally per program execution. To compare algorithms fairly, `main.py` generates the stream once and reuses it for all selected algorithms in that execution.

## Agent Notes

**Decisions Made:** Kept the same generated stream for all algorithms within a single run so the benchmark remains meaningful.

**Alternative Approaches:** Could expose a seed prompt for reproducibility, but the request was to make the run non-deterministic.

**Next Agent Instructions:** If reproducibility becomes useful again, add an optional seed input rather than hardcoding one.
