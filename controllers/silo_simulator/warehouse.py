class Warehouse:
    def __init__(self):
        # Dimensions
        self.num_aisles = 4
        self.num_sides = 2
        self.num_x = 60
        self.num_y = 8
        self.num_z = 2
        
        # Grid state: (aisle, side, x, y, z) -> box_data
        self.grid = {}
        # Reverse lookup: box_code -> (aisle, side, x, y, z)
        self.box_positions = {}
        
        # Shuttles: 1 per Y level (1-8).
        # Each shuttle tracks its own current time and X position.
        self.shuttles_x = {y: 0 for y in range(1, self.num_y + 1)}
        self.shuttles_time = {y: 0.0 for y in range(1, self.num_y + 1)}
        
        # Global clock (the time when the last operation finished)
        self.global_time = 0.0
        self.relocations = 0

    def get_shuttle_move_time(self, y, target_x):
        """Calculate time to move shuttle at level Y to target X."""
        current_x = self.shuttles_x[y]
        distance = abs(target_x - current_x)
        # Formula: t = 10 + distance
        return 10 + distance

    def move_shuttle(self, y, target_x):
        """Move shuttle and return the completion time of this move."""
        move_duration = self.get_shuttle_move_time(y, target_x)
        
        # The shuttle can start moving either when it's free OR when the global task arrives.
        start_time = max(self.global_time, self.shuttles_time[y])
        completion_time = start_time + move_duration
        
        self.shuttles_x[y] = target_x
        self.shuttles_time[y] = completion_time

        return move_duration

    def is_slot_empty(self, aisle, side, x, y, z):
        return (aisle, side, x, y, z) not in self.grid

    def store_box(self, aisle, side, x, y, z, box_data, check_z=True):
        """Store a box respecting Z constraint: Z=1 must be occupied before Z=2."""
        if not self.is_slot_empty(aisle, side, x, y, z):
            raise ValueError(f"Slot ({aisle}, {side}, {x}, {y}, {z}) is already occupied.")
        
        if check_z and z == 2:
            if self.is_slot_empty(aisle, side, x, y, 1):
                raise ValueError(f"Cannot store in Z=2 if Z=1 is empty at ({aisle}, {side}, {x}, {y}).")
        
        # Storage is: shuttle moves to slot (assuming it picked up box at X=0)
        time_taken = self.move_shuttle(y, x)
        self.grid[(aisle, side, x, y, z)] = box_data
        self.box_positions[box_data['code']] = (aisle, side, x, y, z)
        return time_taken

    def find_free_slot_in_aisle_at_level(self, aisle, y, exclude_x=None):
        for side in range(1, self.num_sides + 1):
            for x in range(1, self.num_x + 1):
                if x == exclude_x:
                    continue
                if self.is_slot_empty(aisle, side, x, y, 1):
                    return (aisle, side, x, y, 1)
                elif self.is_slot_empty(aisle, side, x, y, 2):
                    return (aisle, side, x, y, 2)
        return None

    def find_any_free_slot(self):
        for aisle in range(1, self.num_aisles + 1):
            for y in range(1, self.num_y + 1):
                res = self.find_free_slot_in_aisle_at_level(aisle, y)
                if res:
                    return res
        return None

    def retrieve_box(self, aisle, side, x, y, z, active_destinations=None):
        """Retrieve a box, handling relocation if Z=2 is blocked by Z=1."""
        if self.is_slot_empty(aisle, side, x, y, z):
            raise ValueError(f"Slot ({aisle}, {side}, {x}, {y}, {z}) is empty.")
        
        total_time_taken = 0
        extra_retrieved = []
        active_destinations = active_destinations or set()
        
        # Z-constraint: If retrieving Z=2, and Z=1 is occupied, must relocate Z=1
        if z == 2 and not self.is_slot_empty(aisle, side, x, y, 1):
            self.relocations += 1
            # 1. Pick up Z=1 box
            total_time_taken += self.move_shuttle(y, x)
            z1_box = self.grid.pop((aisle, side, x, y, 1))
            self.box_positions.pop(z1_box['code'])
            
            relocated = False
            
            # PRIORITY 1: Deliver to active pallet if destination matches
            if z1_box.get('destination') in active_destinations:
                print(f"ACTIVE PALLET RELOCATION: box {z1_box['code']} delivered to X=0 as side-effect.")
                total_time_taken += self.move_shuttle(y, 0)
                extra_retrieved.append(z1_box)
                relocated = True
            
            # PRIORITY 2: Move to free slot in same aisle and same Y level
            if not relocated:
                new_pos = self.find_free_slot_in_aisle_at_level(aisle, y, exclude_x=x)
                if new_pos:
                    # print(f"SAME AISLE RELOCATION: box {z1_box['code']} moved to {new_pos}")
                    total_time_taken += self.move_shuttle(y, new_pos[2])
                    self.grid[new_pos] = z1_box
                    self.box_positions[z1_box['code']] = new_pos
                    relocated = True
            
            # PRIORITY 3: Search for any free slot in the entire warehouse (last resort)
            if not relocated:
                any_pos = self.find_any_free_slot()
                if any_pos:
                    print(f"CROSS-AISLE RELOCATION: box {z1_box['code']} moved from aisle {aisle} to aisle {any_pos[0]} — verify if legal")
                    total_time_taken += self.move_shuttle(y, 0) # to exit
                    total_time_taken += 10 # heuristic for cross-aisle
                    self.grid[any_pos] = z1_box
                    self.box_positions[z1_box['code']] = any_pos
                    relocated = True
            
            # PRIORITY 4: Full warehouse
            if not relocated:
                print(f"WARNING: No relocation space found, skipping box {z1_box['code']}")
                self.grid[(aisle, side, x, y, 1)] = z1_box
                self.box_positions[z1_box['code']] = (aisle, side, x, y, 1)
                # If we couldn't relocate Z=1, we can't get Z=2.
                return None, total_time_taken, []

            # 4. Return to original X to pick up the Z=2 box
            total_time_taken += self.move_shuttle(y, x)
        else:
            # Normal retrieval
            total_time_taken += self.move_shuttle(y, x)

        # Pick up the target box
        target_box = self.grid.pop((aisle, side, x, y, z))
        self.box_positions.pop(target_box['code'])
        
        # Finally, shuttle must return to X=0 to deliver the box
        total_time_taken += self.move_shuttle(y, 0)
        
        return target_box, total_time_taken, extra_retrieved

    def find_boxes_by_destination(self, destination):
        found = []
        for coords, box_data in self.grid.items():
            if box_data.get('destination') == destination:
                found.append(coords)
        return found
