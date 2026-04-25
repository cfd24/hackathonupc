import time
import json
import csv
import os
from collections import defaultdict


class Robot:
    """Robot de paletización con 4 slots de procesamiento."""
    
    def __init__(self, robot_id: int, num_slots: int = 4):
        self.robot_id = robot_id
        self.num_slots = num_slots
        # Slots: {slot_id: {"pallet": destination, "finish_time": float, "start_time": float}}
        self.slots = {i: None for i in range(num_slots)}
    
    def has_free_slot(self) -> bool:
        return any(slot is None for slot in self.slots.values())
    
    def get_free_slot(self) -> int:
        """Returns the first available slot index, or -1 if none available."""
        for slot_id, slot_data in self.slots.items():
            if slot_data is None:
                return slot_id
        return -1
    
    def assign_pallet(self, destination: str, current_time: float, packing_time: int) -> int:
        """Assign a pallet to a free slot. Returns the slot_id."""
        slot_id = self.get_free_slot()
        if slot_id == -1:
            raise ValueError("No free slots available")
        
        self.slots[slot_id] = {
            "pallet": destination,
            "start_time": current_time,
            "finish_time": current_time + packing_time
        }
        return slot_id
    
    def get_completed_pallets(self, current_time: float) -> list:
        """Returns list of (slot_id, destination) for completed pallets."""
        completed = []
        for slot_id, slot_data in self.slots.items():
            if slot_data and slot_data["finish_time"] <= current_time:
                completed.append((slot_id, slot_data["pallet"]))
        return completed
    
    def free_slot(self, slot_id: int):
        """Free a slot after pallet is completed."""
        if slot_id in self.slots:
            self.slots[slot_id] = None
    
    def get_active_count(self) -> int:
        """Returns number of active slots."""
        return sum(1 for s in self.slots.values() if s is not None)
    
    def get_utilization(self) -> float:
        """Returns utilization percentage (0.0 to 1.0)."""
        active = self.get_active_count()
        return active / self.num_slots if self.num_slots > 0 else 0.0


