import sys
import os
import random
import json
from collections import defaultdict

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controllers.silo_simulator.simulator import Simulator
from controllers.algorithm.algorithms import (
    SimpleAlgorithm, DistanceGreedyAlgorithm, ColumnGroupingAlgorithm, 
    VelocityColumnAlgorithm, VelocitySimpleAlgorithm, ZSafeSimpleAlgorithm, 
    ZSafeProAlgorithm, ZSafeWeightedAlgorithm, ZSafeWeightedProAlgorithm, 
    ZSafeWeightedYSafeAlgorithm, ZSafeRWeightedYSafeAlgorithm, 
    ZSafeRWeightedYSafeVarianceAlgorithm, Variance,
    DestinationZoneAlgorithm, MaturityFirstAlgorithm
)

def run_capacity_benchmarks():
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
    
    CAPACITIES = [0, 25, 50, 75]
    TOTAL_CAPACITY = 4 * 2 * 60 * 8 * 2  # 7680
    NUM_BOXES = 1000
    BOXES_PER_HOUR = 1000
    arrival_interval = 3600.0 / BOXES_PER_HOUR
    
    rng = random.Random(42)
    num_destinations = 50
    raw_weights = [rng.random() for _ in range(num_destinations)]
    total_weight = sum(raw_weights)
    dests = [f"{i + 1:08d}" for i in range(num_destinations)]
    weights = [w / total_weight for w in raw_weights]
    
    def generate_stream(n):
        stream = []
        for i in range(n):
            src = f"{rng.randint(1000000, 9999999)}"
            dest = rng.choices(dests, weights=weights, k=1)[0]
            bulk = f"{i:05d}"
            stream.append(f"{src}{dest}{bulk}")
        return stream

    prefill_streams = {cap: generate_stream(int(TOTAL_CAPACITY * (cap / 100.0))) for cap in CAPACITIES}
    test_stream = generate_stream(NUM_BOXES)
    
    results = []
    
    for name, cls in algos:
        print(f"Benchmarking {name}...")
        for cap in CAPACITIES:
            try:
                algo = cls()
                sim = Simulator(algo, packing_time=0)
                
                # Prefill
                if cap > 0:
                    for code in prefill_streams[cap]:
                        box_data = sim.parse_box_code(code)
                        loc = algo.get_storage_location(box_data, sim.warehouse)
                        if loc:
                            sim.warehouse.store_box(*loc, box_data, check_z=False)
                    
                    sim.warehouse.global_time = 0.0
                    sim.warehouse.relocations = 0
                    for y in range(1, 9):
                        sim.warehouse.shuttles_time[y] = 0.0
                        sim.warehouse.shuttles_x[y] = 0
                
                sim.run(test_stream, real_time=False, arrival_interval=arrival_interval)
                
                hours = sim.total_time / 3600
                throughput = sim.sent_pallets / hours if hours > 0 else 0
                
                results.append({
                    "algorithm": name,
                    "capacity_pct": cap,
                    "sim_time_s": float(sim.total_time),
                    "pallets": int(sim.sent_pallets),
                    "throughput_per_h": float(sim.sent_pallets / hours) if hours > 0 else 0,
                    "z_blocks": int(sim.warehouse.relocations),
                    "z_safe": getattr(algo, 'is_z_safe', False),
                    "status": "ok"
                })
                print(f"  -> {cap}%: {throughput:.1f} pallets/h")
            except Exception as e:
                print(f"  -> {cap}%: FAILED ({str(e)})")
                results.append({
                    "algorithm": name,
                    "capacity_pct": cap,
                    "sim_time_s": None,
                    "pallets": None,
                    "throughput_per_h": None,
                    "z_blocks": None,
                    "z_safe": False,
                    "status": "failed"
                })
                
    with open('benchmark-data.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("\nCapacity benchmarks complete. Saved to benchmark-data.json")

if __name__ == "__main__":
    run_capacity_benchmarks()
