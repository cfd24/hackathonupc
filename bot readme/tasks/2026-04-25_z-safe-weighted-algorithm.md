# Task ID: Z-SAFE-WEIGHTED-ALGORITHM
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Codex
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Create a new storage/retrieval algorithm called `ZSafeWeightedAlgorithm` that stores more frequent destinations closer to `x=0` while respecting Z-depth safety rules.

**Success Criteria:**
- A new algorithm named `ZSafeWeightedAlgorithm` exists in `controllers/algorithm/algorithms.py`.
- The algorithm is available from the sandbox in `main/main.py` under the name `Z-Safe Weighted`.
- The algorithm tracks observed destination frequency from incoming boxes.
- Destinations with higher observed weight are prioritized for storage locations closer to `x=0`.
- Less frequent destinations are placed farther away.
- Storage decisions respect the Z rule: do not place in `z=2` when `z=1` is empty.
- Retrieval still returns valid 12-box pallet plans.
- Architecture documentation is updated.

**Definition of Done:**
- [x] Implement `ZSafeWeightedAlgorithm`.
- [x] Add it to `AVAILABLE_ALGORITHMS`.
- [x] Validate that generated placements never violate Z-depth constraints.
- [x] Compare it against `Simple Baseline` and `Distance Greedy`.
- [x] Update `bot readme/architecture/OUTLINE.md`.

## Current State Analysis

**What Exists Now:** The project has `SimpleAlgorithm` and `DistanceGreedyAlgorithm`. The simulator stores boxes, retrieves 12 boxes of the same destination, forms pallets, and sends them through robot packing.

**Code Locations:**
- `controllers/algorithm/algorithms.py`: Algorithm interface and current algorithm implementations.
- `main/main.py`: Sandbox algorithm registry.
- `controllers/silo_simulator/warehouse.py`: Warehouse dimensions, slot availability, and Z-depth rules.
- `controllers/silo_simulator/simulator.py`: Calls algorithm storage/retrieval methods during simulation.

**Known Issues / Clarifications:**
- The request says "direction"; current box data uses `destination`, so the first implementation should treat destination as direction unless domain requirements say otherwise.
- The current warehouse model tracks one shuttle per `Y` level, not one per `(aisle, Y)`.

## Implementation Roadmap

### Phase 1: Design Algorithm State
**Dependencies:** Existing `BaseAlgorithm` interface.

**Sub-tasks:**
- **1.1** Add a `ZSafeWeightedAlgorithm(BaseAlgorithm)` class.
- **1.2** Maintain counters for observed boxes per destination.
- **1.3** Maintain total observed boxes.
- **1.4** Compute destination weight as `destination_count / total_observed_boxes`.

### Phase 2: Weighted Storage Strategy
**Dependencies:** Phase 1.

**Sub-tasks:**
- **2.1** On each incoming box, update frequency counters before choosing storage.
- **2.2** Rank destinations by observed weight.
- **2.3** Map higher-ranked destinations to lower `x` positions.
- **2.4** Map lower-ranked destinations to higher `x` positions.
- **2.5** Search for an empty slot near the target `x` band.
- **2.6** Respect Z-depth safety by preferring `z=1` first and only using `z=2` when `z=1` is occupied.

### Phase 3: Retrieval Strategy
**Dependencies:** Phase 2.

**Sub-tasks:**
- **3.1** Group stored boxes by destination.
- **3.2** Return 12 boxes for a destination with enough stock.
- **3.3** Prefer retrieval candidates that minimize shuttle travel when possible.
- **3.4** Avoid invalid direct retrieval of blocked `z=2` boxes when a safer candidate exists.

### Phase 4: Sandbox Integration
**Dependencies:** Phase 2 and Phase 3.

**Sub-tasks:**
- **4.1** Import `ZSafeWeightedAlgorithm` in `main/main.py`.
- **4.2** Add `("Z-Safe Weighted", ZSafeWeightedAlgorithm)` to `AVAILABLE_ALGORITHMS`.
- **4.3** Run a benchmark with all algorithms.

### Phase 5: Documentation
**Dependencies:** Phase 4.

