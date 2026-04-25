# Task ID: TASK-004
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Refactor/Feature

## Objective & Success

**Primary Objective:** Create an operation sandbox environment to benchmark and test different algorithms, while permanently removing the old neural network and legacy greedy codes.

**Success Criteria:**
- `neural.py`, `algorithms_greedy.py`, and `warehouse_greedy.py` are completely deleted from the workspace.
- `main/main.py` is entirely refactored to act as a generic sandbox test runner.
- The sandbox runs identical datasets against multiple algorithms (e.g. `SimpleAlgorithm`) and prints benchmark results.
- Architecture docs (`OUTLINE.md`) correctly reflect these changes.

**Definition of Done:**
- [ ] Delete the 3 legacy files.
- [ ] Refactor `main.py`.
- [ ] Verify `main.py` runs and prints comparison metrics.
- [ ] Update `OUTLINE.md`.

## Current State Analysis

**What Exists Now:** `main.py` is deeply tied to the old greedy functions and `WarehouseNet`, and expects `warehouse_greedy.py`.
**Code Locations:**
- `main/main.py`: Currently runs `run_greedy_demo` and `run_nn_demo`.
- `controllers/algorithm/neural.py`: Legacy NN code.
- `controllers/silo_simulator/simulator.py`: Clean object-oriented simulator motor.

## Implementation Roadmap

### Phase 1: Cleanup
- **1.1** Delete `neural.py`, `algorithms_greedy.py`, `warehouse_greedy.py`.

### Phase 2: Sandbox Runner
- **2.1** Rewrite `main.py` to instantiate `Simulator` from `silo_simulator/simulator.py`.
- **2.2** Generate a single predictable data stream of boxes.
- **2.3** Loop through loaded algorithms, run the simulator on a fresh instance, and gather total time, throughput, etc.
- **2.4** Print a comparative table.

### Phase 3: Documentation
- **3.1** Remove NN and old greedy traces from `OUTLINE.md`.
- **3.2** Document the sandbox setup.

## Progress Tracking

**Overall Progress:** 0/3 phases completed
**Current Phase:** Phase 1 (Cleanup)

**Phase Status:**
- Phase 1: ⏳ Pending
- Phase 2: ⏳ Pending
- Phase 3: ⏳ Pending

**Last Activity:** Created task file.
**Last Updated:** 2026-04-25
