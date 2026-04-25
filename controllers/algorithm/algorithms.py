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

class ColumnGroupingAlgorithm(BaseAlgorithm):
    """
    Optimizes retrieval by dedicating entire columns (same Aisle, Side, X across all Y levels)
    to a single destination. This maximizes parallel retrieval across shuttles and ensures
    Z-depth penalties are avoided by sorting the retrieval plan.
    """
    def __init__(self):
        # destination -> list of assigned columns: (aisle, side, x)
        self.dest_columns = {}

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        if dest not in self.dest_columns:
            self.dest_columns[dest] = []

        # Try to find an empty slot in the assigned columns
        for col in self.dest_columns[dest]:
            aisle, side, x = col
            for y in range(1, warehouse.num_y + 1):
                # Must fill Z=1 before Z=2
                if warehouse.is_slot_empty(aisle, side, x, y, 1):
                    return (aisle, side, x, y, 1)
                elif warehouse.is_slot_empty(aisle, side, x, y, 2):
                    return (aisle, side, x, y, 2)

        # Need a new column
        new_col = None
        for x in range(1, warehouse.num_x + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for side in range(1, warehouse.num_sides + 1):
                    is_empty = True
                    for y in range(1, warehouse.num_y + 1):
                        if not warehouse.is_slot_empty(aisle, side, x, y, 1) or not warehouse.is_slot_empty(aisle, side, x, y, 2):
                            is_empty = False
                            break
                    if not is_empty:
                        continue
                    
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

        # Fallback: simple algorithm behavior if no empty columns exist
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

    def get_retrieval_plan(self, warehouse):
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        for dest, items in dest_groups.items():
            if len(items) >= 12:
                # Sort primarily by Z (ascending) to guarantee Z=1 is picked before Z=2
                # Sort secondarily by X (ascending) to clear columns closest to the door first
                items.sort(key=lambda x: (x[0][4], x[0][2]))
                return [item[1] for item in items[:12]]
        return None


class VelocityColumnAlgorithm(ColumnGroupingAlgorithm):
    """
    Dynamically learns destination frequency from the box stream.
    Fast destinations get columns from X=1, slow ones from X=60.
    Inherits retrieval logic from ColumnGroupingAlgorithm.
    """
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
    """
    Applies dynamic ABC slotting (front vs back allocation) to the naive SimpleBaseline strategy.
    Fast destinations search for the first empty slot starting from X=1.
    Slow destinations search for the first empty slot starting from X=60 down to X=1.
    Inherits retrieval logic directly from SimpleAlgorithm.
    """
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

class DestinationZoneAlgorithm(BaseAlgorithm):
    """
    Zone-based storage algorithm.

    STORAGE: assigns each destination a dedicated X-band of slots.
    With 5 destinations and X=1..60, each destination owns 12 consecutive X positions.
    When a box arrives, it goes to the first free slot inside its destination's zone.
    Result: all 12 boxes of a pallet are within a 12-unit X range -> minimal retrieval travel.
    """
    ZONE_WIDTH = 12  # X slots per destination

    def __init__(self):
        self._dest_zones = {}   # destination -> (x_start, x_end) inclusive
        self._next_zone_start = 1

    def _get_or_assign_zone(self, dest, warehouse):
        if dest not in self._dest_zones:
            x_start = self._next_zone_start
            x_end   = min(x_start + self.ZONE_WIDTH - 1, warehouse.num_x)
            self._dest_zones[dest] = (x_start, x_end)
            self._next_zone_start  = x_end + 1
            if self._next_zone_start > warehouse.num_x:
                self._next_zone_start = 1
        return self._dest_zones[dest]

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        x_start, x_end = self._get_or_assign_zone(dest, warehouse)

        for x in range(x_start, x_end + 1):
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        for z in range(1, warehouse.num_z + 1):
                            if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                continue
                            if warehouse.is_slot_empty(aisle, side, x, y, z):
                                return (aisle, side, x, y, z)

        for x in range(1, warehouse.num_x + 1):
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        for z in range(1, warehouse.num_z + 1):
                            if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                continue
                            if warehouse.is_slot_empty(aisle, side, x, y, z):
                                return (aisle, side, x, y, z)
        return None

    def get_retrieval_plan(self, warehouse):
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        best_codes = None
        best_avg_x = float('inf')

        for dest, items in dest_groups.items():
            if len(items) >= 12:
                sample = items[:12]
                avg_x = sum(coords[2] for coords, _ in sample) / 12
                if avg_x < best_avg_x:
                    best_avg_x = avg_x
                    sample_ordered = sorted(sample, key=lambda t: abs(t[0][2] - warehouse.shuttles_x[t[0][3]]))
                    best_codes = [code for _, code in sample_ordered]

        return best_codes

class MaturityFirstAlgorithm(BaseAlgorithm):
    """
    Maturity-score storage algorithm.

    STORAGE: calculates how close each destination is to forming a pallet (12 boxes).
    - Destinations with >= 8 boxes (>=67% full) are 'mature': store at lowest X, Z=1.
    - Destinations with < 8 boxes are 'immature': store further back (higher X).
    """
    MATURITY_THRESHOLD = 8

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')

        dest_counts = {}
        for bd in warehouse.grid.values():
            d = bd.get('destination')
            dest_counts[d] = dest_counts.get(d, 0) + 1

        count = dest_counts.get(dest, 0)
        is_mature = count >= self.MATURITY_THRESHOLD

        if is_mature:
            for x in range(1, warehouse.num_x + 1):
                for y in range(1, warehouse.num_y + 1):
                    for aisle in range(1, warehouse.num_aisles + 1):
                        for side in range(1, warehouse.num_sides + 1):
                            for z in range(1, warehouse.num_z + 1):
                                if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                    continue
                                if warehouse.is_slot_empty(aisle, side, x, y, z):
                                    return (aisle, side, x, y, z)
        else:
            mid_x = max(1, warehouse.num_x // 2)
            for x in range(mid_x, warehouse.num_x + 1):
                for y in range(1, warehouse.num_y + 1):
                    for aisle in range(1, warehouse.num_aisles + 1):
                        for side in range(1, warehouse.num_sides + 1):
                            for z in range(1, warehouse.num_z + 1):
                                if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                    continue
                                if warehouse.is_slot_empty(aisle, side, x, y, z):
                                    return (aisle, side, x, y, z)
            for x in range(1, warehouse.num_x + 1):
                for y in range(1, warehouse.num_y + 1):
                    for aisle in range(1, warehouse.num_aisles + 1):
                        for side in range(1, warehouse.num_sides + 1):
                            for z in range(1, warehouse.num_z + 1):
                                if z == 2 and warehouse.is_slot_empty(aisle, side, x, y, 1):
                                    continue
                                if warehouse.is_slot_empty(aisle, side, x, y, z):
                                    return (aisle, side, x, y, z)
        return None

    def get_retrieval_plan(self, warehouse):
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        best_codes = None
        best_score = (-1, float('inf'))  # (count desc, avg_x asc)

        for dest, items in dest_groups.items():
            if len(items) >= 12:
                items_sorted = sorted(items, key=lambda t: t[0][2])
                sample = items_sorted[:12]
                count  = len(items)
                avg_x  = sum(coords[2] for coords, _ in sample) / 12
                score  = (-count, avg_x)
                if score < best_score:
                    best_score = score
                    sample_ordered = sorted(sample, key=lambda t: abs(t[0][2] - warehouse.shuttles_x[t[0][3]]))
                    best_codes = [code for _, code in sample_ordered]

        return best_codes