**Sub-tasks:**
- **5.1** Update `bot readme/architecture/OUTLINE.md` with the new algorithm.
- **5.2** Document the frequency-weighting behavior and Z-safety behavior.

## Progress Tracking

**Overall Progress:** 5/5 phases completed
**Current Phase:** Complete

**Phase Status:**
- Phase 1: Complete
- Phase 2: Complete
- Phase 3: Complete
- Phase 4: Complete
- Phase 5: Complete

**Last Activity:** Implemented `ZSafeWeightedAlgorithm`, registered it in the sandbox, updated architecture docs, and ran a smoke benchmark.
**Last Updated:** 2026-04-25

## Technical Context

**Architecture Overview:** Algorithms decide storage locations through `get_storage_location(box_data, warehouse)` and retrieval plans through `get_retrieval_plan(warehouse)`. The simulator then applies warehouse movement timing and pallet/robot processing.

**Key Technologies:** Python standard library only.

**File Structure:**
- `controllers/algorithm/algorithms.py`: Add the new algorithm here.
- `main/main.py`: Register the algorithm here.
- `bot readme/architecture/OUTLINE.md`: Update architecture documentation here.

**Entry Points:**
- `python main/main.py`

## Validation & Testing

**Automated Tests:** No formal test suite currently exists.

**Manual Testing:**
- Run the sandbox with all algorithms.
- Use multiple destination counts.
- Check that more frequent destinations tend to occupy smaller `x` values.
- Check that no storage operation attempts `z=2` while `z=1` is empty.
- Compare total time, pallets sent, and throughput.

**Syntax Validation:** `python -m py_compile controllers/algorithm/algorithms.py main/main.py controllers/silo_simulator/warehouse.py controllers/silo_simulator/simulator.py`

**Smoke Test:** Ran `python main/main.py` with `Run All`, packing time `0`, and `4` destinations. `Z-Safe Weighted` completed at all configured capacity levels.

**Benchmark Observation:** In the smoke run, `Z-Safe Weighted` produced `0` Z-blocks at empty capacity and stayed much lower than the baseline in high-capacity scenarios, but it was not faster than the strongest column-based algorithms. This is acceptable for this task because the requested behavior was frequency-weighted Z-safe placement, not best-in-suite performance.

**Suggested Debug Checks:**
- Print or inspect average `x` per destination after a run.
- Confirm the highest-weight destination has the lowest average `x`.
- Confirm rare destinations drift toward larger `x`.

## Deployment & Cleanup

**Deployment Checklist:**
- [x] No dependency changes required.
- [x] Remove temporary debug prints.
- [x] Update documentation.

**Documentation Updates:** `bot readme/architecture/OUTLINE.md` must describe `ZSafeWeightedAlgorithm`.

**Handoff Notes:** Keep the algorithm conservative: prefer correctness and Z-safety over aggressive optimization. If the frequency distribution changes during the run, the algorithm should adapt using observed counts rather than assuming final weights.

## Agent Notes

**Decisions Made:** Interpret "direction" as `destination`, because box codes and current algorithms group boxes by destination. `ZSafeWeightedAlgorithm` now inherits from `ZSafeSimpleAlgorithm` so it reuses the same Z-safe retrieval behavior without keeping the redundant V2 class.

**Follow-up Adjustment:** `2026-04-25_soften-zsafe-weighted-remove-v2.md` removed the full-width rank mapping and replaced it with a softer `max_weighted_backoff` parameter.

**Follow-up Adjustment:** The weighted implementation now defaults to `max_weighted_backoff=1`. A value of `0` explicitly falls back to `ZSafeSimpleAlgorithm`; nonzero values add a small weighted preference and same-destination Z=2 stacking near the front.

**Alternative Approaches:** Could use generated destination weights from `main.py` directly, but that would leak future/global knowledge into the algorithm. The requested behavior says it should infer frequency from arrivals, so it should learn online from observed boxes.

**Next Agent Instructions:** Implement the algorithm without changing simulator contracts unless necessary. If more accurate aisle-level shuttle modeling is required, create a separate task because that is a warehouse simulation change, not an algorithm-only change.
