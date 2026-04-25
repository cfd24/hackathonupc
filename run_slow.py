import time
import random
from controllers.silo_simulator.simulator import Simulator
from controllers.algorithm.algorithms import ColumnGroupingAlgorithm
from main.main import generate_destination_weights, generate_box_stream

def slow_run():
    num_destinations = 5
    num_boxes = 500
    packing_time = 42

    rng = random.Random(42)
    destination_weights = generate_destination_weights(num_destinations, rng)
    test_stream = generate_box_stream(num_boxes, destination_weights, rng)

    algo = ColumnGroupingAlgorithm()
    sim = Simulator(algo, packing_time=packing_time)

    print("Running slow simulation for frontend visualization...")
    sim.run(test_stream, real_time=True, delay=0.1)
    print("Done!")

if __name__ == "__main__":
    slow_run()
