from flask import Flask, jsonify, request
from flask_cors import CORS
from controllers.algorithm.algorithms import SimpleAlgorithm, DistanceGreedyAlgorithm
from controllers.silo_simulator.simulator import Simulator
import random

app = Flask(__name__)
CORS(app)

def generate_box_codes(n, num_destinations):
    destinations = [str(i).zfill(8) for i in range(1, num_destinations + 1)]
    codes = []
    for _ in range(n):
        src = str(random.randint(1, 9999999)).zfill(7)
        dest = random.choice(destinations)
        bulk = str(random.randint(1, 99999)).zfill(5)
        codes.append(src + dest + bulk)
    return codes

@app.route('/run', methods=['POST'])
def run_simulation():
    data = request.json
    boxes_count = data.get('boxes', 1000)
    destinations = data.get('destinations', 20)
    box_codes = generate_box_codes(boxes_count, destinations)
    sim = Simulator(SimpleAlgorithm())
    sim.run(box_codes)
    
    # Extract box positions
    boxes = []
    for (aisle, side, x, y, z), box_data in sim.warehouse.grid.items():
        boxes.append({
            'aisle': aisle,
            'side': side,
            'x': x,
            'y': y,
            'z': z,
            'dest': box_data['destination']
        })
    
    occupancy = len(sim.warehouse.grid) / 7680
    hours = sim.total_time / 3600
    
    return jsonify({
        'total_time': sim.total_time,
        'pallets_completed': sim.pallets_completed,
        'boxes_processed': sim.boxes_processed,
        'pallets_per_hour': round(sim.pallets_completed / hours, 2) if hours > 0 else 0,
        'boxes': boxes,
        'occupancy': occupancy
    })

@app.route('/compare', methods=['POST'])
def compare_algorithms():
    data = request.json
    boxes_count = data.get('boxes', 1000)
    destinations = data.get('destinations', 20)
    box_codes = generate_box_codes(boxes_count, destinations)
    
    results = {}
    
    # Run SimpleAlgorithm
    sim_simple = Simulator(SimpleAlgorithm())
    sim_simple.run(box_codes)
    hours_simple = sim_simple.total_time / 3600
    results['simple'] = {
        'total_time': sim_simple.total_time,
        'pallets_completed': sim_simple.pallets_completed,
        'pallets_per_hour': round(sim_simple.pallets_completed / hours_simple, 2) if hours_simple > 0 else 0,
        'occupancy': len(sim_simple.warehouse.grid) / 7680,
        'boxes': [{
            'aisle': a, 'side': s, 'x': x, 'y': y, 'z': z, 'dest': b['destination']
        } for (a, s, x, y, z), b in sim_simple.warehouse.grid.items()]
    }
    
    # Run DistanceGreedyAlgorithm
    sim_greedy = Simulator(DistanceGreedyAlgorithm())
    sim_greedy.run(box_codes)
    hours_greedy = sim_greedy.total_time / 3600
    results['greedy'] = {
        'total_time': sim_greedy.total_time,
        'pallets_completed': sim_greedy.pallets_completed,
        'pallets_per_hour': round(sim_greedy.pallets_completed / hours_greedy, 2) if hours_greedy > 0 else 0,
        'occupancy': len(sim_greedy.warehouse.grid) / 7680,
        'boxes': [{
            'aisle': a, 'side': s, 'x': x, 'y': y, 'z': z, 'dest': b['destination']
        } for (a, s, x, y, z), b in sim_greedy.warehouse.grid.items()] 
    }
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(port=8080, debug=True)
