import sys
import os
import random
import time
import json
import numpy as np
from collections import defaultdict
from dataclasses import dataclass
from typing import List, Dict, Any, Tuple

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controllers.silo_simulator.simulator import Simulator, Robot
from controllers.algorithm.algorithms import (
    SimpleAlgorithm, DistanceGreedyAlgorithm, ColumnGroupingAlgorithm, 
    VelocityColumnAlgorithm, VelocitySimpleAlgorithm, ZSafeSimpleAlgorithm, 
    ZSafeProAlgorithm, ZSafeWeightedAlgorithm, ZSafeWeightedProAlgorithm, 
    ZSafeWeightedYSafeAlgorithm, ZSafeRWeightedYSafeAlgorithm, 
    ZSafeRWeightedYSafeVarianceAlgorithm, Variance,
    DestinationZoneAlgorithm, MaturityFirstAlgorithm
)

@dataclass
class SimPhase:
    name: str
    arrival_rate: float  # boxes/hr
    duration_s: float

class RealisticBenchmark:
    def __init__(self, algo_class, packing_time=30):
        self.algo_class = algo_class
        self.packing_time = packing_time
        self.rng = random.Random(42)  # Fixed seed for reproducibility
        self.destinations = [f"{i+1:08d}" for i in range(100)]
        
    def generate_box_code(self, i: int) -> str:
        src = f"{self.rng.randint(1000000, 9999999)}"
        dest = self.rng.choice(self.destinations)
        bulk = f"{i:05d}"
        return f"{src}{dest}{bulk}"

    def get_phase(self, mode: str, elapsed_s: float, current_phase: SimPhase = None) -> SimPhase:
        if mode == "steady":
            # 6 hours total. 1h warmup.
            # Phases: Busy (1500), Normal (1000), Drain (500)
            if current_phase is None or elapsed_s >= current_phase.duration_s:
                rates = [1500, 1000, 500]
                rate = self.rng.choice(rates)
                duration = self.rng.randint(1800, 5400) # 30-90 mins
                return SimPhase("Busy" if rate > 1200 else "Drain" if rate < 800 else "Normal", rate, elapsed_s + duration)
            return current_phase

        elif mode == "spike":
            # 2h busy (1600), 2h drain (400)
            if elapsed_s < 7200:
                return SimPhase("Spike-Busy", 1600, 7200)
            else:
                return SimPhase("Spike-Drain", 400, 14400)

        elif mode == "long":
            # 24 hours variable
            if current_phase is None or elapsed_s >= current_phase.duration_s:
                rate = self.rng.randint(400, 1600)
                duration = self.rng.randint(1800, 5400)
                return SimPhase("Variable", rate, elapsed_s + duration)
            return current_phase
            
        return SimPhase("Normal", 1000, 3600)

    def run_simulation(self, mode: str, total_hours: float, warmup_hours: float = 0):
        algo = self.algo_class()
        sim = Simulator(algo, packing_time=self.packing_time)
        
        # Initial fill to 40-50%
        total_slots = 4 * 2 * 60 * 8 * 2
        initial_fill = int(total_slots * 0.5) if mode == "steady" else int(total_slots * 0.4)
        for i in range(initial_fill):
            code = self.generate_box_code(i)
            box_data = sim.parse_box_code(code)
            loc = algo.get_storage_location(box_data, sim.warehouse)
            if loc:
                sim.warehouse.store_box(*loc, box_data, check_z=False)
        
        sim.warehouse.global_time = 0
        sim.warehouse.relocations = 0
        for y in range(1, 9):
            sim.warehouse.shuttles_time[y] = 0
            sim.warehouse.shuttles_x[y] = 0
            
        total_s = total_hours * 3600
        warmup_s = warmup_hours * 3600
        
        current_s = 0
        next_arrival_s = 0
        next_retrieval_s = 0
        retrieval_interval = 3.6 # 1000/hr
        
        hourly_stats = []
        last_recorded_hour = 0
        
        # We need to track processed boxes and current time accurately
        boxes_at_start_of_hour = 0
        relocs_at_start_of_hour = 0
        
        phase = None
        box_counter = initial_fill
        
        # Recovery time tracking
        recovery_start_s = 7200
        recovered_at_s = None
        
        while current_s < total_s:
            phase = self.get_phase(mode, current_s, phase)
            arrival_interval = 3600.0 / phase.arrival_rate if phase.arrival_rate > 0 else 1e9
            
            # Next event time
            next_event_s = min(next_arrival_s, next_retrieval_s, (last_recorded_hour + 1) * 3600)
            
            # Jump simulation clock to event time
            current_s = next_event_s
            sim.warehouse.global_time = current_s
            
            # Handle Arrival
            if current_s >= next_arrival_s:
                code = self.generate_box_code(box_counter)
                box_counter += 1
                box_data = sim.parse_box_code(code)
                loc = algo.get_storage_location(box_data, sim.warehouse)
                if loc:
                    sim.warehouse.store_box(*loc, box_data)
                    sim.boxes_processed += 1
                next_arrival_s += arrival_interval
                
            # Handle Retrieval
            if current_s >= next_retrieval_s:
                retrieval_plan = algo.get_retrieval_plan(sim.warehouse)
                if retrieval_plan:
                    for box_code in retrieval_plan:
                        coords = sim.warehouse.box_positions.get(box_code)
                        if coords:
                            sim.warehouse.retrieve_box(*coords)
                            # Add to robot pool
                            dest = box_code[7:15]
                            sim.extracted_boxes[dest].append(box_code)
                    sim.process_extracted_boxes()
                next_retrieval_s += retrieval_interval

            # Robot processing happens in "real time"
            sim.assign_pallets_to_robots()

            # Record Hourly Stats
            if current_s >= (last_recorded_hour + 1) * 3600:
                hour_num = last_recorded_hour + 1
                
                # Accurately determine "real" elapsed time for this hour
                # In a real system, if shuttles are behind, the hour "finishes" when the work is done.
                # Here we measure how many boxes were processed VS how much shuttle time was consumed.
                
                # Total time consumed by shuttles and global clock
                max_shuttle_time = max(sim.warehouse.shuttles_time.values()) if sim.warehouse.shuttles_time else 0
                effective_sim_time = max(current_s, max_shuttle_time)
                
                # Boxes processed this hour
                boxes_this_hour = sim.boxes_processed - boxes_at_start_of_hour
                relocs_this_hour = sim.warehouse.relocations - relocs_at_start_of_hour
                occupancy = len(sim.warehouse.grid) / total_slots * 100
                
                if current_s > warmup_s:
                    # Throughput is (boxes / time_it_actually_took)
                    # We normalize it to "boxes per simulated hour"
                    # If effective_sim_time > current_s, it means the warehouse is lagging.
                    time_drift = effective_sim_time - current_s
                    # For metrics, we'll use boxes_processed / (1 hour + drift_added_this_hour)
                    # But simpler: just record the raw count. The user wants to see the "throughput" drop.
                    # If shuttles are slow, the throughput should be lower.
                    
                    # Realistically, throughput = boxes / elapsed_time
                    # If 1 hour of arrivals takes 1.2 hours of shuttle time, throughput = boxes / 1.2
                    hourly_throughput = boxes_this_hour * (3600 / max(3600, time_drift)) 
                    
                    hourly_stats.append({
                        "hour": hour_num,
                        "throughput": float(hourly_throughput),
                        "relocs": relocs_this_hour,
                        "occupancy": occupancy
                    })
                    
                    if mode == "spike" and current_s > recovery_start_s and recovered_at_s is None:
                        if hourly_throughput >= 950: # recovery target
                            recovered_at_s = current_s - recovery_start_s

                boxes_at_start_of_hour = sim.boxes_processed
                relocs_at_start_of_hour = sim.warehouse.relocations
                last_recorded_hour += 1

        # Final Metrics
        throughputs = [h["throughput"] for h in hourly_stats]
        avg_throughput = np.mean(throughputs) if throughputs else 0
        p5_throughput = np.percentile(throughputs, 10) if throughputs else 0
        
        return {
            "mode": mode,
            "steady_state_throughput": float(avg_throughput),
            "p5_throughput": float(p5_throughput),
            "spike_recovery_time_s": float(recovered_at_s) if recovered_at_s else -1,
            "throughput_per_hour": throughputs,
            "occupancy_over_time": [h["occupancy"] for h in hourly_stats],
            "total_relocs": sim.warehouse.relocations,
            "final_occupancy": len(sim.warehouse.grid) / total_slots * 100
        }

