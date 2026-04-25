from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from controllers.algorithm.algorithms import SimpleAlgorithm, DistanceGreedyAlgorithm
from controllers.silo_simulator.simulator import Simulator
import random
import os

app = Flask(__name__, static_folder='frontend')
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

def preload_warehouse(sim, fullness):
    if fullness == "empty":
        return
    
    if fullness == "low":
        sim.load_initial_state("silo-semi-empty.csv")
    else:
        # Robust random preloader: Fill Z=1 before Z=2
        target_count = 3840 if fullness == "medium" else 5760
        
        z1_slots = [(a,s,x,y,1) for a in range(1,5) for s in range(1,3) for x in range(1,61) for y in range(1,9)]
        z2_slots = [(a,s,x,y,2) for a in range(1,5) for s in range(1,3) for x in range(1,61) for y in range(1,9)]
        random.shuffle(z1_slots)
        random.shuffle(z2_slots)
        
        if target_count <= 3840:
            slots_to_fill = z1_slots[:target_count]
        else:
            slots_to_fill = z1_slots + z2_slots[:(target_count - 3840)]
            
        codes = generate_box_codes(len(slots_to_fill), 20)
        for i, slot in enumerate(slots_to_fill):
            box_data = sim.parse_box_code(codes[i])
            sim.warehouse.grid[slot] = box_data
            sim.warehouse.box_positions[box_data['code']] = slot
            
    # SILENT RESET: Ensure simulation starts at T=0
    sim.warehouse.global_time = 0.0
    sim.warehouse.shuttles_time = {y: 0.0 for y in range(1, sim.warehouse.num_y + 1)}
    sim.warehouse.shuttles_x = {y: 0 for y in range(1, sim.warehouse.num_y + 1)}

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('frontend', path)

@app.route('/run', methods=['POST'])
def run_simulation():
    data = request.json
    boxes_count = data.get('boxes', 1000)
    destinations = data.get('destinations', 20)
    box_codes = generate_box_codes(boxes_count, destinations)
    sim = Simulator(SimpleAlgorithm())
    sim.run(box_codes)
    
    full_pallets_pct = (sim.sent_pallets * 12 / sim.boxes_processed * 100) if sim.boxes_processed > 0 else 0
    if full_pallets_pct > 100: full_pallets_pct = 100.0

    boxes = [{
        'aisle': aisle, 'side': side, 'x': x, 'y': y, 'z': z, 'dest': box_data['destination']
    } for (aisle, side, x, y, z), box_data in sim.warehouse.grid.items()]
    
    occupancy = len(sim.warehouse.grid) / 7680
    hours = sim.total_time / 3600
    
    return jsonify({
        'total_time': sim.total_time,
        'pallets_completed': sim.pallets_completed,
        'boxes_processed': sim.boxes_processed,
        'pallets_per_hour': round(sim.pallets_completed / hours, 2) if hours > 0 else 0,
        'full_pallets_pct': full_pallets_pct,
        'boxes': boxes,
        'occupancy': occupancy
    })

@app.route('/compare', methods=['POST'])
def compare_algorithms():
    data = request.json
    boxes_count = data.get('boxes', 1000)
    destinations = data.get('destinations', 20)
    fullness = data.get('fullness', 'empty')
    box_codes = generate_box_codes(boxes_count, destinations)
    
    results = {}
    
    # Run SimpleAlgorithm
    sim_simple = Simulator(SimpleAlgorithm())
    preload_warehouse(sim_simple, fullness)
    sim_simple.run(box_codes)
    hours_simple = sim_simple.total_time / 3600
    
    fp_pct_simple = (sim_simple.sent_pallets * 12 / sim_simple.boxes_processed * 100) if sim_simple.boxes_processed > 0 else 0
    if fp_pct_simple > 100: fp_pct_simple = 100.0

    results['simple'] = {
        'total_time': sim_simple.total_time,
        'pallets_completed': sim_simple.pallets_completed,
        'pallets_per_hour': round(sim_simple.pallets_completed / hours_simple, 2) if hours_simple > 0 else 0,
        'full_pallets_pct': fp_pct_simple,
        'occupancy': len(sim_simple.warehouse.grid) / 7680,
        'boxes': [{
            'aisle': a, 'side': s, 'x': x, 'y': y, 'z': z, 'dest': b['destination']
        } for (a, s, x, y, z), b in sim_simple.warehouse.grid.items()],
        'relocations': sim_simple.warehouse.relocations
    }
    
    # Run DistanceGreedyAlgorithm
    sim_greedy = Simulator(DistanceGreedyAlgorithm())
    preload_warehouse(sim_greedy, fullness)
    sim_greedy.run(box_codes)
    hours_greedy = sim_greedy.total_time / 3600

    fp_pct_greedy = (sim_greedy.sent_pallets * 12 / sim_greedy.boxes_processed * 100) if sim_greedy.boxes_processed > 0 else 0
    if fp_pct_greedy > 100: fp_pct_greedy = 100.0

    results['greedy'] = {
        'total_time': sim_greedy.total_time,
        'pallets_completed': sim_greedy.pallets_completed,
        'pallets_per_hour': round(sim_greedy.pallets_completed / hours_greedy, 2) if hours_greedy > 0 else 0,
        'full_pallets_pct': fp_pct_greedy,
        'occupancy': len(sim_greedy.warehouse.grid) / 7680,
        'boxes': [{
            'aisle': a, 'side': s, 'x': x, 'y': y, 'z': z, 'dest': b['destination']
        } for (a, s, x, y, z), b in sim_greedy.warehouse.grid.items()],
        'relocations': sim_greedy.warehouse.relocations
    }
    
    return jsonify(results)

if __name__ == '__main__':
    app.run(port=8080, debug=True)
