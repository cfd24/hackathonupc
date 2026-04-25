import re

with open('controllers/algorithm/algorithms.py', 'r', encoding='utf-8') as f:
    algo_content = f.read()

my_classes = """
class VelocityColumnAlgorithm(ColumnGroupingAlgorithm):
    \"\"\"
    Dynamically learns destination frequency from the box stream.
    Fast destinations get columns from X=1, slow ones from X=60.
    Inherits retrieval logic from ColumnGroupingAlgorithm.
    \"\"\"
    def __init__(self):
        super().__init__()
        self.dest_counts = {}
        self.total_boxes = 0

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        
        self.dest_counts[dest] = self.dest_counts.get(dest, 0) + 1
        self.total_boxes += 1
        
        if dest not in self.dest_columns:
            self.dest_columns[dest] = []

        for col in self.dest_columns[dest]:
            aisle, side, x = col
            for y in range(1, warehouse.num_y + 1):
                if warehouse.is_slot_empty(aisle, side, x, y, 1):
                    return (aisle, side, x, y, 1)
                elif warehouse.is_slot_empty(aisle, side, x, y, 2):
                    return (aisle, side, x, y, 2)

        num_dests = len(self.dest_counts)
        threshold = 1.0 / num_dests if num_dests > 0 else 0
        ratio = self.dest_counts[dest] / self.total_boxes
        
        is_fast = (ratio >= threshold)
        x_range = range(1, warehouse.num_x + 1) if is_fast else range(warehouse.num_x, 0, -1)
        
        new_col = None
        for x in x_range:
            for aisle in range(1, warehouse.num_aisles + 1):
                for side in range(1, warehouse.num_sides + 1):
                    is_empty = True
                    for y in range(1, warehouse.num_y + 1):
                        if not warehouse.is_slot_empty(aisle, side, x, y, 1) or not warehouse.is_slot_empty(aisle, side, x, y, 2):
                            is_empty = False
                            break
                    if not is_empty: continue
                    is_assigned = False
                    for cols in self.dest_columns.values():
                        if (aisle, side, x) in cols:
                            is_assigned = True
                            break
                    if not is_assigned:
                        new_col = (aisle, side, x)
                        break
                if new_col: break
            if new_col: break

        if new_col:
            self.dest_columns[dest].append(new_col)
            aisle, side, x = new_col
            return (aisle, side, x, 1, 1)

        for x in range(1, warehouse.num_x + 1):
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        for z in (1, 2):
                            if warehouse.is_slot_empty(aisle, side, x, y, z):
                                if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                    continue
                                return (aisle, side, x, y, z)
        return None

class VelocitySimpleAlgorithm(SimpleAlgorithm):
    \"\"\"
    Applies dynamic ABC slotting (front vs back allocation) to the naive SimpleBaseline strategy.
    Fast destinations search for the first empty slot starting from X=1.
    Slow destinations search for the first empty slot starting from X=60 down to X=1.
    Inherits retrieval logic directly from SimpleAlgorithm.
    \"\"\"
    def __init__(self):
        super().__init__()
        self.dest_counts = {}
        self.total_boxes = 0

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        self.dest_counts[dest] = self.dest_counts.get(dest, 0) + 1
        self.total_boxes += 1
        
        num_dests = len(self.dest_counts)
        threshold = 1.0 / num_dests if num_dests > 0 else 0
        ratio = self.dest_counts[dest] / self.total_boxes
        
        is_fast = (ratio >= threshold)
        x_range = range(1, warehouse.num_x + 1) if is_fast else range(warehouse.num_x, 0, -1)
        
        for x in x_range:
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        for z in range(1, warehouse.num_z + 1):
                            if warehouse.is_slot_empty(aisle, side, x, y, z):
                                if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                    continue
                                return (aisle, side, x, y, z)
        return None
"""

their_match = re.search(r'=======\n(.*?)>>>>>>> [0-9a-f]+', algo_content, re.DOTALL)
their_classes = their_match.group(1) if their_match else ""

algo_content = re.sub(r'<<<<<<< HEAD.*?>>>>>>> [0-9a-f]+\n?', my_classes + '\n' + their_classes, algo_content, flags=re.DOTALL)

