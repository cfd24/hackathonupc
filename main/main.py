"""
HackUPC 2026 — Medieval Challenge
Algorithm Operation Sandbox

This script provides a sandbox environment to test, benchmark, and compare
different storage and retrieval algorithms against the same flow of boxes.
"""
import sys
import os
import random
import time

# Add project root to sys.path so we can import 'controllers'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controllers.silo_simulator.simulator import Simulator
from controllers.algorithm.algorithms import SimpleAlgorithm

# Import new algorithms here as you build them
AVAILABLE_ALGORITHMS = [
    ("Simple Baseline", SimpleAlgorithm),
]

def generate_box_stream(num_boxes: int, seed: int = 42) -> list[str]:
    """Generate a reproducible stream of random 20-digit box codes."""
    rng = random.Random(seed)
    boxes = []
    
    # We create a few "hot" destinations so pallets actually get completed
    destinations = [f"{rng.randint(10_000_000, 99_999_999)}" for _ in range(20)]
    
    for i in range(num_boxes):
        src  = f"{rng.randint(1_000_000, 9_999_999)}"
        dest = rng.choice(destinations)
        bulk = f"{i:05d}"
        boxes.append(f"{src}{dest}{bulk}")
        
    return boxes

def print_banner(title: str) -> None:
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def run_sandbox():
    print_banner("Algorithm Sandbox initialized")
    
    # Configuration
    NUM_BOXES = 1000
    print(f"Generating {NUM_BOXES} boxes for testing...")
    test_stream = generate_box_stream(NUM_BOXES)
    
    results = []
    
    for algo_name, AlgoClass in AVAILABLE_ALGORITHMS:
        print(f"\n[RUNNING] Algorithm: {algo_name}")
        
        # Instantiate fresh algorithm and simulator
        algo = AlgoClass()
        sim = Simulator(algo)
        
        start_real_time = time.time()
        
        # We suppress the simulator's noisy print metrics to keep the sandbox clean
        # Instead, we will extract the data manually
        import contextlib, io
        with contextlib.redirect_stdout(io.StringIO()):
            try:
                sim.run(test_stream)
                error = None
            except Exception as e:
                error = str(e)
                
        real_duration = time.time() - start_real_time
        
        if error:
            print(f"  -> CRASHED: {error}")
            continue
            
        hours = sim.total_time / 3600
        throughput = sim.boxes_processed / hours if hours > 0 else 0
        pallet_pct = (sim.pallets_completed * 12 / sim.boxes_processed * 100) if sim.boxes_processed > 0 else 0
        
        results.append({
            "name": algo_name,
            "sim_time": sim.total_time,
            "processed": sim.boxes_processed,
            "pallets": sim.pallets_completed,
            "throughput": throughput,
            "pallet_pct": pallet_pct,
            "real_duration": real_duration
        })
        print("  -> Completed successfully.")

    # Print Comparative Benchmark
    print_banner("Benchmark Results")
    if not results:
        print("No algorithms completed successfully.")
        return
        
    # Sort by simulation time (lower is better)
    results.sort(key=lambda r: r["sim_time"])
    
    header = f"{'Algorithm':<20} | {'Sim Time (s)':<12} | {'Processed':<9} | {'Pallets':<7} | {'Throughput/h':<12} | {'Real Time':<10}"
    print(header)
    print("-" * len(header))
    
    for r in results:
        print(f"{r['name']:<20} | {r['sim_time']:<12.1f} | {r['processed']:<9} | {r['pallets']:<7} | {r['throughput']:<12.1f} | {r['real_duration']:<8.2f}s")
        
    print("\nSandbox execution finished.")

if __name__ == "__main__":
    run_sandbox()
