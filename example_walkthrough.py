from controllers.silo_simulator.warehouse import Warehouse
from controllers.silo_simulator.simulator import Simulator
from controllers.algorithm.algorithms import SimpleAlgorithm

class VerboseSimulator(Simulator):
    def __init__(self, algorithm):
        super().__init__(algorithm)
        self.pallet_times = []

    def run_step_by_step(self, box_codes):
        print(f"{'STEP':<10} | {'ACTION':<40} | {'TIME':<10} | {'SHUTTLE POS'}")
        print("-" * 80)
        
        for code in box_codes:
            box_data = self.parse_box_code(code)
            
            # 1. Storage
            location = self.algorithm.get_storage_location(box_data, self.warehouse)
            if location:
                time_taken = self.warehouse.store_box(*location, box_data)
                self.total_time = max(self.warehouse.shuttles_time.values())
                y = location[3]
                print(f"{'STORE':<10} | Box {code[-4:]} -> {location} | {self.total_time:>8.1f}s | Y{y} at X={location[2]}")
            
            # 2. Retrieval Check
            retrieval_plan = self.algorithm.get_retrieval_plan(self.warehouse)
            if retrieval_plan:
                print(f"{'PALLET':<10} | Destination {box_data['destination']} ready! | {'':<10} |")
                # REVERSE retrieval order to force Z=2 before Z=1 relocations
                for box_code in reversed(retrieval_plan):
                    coords = self.warehouse.box_positions.get(box_code)
                    if coords:
                        # Check for blocking box to show relocation
                        aisle, side, x, y, z = coords
                        is_blocked = (z == 2 and not self.warehouse.is_slot_empty(aisle, side, x, y, 1))
                        
                        pallet_start_time = max(self.warehouse.shuttles_time.values())
                        box_data_ret, t = self.warehouse.retrieve_box(*coords)
                        pallet_end_time = max(self.warehouse.shuttles_time.values())
                        self.total_time = pallet_end_time
                        
                        action = f"Retrieve {box_code[-4:]}"
                        if is_blocked:
                            action += " (RELOCATED Z=1!)"
                        
                        print(f"{'RETRIEVE':<10} | {action:<40} | {self.total_time:>8.1f}s | Y{y} back at X=0")
                
                self.pallets_completed += 1
                self.pallet_times.append(1.0) # Dummy for metrics
                print("-" * 80)

def walkthrough():
    print("\n=== SILO SIMULATION WALKTHROUGH (12 Boxes -> 1 Pallet) ===\n")
    
    wh = Warehouse()
    sim = VerboseSimulator(SimpleAlgorithm())
    sim.warehouse = wh # Use our instance
    
    # We'll use 12 boxes for destination 'ABC'
    # To force a relocation, we'll make sure some boxes end up in Z=2
    # Our SimpleAlgorithm fills Z=1 first, then Z=2 for the same X.
    # So if we have 12 boxes, and each X has 2 Z slots, we'll use 6 X-positions.
    
    # SRC0001 (7) + DEST_ABC (8) + 00001 (5)
    test_boxes = [f"SRC0001DEST_ABC{i:05d}" for i in range(1, 13)]
    
    sim.run_step_by_step(test_boxes)
    sim.print_metrics()

if __name__ == "__main__":
    walkthrough()