class Simulator:
    def __init__(self, algorithm, max_active_pallets=8, packing_time=0):
        from controllers.silo_simulator.warehouse import Warehouse
        self.warehouse = Warehouse()
        self.algorithm = algorithm
        self.max_active_pallets = max_active_pallets
        self.packing_time = packing_time
        
        # Robot system: 2 robots with 4 slots each
        self.robots = [Robot(0, 4), Robot(1, 4)]
        
        # Active pallets count for retrieval logic
        self.active_pallets_count = 0
        
        # Boxes extracted from silo (waiting to form pallets)
        self.extracted_boxes = defaultdict(list)  # destination -> list of box codes
        
        # Pallets ready (12 boxes collected, waiting for robot)
        self.ready_pallets = defaultdict(lambda: {"boxes": [], "ready_time": None})  # destination -> {boxes, ready_time}
        
        # Pallets in packing (currently being processed by robots)
        # Format: {(robot_id, slot_id): {"destination": dest, "start_time": time, "finish_time": time}}
        self.packing_pallets = {}
        
        # Pallets sent (completed packing)
        self.sent_pallets = 0
        self.last_robot_completion_time = 0.0
        
        # Metrics
        self.boxes_processed = 0
        self.pallets_completed = 0  # This is now "sent" pallets
        self.total_time = 0.0
        self.pallet_times = []  # Time from ready to sent
        
        # Additional metrics for robot system
        self.pallets_waiting_count = 0
        self.pallets_packing_count = 0
        self.pallet_formation_times = []  # Time from first box extracted to pallet ready
        self.pallet_send_times = []  # Time from ready to sent

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
                    pos = row['position']  # e.g. "01_01_001_01_01"
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
                "total_time": self.total_time,
                "pallets_waiting": self.pallets_waiting_count,
                "pallets_packing": self.pallets_packing_count,
                "sent_pallets": self.sent_pallets
            },
            "grid": [
                {"pos": coords, "dest": data['destination']} 
                for coords, data in self.warehouse.grid.items()
            ]
        }
        with open('simulation_state.json', 'w') as f:
            json.dump(state, f)

    def process_extracted_boxes(self):
        """Process extracted boxes to form pallets ready for packing."""
        destinations_to_check = list(self.extracted_boxes.keys())
        
        for dest in destinations_to_check:
            boxes = self.extracted_boxes[dest]
            
            # Check if we have 12 boxes to form a pallet
            if len(boxes) >= 12:
                # Form a pallet
                pallet_boxes = boxes[:12]
                self.extracted_boxes[dest] = boxes[12:]
                
                # Add to ready pallets
                current_time = self.warehouse.global_time
                if dest not in self.ready_pallets or self.ready_pallets[dest]["ready_time"] is None:
                    # First pallet for this destination - record formation time
                    self.pallet_formation_times.append(current_time)
                    self.ready_pallets[dest] = {
                        "boxes": pallet_boxes,
                        "ready_time": current_time
                    }
                else:
                    # Additional pallet for same destination
                    self.ready_pallets[dest]["boxes"].extend(pallet_boxes)
                
                # Increment waiting count for this pallet
                self.pallets_waiting_count += 1

    def assign_pallets_to_robots(self):
        """Try to assign waiting pallets to free robot slots."""
        current_time = self.warehouse.global_time
        
        # Check for completed pallets first
        for robot in self.robots:
            completed = robot.get_completed_pallets(current_time)
            for slot_id, destination in completed:
                robot.free_slot(slot_id)
                self.sent_pallets += 1
                self.pallets_completed = self.sent_pallets
                self.pallets_packing_count -= 1
                self.packing_pallets.pop((robot.robot_id, slot_id), None)
                
                # Record time from ready to sent
                if self.ready_pallets[destination]["ready_time"]:
                    time_to_send = current_time - self.ready_pallets[destination]["ready_time"]
                    self.pallet_send_times.append(time_to_send)
        
        # Try to assign waiting pallets to free slots
        destinations_with_pallets = [d for d, p in self.ready_pallets.items() 
                                      if len(p["boxes"]) >= 12]
        
        for dest in destinations_with_pallets:
            # Check if we can form another pallet
            while len(self.ready_pallets[dest]["boxes"]) >= 12:
                # Try to find a free slot in any robot
                assigned = False
                for robot in self.robots:
                    if robot.has_free_slot():
                        slot_id = robot.assign_pallet(dest, current_time, self.packing_time)
                        finish_time = current_time + self.packing_time
                        self.packing_pallets[(robot.robot_id, slot_id)] = {
                            "destination": dest,
                            "start_time": current_time,
                            "finish_time": finish_time
                        }
                        self.last_robot_completion_time = max(self.last_robot_completion_time, finish_time)
                        self.pallets_waiting_count -= 1
                        self.pallets_packing_count += 1
                        
                        # Remove 12 boxes from ready
                        self.ready_pallets[dest]["boxes"] = self.ready_pallets[dest]["boxes"][12:]
                        assigned = True
                        break
                
                if not assigned:
                    break  # No free slots available

    def run(self, box_codes, real_time=False, delay=0.1, arrival_interval=3.6):
        print(f"\n[SIMULATION] Starting with {len(box_codes)} incoming boxes...")
        print(f"[CONFIG] Packing time per pallet: {self.packing_time}s")
        self.save_state("Simulation Started")
        
        for code in box_codes:
            if arrival_interval > 0:
                self.warehouse.global_time += arrival_interval
                
            box_data = self.parse_box_code(code)
            
            # 1. Storage (Online arrival)
            location = self.algorithm.get_storage_location(box_data, self.warehouse)
            if location:
                time_taken = self.warehouse.store_box(*location, box_data)
                self.boxes_processed += 1
                if real_time:
                    self.save_state(f"Stored {code}")
                    if delay > 0:
                        time.sleep(delay)
            
            # 2. Retrieval (Pallet Formation)
            if self.active_pallets_count < self.max_active_pallets:
                retrieval_plan = self.algorithm.get_retrieval_plan(self.warehouse)
                if retrieval_plan:
                    self.active_pallets_count += 1
                    for box_code in retrieval_plan:
                        coords = self.warehouse.box_positions.get(box_code)
                        if coords:
                            _, t = self.warehouse.retrieve_box(*coords)
                            
                            # BOX EXTRACTED - add to extracted boxes pool
                            extracted_box = self.warehouse.grid.get(coords)
                            if extracted_box is None:
                                # Box was retrieved, get its destination from the code
                                dest = box_code[7:15]
                                self.extracted_boxes[dest].append(box_code)
                    
                    self.active_pallets_count -= 1
                    
                    # Process extracted boxes to form ready pallets
                    self.process_extracted_boxes()
                    
                    # Try to assign ready pallets to robots
                    self.assign_pallets_to_robots()
                    
                    if real_time:
                        self.save_state(f"Boxes Extracted ({len(retrieval_plan)})")
                        if delay > 0:
                            time.sleep(delay)

        # Process any remaining pallets after all boxes are stored/retrieved
        self.assign_pallets_to_robots()
        while self.pallets_waiting_count > 0 or self.pallets_packing_count > 0:
            # Find the next completion time
            next_completion = float('inf')
            for robot in self.robots:
                for slot_id, slot_data in robot.slots.items():
                    if slot_data and slot_data["finish_time"] < next_completion:
                        next_completion = slot_data["finish_time"]
            
            if next_completion == float('inf'):
                break
                
            self.warehouse.global_time = max(self.warehouse.global_time, next_completion)
            self.assign_pallets_to_robots()

        # Calculate total time: max of shuttle time AND robot completion time
        shuttle_time = max(self.warehouse.shuttles_time.values())

        # Total time is the max of both
        self.total_time = max(shuttle_time, self.warehouse.global_time, self.last_robot_completion_time)
        self.pallets_completed = self.sent_pallets
        
        self.save_state("Simulation Finished")
        self.print_metrics()

    def print_metrics(self):
        hours = self.total_time / 3600
        throughput_pallets = self.sent_pallets / hours if hours > 0 else 0
        full_pallets_pct = (self.sent_pallets * 12 / self.boxes_processed * 100) if self.boxes_processed > 0 else 0
        
        # Calculate average times
        avg_pallet_time = sum(self.pallet_times) / len(self.pallet_times) if self.pallet_times else 0
        avg_send_time = sum(self.pallet_send_times) / len(self.pallet_send_times) if self.pallet_send_times else 0
        
        # Robot utilization
        total_robot_slots = sum(r.get_active_count() for r in self.robots)
        max_slots = len(self.robots) * 4
        robot_utilization = (total_robot_slots / max_slots * 100) if max_slots > 0 else 0
        
        print("\n" + "="*50)
        print("       SIMULATION PERFORMANCE")
        print("="*50)
        print(f"Total Simulation Time : {self.total_time:.2f}s ({self.total_time/60:.2f} min)")
        print(f"Boxes Processed       : {self.boxes_processed}")
        print(f"Pallets Waiting Robot : {self.pallets_waiting_count}")
        print(f"Pallets Packing       : {self.pallets_packing_count}")
        print(f"Pallets Sent          : {self.sent_pallets}")
        print(f"Throughput            : {throughput_pallets:.2f} pallets/hour")
        print(f"Full Pallets %        : {full_pallets_pct:.2f}%")
        print(f"Avg Time per Pallet   : {avg_pallet_time:.2f}s")
        print(f"Avg Send Time         : {avg_send_time:.2f}s")
        print(f"Robot Utilization     : {robot_utilization:.1f}%")
        print("="*50 + "\n")


if __name__ == "__main__":
    from controllers.algorithm.algorithms import SimpleAlgorithm
    sim = Simulator(SimpleAlgorithm(), packing_time=30)
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