with open('controllers/algorithm/algorithms.py', 'w', encoding='utf-8') as f:
    f.write(algo_content)


with open('main/main.py', 'r', encoding='utf-8') as f:
    main_content = f.read()

# Fix import
main_content = re.sub(r'<<<<<<< HEAD\nfrom controllers\.algorithm\.algorithms import .*?\n=======\nfrom controllers\.algorithm\.algorithms import .*?\n>>>>>>> [0-9a-f]+\n?', 'from controllers.algorithm.algorithms import SimpleAlgorithm, DistanceGreedyAlgorithm, ColumnGroupingAlgorithm, VelocityColumnAlgorithm, VelocitySimpleAlgorithm, DestinationZoneAlgorithm, MaturityFirstAlgorithm\n', main_content)

# Fix algorithm list
algo_list = '''    ("Velocity Column", VelocityColumnAlgorithm),
    ("Velocity Simple", VelocitySimpleAlgorithm),
    ("Destination Zones", DestinationZoneAlgorithm),
    ("Maturity First", MaturityFirstAlgorithm),'''
main_content = re.sub(r'<<<<<<< HEAD\n    \("Velocity Column".*?>>>>>>> [0-9a-f]+\n?', algo_list + '\n', main_content, flags=re.DOTALL)

# Fix results.append loop
results_block = '''            # 1. Prefill the warehouse
            if cap_pct > 0:
                for code in prefill_streams[cap_pct]:
                    box_data = sim.parse_box_code(code)
                    location = algo.get_storage_location(box_data, sim.warehouse)
                    if location:
                        sim.warehouse.store_box(*location, box_data, check_z=False)
                
                # Reset simulation clocks & metrics so benchmark is isolated
                sim.warehouse.global_time = 0.0
                sim.warehouse.relocations = 0
                for y in range(1, sim.warehouse.num_y + 1):
                    sim.warehouse.shuttles_time[y] = 0.0
                    sim.warehouse.shuttles_x[y] = 0
            
            start_real_time = time.time()
            
            # We suppress the simulator's noisy print metrics to keep the sandbox clean
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
                print(f"  -> {cap_pct:2d}% Cap CRASHED: {error}")
                continue
                
            hours = sim.total_time / 3600
            throughput = sim.boxes_processed / hours if hours > 0 else 0
            pallet_pct = (sim.sent_pallets * 12 / sim.boxes_processed * 100) if sim.boxes_processed > 0 else 0
            
            results.append({
                "name": algo_name,
                "cap_pct": cap_pct,
                "sim_time": sim.total_time,
                "processed": sim.boxes_processed,
                "pallets": sim.sent_pallets,
                "throughput": throughput,
                "pallet_pct": pallet_pct,
                "relocations": sim.warehouse.relocations,
                "real_duration": real_duration
            })
            print(f"  -> {cap_pct:2d}% Cap Completed successfully.")'''
main_content = re.sub(r'<<<<<<< HEAD\n            # 1\. Prefill the warehouse.*?>>>>>>> [0-9a-f]+\n?', results_block + '\n', main_content, flags=re.DOTALL)

# Fix header
header_block = '''    header = f"{'Algorithm':<20} | {'Cap %':<5} | {'Sim Time (s)':<12} | {'Processed':<9} | {'Pallets':<7} | {'Throughput/h':<12} | {'Z-Blocks':<9} | {'Real Time':<10}"
    print(header)
    print("-" * len(header))
    
    for r in results:
        print(f"{r['name']:<20} | {r['cap_pct']:>3}%  | {r['sim_time']:<12.1f} | {r['processed']:<9} | {r['pallets']:<7} | {r['throughput']:<12.1f} | {r['relocations']:<9} | {r['real_duration']:<8.2f}s")'''
main_content = re.sub(r'<<<<<<< HEAD\n    header = f"\{\'Algorithm.*?>>>>>>> [0-9a-f]+\n?', header_block + '\n', main_content, flags=re.DOTALL)

with open('main/main.py', 'w', encoding='utf-8') as f:
    f.write(main_content)
