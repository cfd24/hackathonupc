import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from controllers.algorithm.algorithms import SimpleAlgorithm
from controllers.silo_simulator.simulator import Simulator
import random

def generate_box_codes(n, num_destinations):
    destinations = [str(i).zfill(8) for i in range(1, num_destinations + 1)]
    codes = []
    for _ in range(n):
        src = str(random.randint(1, 9999999)).zfill(7)
        dest = random.choice(destinations)
        bulk = str(random.randint(1, 99999)).zfill(5)
        codes.append(src + dest + bulk)
    return codes

def run_test():
    sim = Simulator(SimpleAlgorithm())
    
    # Preload to 95%
    print("Preloading to 95%...")
    codes = generate_box_codes(7296, 20)
    for code in codes:
        box_data = sim.parse_box_code(code)
        loc = sim.algorithm.get_storage_location(box_data, sim.warehouse)
        if loc:
            sim.warehouse.store_box(*loc, box_data)
    
    # Run 1000 boxes
    print("Running simulation with 1000 boxes...")
    stream = generate_box_codes(1000, 20)
    sim.run(stream)
    print("Simulation finished.")

if __name__ == "__main__":
    run_test()
