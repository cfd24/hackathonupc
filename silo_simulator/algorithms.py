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
                                return (aisle, side, x, y, z)
        return None # No space

    def get_retrieval_plan(self, warehouse):
        # Group boxes by destination
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append(coords)
        
        # Find destinations with 12+ boxes
        for dest, coords_list in dest_groups.items():
            if len(coords_list) >= 12:
                # Return the first 12 boxes
                return coords_list[:12]
        
        return None
