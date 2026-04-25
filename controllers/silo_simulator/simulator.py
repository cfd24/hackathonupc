import time
from controllers.warehouse import Warehouse
from controllers.algorithms import SimpleAlgorithm

class Simulator:
    def __init__(self, algorithm):
        self.warehouse = Warehouse()
        self.algorithm = algorithm
        self.total_time = 0
        self.boxes_processed = 0
        self.pallets_completed = 0
        self.active_pallets_count = 0
        self.max_active_pallets = 8

    def parse_box_code(self, code):
        """Parse 20-digit box code: SSSSSSSDDDDDDDDBBBBB"""
        if len(code) != 20:
            # Handle potential whitespace if any
            code = code.replace(" ", "")
        
        if len(code) != 20:
            raise ValueError(f"Invalid box code length: {len(code)}")
            
        source = code[0:7]
        destination = code[7:15]
        bulk = code[15:20]
        
        return {
            'source': source,
            'destination': destination,
            'bulk': bulk,
            'code': code
        }

    def run(self, box_codes):
        print(f"Starting simulation with {len(box_codes)} boxes...")
        
        # Process input stream
        for code in box_codes:
            box_data = self.parse_box_code(code)
            
            # 1. Storage
            location = self.algorithm.get_storage_location(box_data, self.warehouse)
            if location:
                time_taken = self.warehouse.store_box(*location, box_data)
                self.total_time += time_taken
                self.boxes_processed += 1
                # print(f"Stored box {code} at {location} in {time_taken}s")
            else:
                print(f"FAILED to store box {code}: Warehouse full!")
                continue

            # 2. Check for retrieval (can we form a pallet?)
            # The algorithm decides when to retrieve. 
            # constraint: Max 8 active pallets at once.
            if self.active_pallets_count < self.max_active_pallets:
                retrieval_plan = self.algorithm.get_retrieval_plan(self.warehouse)
                if retrieval_plan:
                    self.active_pallets_count += 1
                    # print(f"Retrieving pallet ({len(retrieval_plan)} boxes)...")
                    for coords in retrieval_plan:
                        _, time_taken = self.warehouse.retrieve_box(*coords)
                        self.total_time += time_taken
                    
                    self.pallets_completed += 1
                    self.active_pallets_count -= 1 # Completed
                    # print(f"Pallet completed! Total time: {self.total_time}s")

        # 3. Finalize total time
        self.total_time = max(self.warehouse.shuttles_time.values())
        self.print_metrics()

    def print_metrics(self):
        hours = self.total_time / 3600
        throughput = self.boxes_processed / hours if hours > 0 else 0
        pallet_completion_pct = (self.pallets_completed * 12 / self.boxes_processed * 100) if self.boxes_processed > 0 else 0
        
        print("\n=== Simulation Metrics ===")
        print(f"Total Time: {self.total_time:.2f} seconds ({self.total_time/60:.2f} minutes)")
        print(f"Boxes Processed: {self.boxes_processed}")
        print(f"Pallets Completed: {self.pallets_completed}")
        print(f"Throughput: {throughput:.2f} boxes/hour")
        print(f"Full Pallets %: {pallet_completion_pct:.2f}%")
        print("==========================\n")

if __name__ == "__main__":
    # Generate some dummy data for testing
    # 24 boxes for 2 destinations (12 each)
    test_boxes = []
    for d in ["11111111", "22222222"]:
        for i in range(12):
            test_boxes.append(f"0000000{d}{i:05d}")
    
    sim = Simulator(SimpleAlgorithm())
    sim.run(test_boxes)
