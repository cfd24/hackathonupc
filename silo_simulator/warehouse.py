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
        
        # Shuttles: 1 per Y level (1-8).
        # Each shuttle tracks its own current time and X position.
        self.shuttles_x = {y: 0 for y in range(1, self.num_y + 1)}
        self.shuttles_time = {y: 0.0 for y in range(1, self.num_y + 1)}
        
        # Global clock (the time when the last operation finished)
        self.global_time = 0.0

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
        # For simplicity, we assume tasks arrive one after another at the input station.
        start_time = max(self.global_time, self.shuttles_time[y])
        completion_time = start_time + move_duration
        
        self.shuttles_x[y] = target_x
        self.shuttles_time[y] = completion_time
        
        # Update global time to the start of the NEXT task (serial arrival at input)
        # However, for throughput, we care about when the WHOLE thing finishes.
        return move_duration

    def is_slot_empty(self, aisle, side, x, y, z):
        return (aisle, side, x, y, z) not in self.grid

    def store_box(self, aisle, side, x, y, z, box_data):
        """Store a box and return the time taken for the shuttle movement."""
        if not self.is_slot_empty(aisle, side, x, y, z):
            raise ValueError(f"Slot ({aisle}, {side}, {x}, {y}, {z}) is already occupied.")
        
        time_taken = self.move_shuttle(y, x)
        self.grid[(aisle, side, x, y, z)] = box_data
        return time_taken

    def retrieve_box(self, aisle, side, x, y, z):
        """Retrieve a box and return (box_data, time_taken)."""
        if self.is_slot_empty(aisle, side, x, y, z):
            raise ValueError(f"Slot ({aisle}, {side}, {x}, {y}, {z}) is empty.")
        
        time_taken = self.move_shuttle(y, x)
        box_data = self.grid.pop((aisle, side, x, y, z))
        return box_data, time_taken

    def find_boxes_by_destination(self, destination):
        """Helper to find all boxes in the silo for a specific destination."""
        found = []
        for coords, box_data in self.grid.items():
            if box_data.get('destination') == destination:
                found.append(coords)
        return found
