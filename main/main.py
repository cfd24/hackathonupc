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
from controllers.algorithm.algorithms import SimpleAlgorithm, DistanceGreedyAlgorithm

# Import new algorithms here as you build them
AVAILABLE_ALGORITHMS = [
    ("Simple Baseline", SimpleAlgorithm),
    ("Distance Greedy", DistanceGreedyAlgorithm),
]

# --- SIMULATION CONFIGURATION ---
BOXES_PER_HOUR = 1000
# --------------------------------

def generate_destination_weights(num_destinations: int, rng: random.Random) -> dict[str, float]:
    """Generate random destination probabilities that sum to 1.0."""
    raw_weights = [rng.random() for _ in range(num_destinations)]
    total_weight = sum(raw_weights)
    
    return {
        f"{i + 1:08d}": weight / total_weight
        for i, weight in enumerate(raw_weights)
    }

def generate_box_stream(
    num_boxes: int,
    destination_weights: dict[str, float],
    rng: random.Random,
) -> list[str]:
    """Generate random 20-digit box codes based on destination weights."""
    boxes = []
    
    dests = list(destination_weights.keys())
    weights = list(destination_weights.values())
    
    for i in range(num_boxes):
        src  = f"{rng.randint(1_000_000, 9_999_999)}"
        dest = rng.choices(dests, weights=weights, k=1)[0]
        bulk = f"{i:05d}"
        boxes.append(f"{src}{dest}{bulk}")
        
    return boxes

def read_non_negative_int(prompt: str) -> int:
    while True:
        value_input = input(prompt).strip()
        try:
            value = int(value_input)
            if value >= 0:
                return value
            print("El valor debe ser un numero entero mayor o igual que 0.")
        except ValueError:
            print("Por favor, introduce un numero entero valido.")

def read_positive_int(prompt: str) -> int:
    while True:
        value = read_non_negative_int(prompt)
        if value > 0:
            return value
        print("El valor debe ser mayor que 0.")

def print_banner(title: str) -> None:
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def run_sandbox():
    print_banner("Algorithm Sandbox initialized")
    
    print("Available Algorithms:")
    for i, (name, _) in enumerate(AVAILABLE_ALGORITHMS, 1):
        print(f"  {i}. {name}")
    print(f"  {len(AVAILABLE_ALGORITHMS) + 1}. Run All (Compare)")
    
    choice = input("\nSelect an option (enter number): ").strip()
    
    try:
        choice_idx = int(choice)
        if 1 <= choice_idx <= len(AVAILABLE_ALGORITHMS):
            selected_algorithms = [AVAILABLE_ALGORITHMS[choice_idx - 1]]
        elif choice_idx == len(AVAILABLE_ALGORITHMS) + 1:
            selected_algorithms = AVAILABLE_ALGORITHMS
        else:
            print("Invalid choice. Exiting.")
            return
    except ValueError:
        print("Invalid input. Exiting.")
        return
    
    # Get packing time per pallet
    while True:
        packing_time_input = input("\nIntroduce el tiempo de empaquetado por pallet en segundos: ").strip()
        try:
            packing_time = int(packing_time_input)
            if packing_time >= 0:
                break
            else:
                print("El tiempo debe ser un número entero mayor o igual que 0.")
        except ValueError:
            print("Por favor, introduce un número entero válido.")
    
    num_destinations = read_positive_int("\nIntroduce cuantos destinos quieres simular: ")
    
    # Configuration
    NUM_BOXES = 1000
    rng = random.Random()
    destination_weights = generate_destination_weights(num_destinations, rng)
    
    print("\nDestination weights for this run:")
    for destination, weight in destination_weights.items():
        print(f"  {destination}: {weight * 100:.2f}%")
    
    print(f"\nGenerating {NUM_BOXES} boxes for testing...")
    test_stream = generate_box_stream(NUM_BOXES, destination_weights, rng)
    
    results = []
    
    for algo_name, AlgoClass in selected_algorithms:
        print(f"\n[RUNNING] Algorithm: {algo_name}")
        
        # Instantiate fresh algorithm and simulator
        algo = AlgoClass()
        sim = Simulator(algo, packing_time=packing_time)
        
        start_real_time = time.time()
        
        # We suppress the simulator's noisy print metrics to keep the sandbox clean
        # Instead, we will extract the data manually
        import contextlib, io
        with contextlib.redirect_stdout(io.StringIO()):
            try:
                arrival_interval = 3600.0 / BOXES_PER_HOUR
                sim.run(test_stream, real_time=False, arrival_interval=arrival_interval)
                error = None
            except Exception as e:
                error = str(e)
                
        real_duration = time.time() - start_real_time
        
        if error:
            print(f"  -> CRASHED: {error}")
            continue
            
        hours = sim.total_time / 3600
        throughput = sim.boxes_processed / hours if hours > 0 else 0
        pallet_pct = (sim.sent_pallets * 12 / sim.boxes_processed * 100) if sim.boxes_processed > 0 else 0
        
        results.append({
            "name": algo_name,
            "sim_time": sim.total_time,
            "processed": sim.boxes_processed,
            "pallets": sim.sent_pallets,
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
