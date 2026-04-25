class BaseAlgorithm:
    def get_storage_location(self, box_data, warehouse):
        raise NotImplementedError

    def get_retrieval_plan(self, warehouse):
        """Returns a list of boxes to retrieve (12 boxes for a pallet)."""
        raise NotImplementedError

class SimpleAlgorithm(BaseAlgorithm):
    def __init__(self):
        self.active_pallets = {} # destination -> count

    def get_storage_location(self, box_data, warehouse):
        # Simple strategy: Find the first empty slot starting from nearest X
        for x in range(1, warehouse.num_x + 1):
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        for z in range(1, warehouse.num_z + 1):
                            if warehouse.is_slot_empty(aisle, side, x, y, z):
                                # Respect Z=1 before Z=2
                                if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                    continue
                                return (aisle, side, x, y, z)
        return None # No space

    def get_retrieval_plan(self, warehouse):
        # Group boxes by destination
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append(box_data['code'])
        
        # Find destinations with 12+ boxes
        for dest, code_list in dest_groups.items():
            if len(code_list) >= 12:
                # Return the first 12 box codes
                return code_list[:12]
        
        return None

class DistanceGreedyAlgorithm(BaseAlgorithm):
    """
    Optimizes storage by finding the empty slot that is physically
    closest to any shuttle's current X position, minimizing travel time.
    """
    def get_storage_location(self, box_data, warehouse):
        best_pos = None
        best_cost = float('inf')
        
        # Check each Y level to find the closest available X slot to its shuttle
        for y in range(1, warehouse.num_y + 1):
            shuttle_x = warehouse.shuttles_x[y]
            
            found_in_y = False
            # Search outwards from the shuttle's current X position
            for distance in range(warehouse.num_x):
                for direction in (1, -1):
                    if distance == 0 and direction == -1:
                        continue
                        
                    x = shuttle_x + (distance * direction)
                    
                    if 1 <= x <= warehouse.num_x:
                        # Check all possible slots at this (x, y) coordinate
                        for aisle in range(1, warehouse.num_aisles + 1):
                            for side in range(1, warehouse.num_sides + 1):
                                for z in range(1, warehouse.num_z + 1):
                                    if warehouse.is_slot_empty(aisle, side, x, y, z):
                                        cost = distance
                                        if cost < best_cost:
                                            best_cost = cost
                                            best_pos = (aisle, side, x, y, z)
                                        found_in_y = True
                                        break
                                if found_in_y: break
                            if found_in_y: break
                    if found_in_y: break
                if found_in_y: break
                
        return best_pos

    def get_retrieval_plan(self, warehouse):
        # Group boxes by destination
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append(box_data['code'])
        
        # Return first destination with a full pallet
        for dest, coords_list in dest_groups.items():
            if len(coords_list) >= 12:
                return coords_list[:12]
        return None
