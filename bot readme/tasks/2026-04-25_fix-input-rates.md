# Task ID: TASK-006
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Implement realistic incoming box arrival rates (1000 boxes/hour) and variable destination weights in the simulation.

**Success Criteria:**
- Configuration for destinations, weights, and boxes/hour are cleanly defined at the top of `main.py`.
- `generate_box_stream` honors the defined weights.
- The `Simulator` realistically advances global time for each arriving box based on the rate.

**Definition of Done:**
- [ ] Add constants to `main.py`.
- [ ] Refactor `generate_box_stream` to use `random.choices` with the weights.
- [ ] Refactor `simulator.py` to advance `warehouse.global_time` on arrival.
- [ ] Verify metrics.

## Current State Analysis

**What Exists Now:**
- `generate_box_stream` picks uniformly from 20 random destinations.
- The simulator assumes all boxes are instantly available at `t=0`.

## Implementation Roadmap

### Phase 1: Configuration & Stream Generation
- **1.1** Define `BOXES_PER_HOUR`, `TOTAL_DESTINATIONS`, and `DESTINATION_WEIGHTS` in `main.py`.
- **1.2** Rewrite `generate_box_stream` to use `random.choices`.

### Phase 2: Simulator Timing
- **2.1** In `simulator.py`, calculate `arrival_interval = 3600.0 / BOXES_PER_HOUR`.
- **2.2** In the `sim.run()` loop, increment `self.warehouse.global_time += arrival_interval` for each box before processing it.

## Progress Tracking

**Overall Progress:** 0/2 phases completed
**Current Phase:** Phase 1
