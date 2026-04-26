# Task ID: TASK-003
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Feature

---

## Objective & Success

**Primary Objective:** Upgrade the benchmark to test algorithms under realistic 
warehouse conditions — variable arrival rates, bursty demand, and long-run 
stability — so results reflect real-world performance not just static snapshots.

**Success Criteria:**
- Benchmark supports a "realistic" mode with variable arrival rates
- Arrival rate fluctuates over time (busy periods, quiet periods, drain periods)
- Long-run test runs long enough to see multiple fill/drain cycles
- Throughput is measured at steady-state (after warmup), not from tick 1
- Results clearly show if an algorithm degrades over time

**Definition of Done:**
- [ ] Variable arrival rate implemented (bursty, not fixed)
- [ ] Warmup period before measurement starts
- [ ] Long-run mode runs multiple fill/drain cycles
- [ ] Results report steady-state throughput + worst-case throughput
- [ ] Existing fixed-capacity tests still work unchanged

---

## Technical Context

**Current behavior:** sim runs at fixed arrival rate from a fixed starting 
capacity. This is fine for head-to-head comparison but doesn't stress 
algorithms realistically.

**Real warehouse behavior to model:**
- Average arrival rate: ~1000 pallets/hr
- But it fluctuates — model this as phases:
  - **Busy phase:** 1400-1600 pallets/hr inbound (warehouse fills up)
  - **Normal phase:** 900-1100 pallets/hr (roughly balanced)
  - **Drain phase:** 400-600 pallets/hr outbound heavy (warehouse empties)
- Each phase lasts randomly between 30-90 minutes sim time
- Phases cycle randomly for the duration of the run
- Retrieval requests are always ~1000/hr (demand is constant, 
  supply is what varies)

**Warmup period:**
- Run sim for 20% of total sim time before starting to record metrics
- This lets the warehouse reach a natural equilibrium before measurement
- Report warmup period separately so we can see starting vs settled behavior

**New test modes to add (keep existing modes intact):**

**Mode 1: Steady-State Test**
- Start at 50% capacity
- Run variable arrival rate sim for 6 hours sim time
- Warmup: first 1 hour not counted
- Report: average throughput, worst 10% throughput (P5 percentile), 
  max Z-blocks in any single hour, final occupancy %

**Mode 2: Stress Spike Test**  
- Start at 40% capacity
- Force a busy phase (1600/hr arrivals) for 2 hours straight
- Then switch to drain phase (400/hr) for 2 hours
- Measure: how fast does throughput degrade during spike? 
  How fast does it recover during drain?
- This is where fragile algorithms will visibly fall apart

**Mode 3: Long-Run Stability Test**
- Run for 24 hours sim time with fully variable phases
- Measure throughput in each hour bucket
- Report: does throughput stay stable or drift? 
  Plot throughput per hour across the 24hr run

**Output format:** same JSON structure as existing benchmark so the 
dashboard can display it, but add new fields:
- steady_state_throughput
- p5_throughput (worst 10% of hours)
- spike_recovery_time_s
- throughput_per_hour (array, for long-run mode)
- occupancy_over_time (array, for long-run mode)

---

## Implementation Roadmap

### Phase 1: Variable Arrival Rate Engine
- **1.1** Replace fixed arrival rate with phase-based rate generator
- **1.2** Implement phase cycling (busy/normal/drain) with random durations
- **1.3** Add warmup period logic — run but don't record

### Phase 2: New Test Modes
- **2.1** Steady-State Test (Mode 1)
- **2.2** Stress Spike Test (Mode 2)  
- **2.3** Long-Run Stability Test (Mode 3)
- **2.4** Keep existing fixed-capacity modes fully intact

### Phase 3: Output + Dashboard
- **3.1** Extend JSON output schema with new fields
- **3.2** Update dashboard to show new metrics (steady-state vs worst-case)
- **3.3** Add throughput-over-time line chart for long-run mode 
  (this is the most important new chart — shows stability vs degradation)

---

## Validation & Testing

**Expected results if working correctly:**
- Simple Baseline should show high variance (throughput swings a lot 
  during busy phases due to relocation storms)
- Z-Safe variants should show more stable throughput across phases
- Column Grouping should handle spikes well but may be slow to recover 
  during drain phase
- Distance Greedy should crash during busy phase spike — show this clearly

**Sanity checks:**
- At 0% arrival rate warehouse should drain to empty over time
- At max arrival rate warehouse should fill toward 100% over time
- Warmup occupancy at end should be close to equilibrium for that 
  arrival/retrieval ratio
- Throughput per hour array length should equal sim hours

---

## Agent Notes

**Why this matters:** current fixed-capacity tests tell you which algo 
is best at a snapshot in time. These new tests tell you which algo stays 
best when the warehouse breathes — fills, drains, spikes. That's the 
real question.

**Key metric to watch:** P5 throughput (worst 10% of hours). An algorithm 
with great average throughput but terrible P5 is dangerous in production — 
it means occasional throughput collapses.