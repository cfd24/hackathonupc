import time
import json
import csv
import os

class Simulator:
    def __init__(self, algorithm, max_active_pallets=8):
        from controllers.silo_simulator.warehouse import Warehouse
        self.warehouse = Warehouse()
        self.algorithm = algorithm
        self.max_active_pallets = max_active_pallets
        self.active_pallets_count = 0
        self.boxes_processed = 0
        self.pallets_completed = 0
        self.total_time = 0.0
        self.pallet_times = []

    def parse_box_code(self, code):
        if len(code) != 20:
            raise ValueError(f"Invalid box code length: {len(code)}")
        return {
            'code': code,
            'source': code[:7],
            'destination': code[7:15],
            'bulk': code[15:]
        }

    def load_initial_state(self, csv_file):
        try:
            with open(csv_file, mode='r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    pos = row['position'] # e.g. "01_01_001_01_01"
                    code = row['box_code']
                    aisle = int(pos[0:2])
                    side = int(pos[3:5])
                    x = int(pos[6:9])
                    y = int(pos[10:12])
                    z = int(pos[13:15])
                    box_data = self.parse_box_code(code)
                    self.warehouse.store_box(aisle, side, x, y, z, box_data, check_z=False)
            print(f"Initialized warehouse with {len(self.warehouse.grid)} boxes from {csv_file}")
        except FileNotFoundError:
            print(f"Warning: {csv_file} not found. Starting with empty warehouse.")

    def save_state(self, last_event=""):
        state = {
            "last_event": last_event,
            "global_time": self.warehouse.global_time,
            "shuttles": [
                {"y": y, "x": x, "time": self.warehouse.shuttles_time[y]} 
                for y, x in self.warehouse.shuttles_x.items()
            ],
            "metrics": {
                "boxes_processed": self.boxes_processed,
                "pallets_completed": self.pallets_completed,
                "total_time": self.total_time
            },
            "grid": [
                {"pos": coords, "dest": data['destination']} 
                for coords, data in self.warehouse.grid.items()
            ]
        }
        with open('simulation_state.json', 'w') as f:
            json.dump(state, f)

    def run(self, box_codes, real_time=False, delay=0.1, arrival_interval=3.6):
        print(f"\n[SIMULATION] Starting with {len(box_codes)} incoming boxes...")
        self.save_state("Simulation Started")
        
        for code in box_codes:
            if arrival_interval > 0:
                self.warehouse.global_time += arrival_interval
                
            box_data = self.parse_box_code(code)
            
            # 1. Storage (Online arrival)
            location = self.algorithm.get_storage_location(box_data, self.warehouse)
            if location:
                time_taken = self.warehouse.store_box(*location, box_data, arrival_interval)
                self.boxes_processed += 1
                if real_time:
                    self.save_state(f"Stored {code}")
                    if delay > 0: time.sleep(delay)
            
            # 2. Retrieval (Pallet Formation)
            if self.active_pallets_count < self.max_active_pallets:
                retrieval_plan = self.algorithm.get_retrieval_plan(self.warehouse)
                if retrieval_plan:
                    pallet_start_time = max(self.warehouse.shuttles_time.values())
                    self.active_pallets_count += 1
                    for box_code in retrieval_plan:
                        coords = self.warehouse.box_positions.get(box_code)
                        if coords:
                            _, t = self.warehouse.retrieve_box(*coords)
                    
                    pallet_end_time = max(self.warehouse.shuttles_time.values())
                    self.pallet_times.append(pallet_end_time - pallet_start_time)
                    self.pallets_completed += 1
                    self.active_pallets_count -= 1
                    if real_time:
                        self.save_state(f"Pallet Completed ({self.pallets_completed})")
                        if delay > 0: time.sleep(delay)

        self.total_time = max(self.warehouse.shuttles_time.values())
        self.save_state("Simulation Finished")
        self.print_metrics()

    def print_metrics(self):
        hours = self.total_time / 3600
        throughput_pallets = self.pallets_completed / hours if hours > 0 else 0
        full_pallets_pct = (self.pallets_completed * 12 / self.boxes_processed * 100) if self.boxes_processed > 0 else 0
        avg_pallet_time = sum(self.pallet_times) / len(self.pallet_times) if self.pallet_times else 0
        
        print("\n" + "="*40)
        print("       SIMULATION PERFORMANCE")
        print("="*40)
        print(f"Total Simulation Time : {self.total_time:.2f}s ({self.total_time/60:.2f} min)")
        print(f"Boxes Processed       : {self.boxes_processed}")
        print(f"Pallets Completed     : {self.pallets_completed}")
        print(f"Throughput            : {throughput_pallets:.2f} pallets/hour")
        print(f"Full Pallets %        : {full_pallets_pct:.2f}%")
        print(f"Avg Time per Pallet   : {avg_pallet_time:.2f}s")
        print("="*40 + "\n")

if __name__ == "__main__":
    from controllers.algorithm.algorithms import SimpleAlgorithm
    sim = Simulator(SimpleAlgorithm())
    sim.load_initial_state('silo-semi-empty.csv')
    
    import random
    test_boxes = []
    dests = [f"DEST{i:04d}" for i in range(50)] 
    for _ in range(1000):
        src = f"{random.randint(1000000, 9999999)}"
        dest = random.choice(dests)
        bulk = f"{random.randint(10000, 99999)}"
        test_boxes.append(f"{src}{dest}{bulk}")
    
    sim.run(test_boxes, real_time=False, arrival_interval=3.6)