def run_all_realistic():
    algos = [
        ("Simple Baseline", SimpleAlgorithm),
        ("Distance Greedy", DistanceGreedyAlgorithm),
        ("Column Grouping", ColumnGroupingAlgorithm),
        ("Velocity Column", VelocityColumnAlgorithm),
        ("Velocity Simple", VelocitySimpleAlgorithm),
        ("Z-Safe Simple", ZSafeSimpleAlgorithm),
        ("Z-Safe Pro", ZSafeProAlgorithm),
        ("Z-Safe Weighted", ZSafeWeightedAlgorithm),
        ("Z-Safe Weighted Y-Safe", ZSafeWeightedYSafeAlgorithm),
        ("Z-Safe-R Weighted Y-Safe", ZSafeRWeightedYSafeAlgorithm),
        ("Z-Safe-R Weighted Y-Safe Variance", ZSafeRWeightedYSafeVarianceAlgorithm),
        ("Variance", Variance),
        ("Z-Weighted Pro", ZSafeWeightedProAlgorithm),
        ("Destination Zones", DestinationZoneAlgorithm),
        ("Maturity First", MaturityFirstAlgorithm),
    ]
    
    all_results = []
    
    for name, cls in algos:
        print(f"Benchmarking {name}...")
        try:
            bench = RealisticBenchmark(cls)
            
            # Mode 1: Steady State (6h, 1h warmup)
            print(f"  -> Running Steady-State...")
            r1 = bench.run_simulation("steady", 6, 1)
            
            # Mode 2: Spike (4h total)
            print(f"  -> Running Spike Test...")
            r2 = bench.run_simulation("spike", 4, 0)
            
            # Mode 3: Long Run (24h)
            print(f"  -> Running Long-Run...")
            r3 = bench.run_simulation("long", 24, 0)
            
            all_results.append({
                "algorithm": name,
                "steady": r1,
                "spike": r2,
                "long": r3
            })
        except Exception as e:
            print(f"  -> FAILED: {str(e)}")
            
    with open('realistic_benchmark_results.json', 'w') as f:
        json.dump(all_results, f, indent=2)
    print("\nRealistic benchmark complete. Results saved to realistic_benchmark_results.json")

if __name__ == "__main__":
    run_all_realistic()
