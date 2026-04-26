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

class ZSafeSimpleAlgorithm(BaseAlgorithm):
    """
    Improved SimpleBaseline that enforces Z-depth destination compatibility.

    STORAGE: sequential scan like SimpleAlgorithm, but when considering Z=2,
    it checks that the box already at Z=1 belongs to the SAME destination.
    If destinations differ, the slot is skipped entirely. This guarantees
    that no relocation is ever needed during retrieval.

    RETRIEVAL: groups boxes by destination, sorts by Z ascending (Z=1 first)
    then by X ascending, so the blocking box is always extracted first.
    """
    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')

        for x in range(1, warehouse.num_x + 1):
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        # Try Z=1 first
                        if warehouse.is_slot_empty(aisle, side, x, y, 1):
                            return (aisle, side, x, y, 1)

                        # Try Z=2 only if Z=1 is occupied by the SAME destination
                        if warehouse.is_slot_empty(aisle, side, x, y, 2):
                            z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                            if z1_box and z1_box.get('destination') == dest:
                                return (aisle, side, x, y, 2)
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
                # Sort by Z ascending (extract Z=1 before Z=2), then by X
                items.sort(key=lambda t: (t[0][4], t[0][2]))
                return [item[1] for item in items[:12]]
        return None

class ZSafeProAlgorithm(BaseAlgorithm):
    """
    Optimized Z-Safe that keeps ZSafeSimple's proven storage strategy
    but upgrades the retrieval plan.

    STORAGE: identical to ZSafeSimple — sequential scan from X=1, takes Z=1
    first, only uses Z=2 if Z=1 has the same destination. This keeps boxes
    packed near the door for minimum shuttle travel.

    RETRIEVAL (3 improvements over ZSafeSimple):
      1. Pick the destination with 12+ boxes whose average X is LOWEST
         (closest to door = fastest shuttle travel).
      2. Among those 12 boxes, prefer complete Z=1+Z=2 pairs from the
         same slot to avoid leaving orphaned Z=2 boxes behind.
      3. Sort final selection by Z ascending, then X ascending.
    """
    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')

        for x in range(1, warehouse.num_x + 1):
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        # Try Z=1 first
                        if warehouse.is_slot_empty(aisle, side, x, y, 1):
                            return (aisle, side, x, y, 1)

                        # Try Z=2 only if Z=1 is occupied by the SAME destination
                        if warehouse.is_slot_empty(aisle, side, x, y, 2):
                            z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                            if z1_box and z1_box.get('destination') == dest:
                                return (aisle, side, x, y, 2)
        return None

    def get_retrieval_plan(self, warehouse):
        # Group all boxes by destination, keeping coordinates
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        # Find destination with 12+ boxes and lowest average X
        best_dest = None
        best_avg_x = float('inf')
        for dest, items in dest_groups.items():
            if len(items) >= 12:
                avg_x = sum(c[2] for c, _ in items) / len(items)
                if avg_x < best_avg_x:
                    best_avg_x = avg_x
                    best_dest = dest

        if best_dest is None:
            return None

        items = dest_groups[best_dest]

        # Build pair-aware selection: prefer taking both Z=1 and Z=2 from same slot
        # Group items by their (aisle, side, x, y) position
        slot_groups = {}
        for coords, code in items:
            slot_key = (coords[0], coords[1], coords[2], coords[3])  # aisle, side, x, y
            if slot_key not in slot_groups:
                slot_groups[slot_key] = []
            slot_groups[slot_key].append((coords, code))

        # Sort slots by X ascending (closest to door first)
        sorted_slots = sorted(slot_groups.items(), key=lambda s: s[0][2])

        # Pick boxes prioritizing complete pairs (slots with 2 boxes first)
        selected = []
        # First: slots with Z-pairs (both Z=1 and Z=2)
        for slot_key, slot_items in sorted_slots:
            if len(selected) >= 12:
                break
            if len(slot_items) == 2:
                slot_items.sort(key=lambda t: t[0][4])  # Z=1 first
                for item in slot_items:
                    if len(selected) < 12:
                        selected.append(item)

        # Then: remaining single boxes
        for slot_key, slot_items in sorted_slots:
            if len(selected) >= 12:
                break
            if len(slot_items) == 1:
                selected.append(slot_items[0])

        # Final sort: Z ascending then X ascending
        selected.sort(key=lambda t: (t[0][4], t[0][2]))
        return [code for _, code in selected[:12]]

class ZSafeWeightedAlgorithm(ZSafeSimpleAlgorithm):
    """
    Learns observed destination frequency and stores frequent destinations near X=1.

    Frequency is inferred online from boxes seen so far. Less frequent
    destinations get a small tunable backoff from the front instead of being
    spread across the full warehouse width.
    """
    def __init__(self, max_weighted_backoff=1):
        super().__init__()
        self.dest_counts = {}
        self.total_boxes = 0
        self.max_weighted_backoff = max_weighted_backoff

    def _warehouse_fullness(self, warehouse):
        total_capacity = (
            warehouse.num_aisles
            * warehouse.num_sides
            * warehouse.num_x
            * warehouse.num_y
            * warehouse.num_z
        )
        return len(warehouse.grid) / total_capacity if total_capacity else 0

    def _target_x_for_destination(self, dest, warehouse):
        if self.total_boxes == 0 or len(self.dest_counts) <= 1:
            return 1

        frequencies = [
            count / self.total_boxes
            for count in self.dest_counts.values()
        ]
        min_frequency = min(frequencies)
        max_frequency = max(frequencies)
        if min_frequency == max_frequency:
            return 1

        frequency = self.dest_counts[dest] / self.total_boxes
        rarity = (max_frequency - frequency) / (max_frequency - min_frequency)
        fullness = self._warehouse_fullness(warehouse)
        effective_backoff = self.max_weighted_backoff * (0.25 + 0.75 * fullness)
        backoff = round(rarity * effective_backoff)

        return min(warehouse.num_x, 1 + backoff)

    def _x_positions_by_distance(self, target_x, warehouse):
        return sorted(
            range(1, warehouse.num_x + 1),
            key=lambda x: (abs(x - target_x), x)
        )

    def _find_matching_z2_slot(self, dest, warehouse, x_range):
        for x in x_range:
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        if warehouse.is_slot_empty(aisle, side, x, y, 2):
                            z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                            if z1_box and z1_box.get('destination') == dest:
                                return (aisle, side, x, y, 2)
        return None

    def _find_zsafe_slot(self, dest, warehouse, x_range):
        for x in x_range:
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        if warehouse.is_slot_empty(aisle, side, x, y, 1):
                            return (aisle, side, x, y, 1)
                        if warehouse.is_slot_empty(aisle, side, x, y, 2):
                            z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                            if z1_box and z1_box.get('destination') == dest:
                                return (aisle, side, x, y, 2)
        return None

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        self.dest_counts[dest] = self.dest_counts.get(dest, 0) + 1
        self.total_boxes += 1

        if self.max_weighted_backoff <= 0:
            return super().get_storage_location(box_data, warehouse)

        target_x = self._target_x_for_destination(dest, warehouse)

        front_window_end = min(
            warehouse.num_x,
            target_x + self.max_weighted_backoff
        )
        front_window = range(1, front_window_end + 1)

        matching_stack = self._find_matching_z2_slot(dest, warehouse, front_window)
        if matching_stack:
            return matching_stack

        weighted_range = range(target_x, warehouse.num_x + 1)
        weighted_slot = self._find_zsafe_slot(dest, warehouse, weighted_range)
        if weighted_slot:
            return weighted_slot

        fallback_range = range(1, target_x)
        return self._find_zsafe_slot(dest, warehouse, fallback_range)

class ZSafeWeightedYSafeAlgorithm(ZSafeWeightedAlgorithm):
    """
    ZSafeWeightedAlgorithm plus same-destination Y/aisle separation.

    Same-destination boxes may stack in a Z-safe lane. New Z=1 lanes are only
    opened while that destination remains below the configured lane count for
    the same aisle and Y.
    """
    def __init__(self, max_weighted_backoff=1, max_pairs_per_aisle_height=2):
        super().__init__(max_weighted_backoff=max_weighted_backoff)
        self.max_pairs_per_aisle_height = max_pairs_per_aisle_height

    def _destination_aisle_height_count(self, dest, warehouse, aisle, y):
        count_map = getattr(self, "_ysafe_pair_counts", None)
        if count_map is not None:
            return count_map.get((aisle, y), 0)

        return sum(
            1
            for coords, box_data in warehouse.grid.items()
            if coords[0] == aisle
            and coords[3] == y
            and coords[4] == 1
            and box_data.get('destination') == dest
        )

    def _build_aisle_height_counts(self, dest, warehouse):
        counts = {}
        for coords, box_data in warehouse.grid.items():
            if coords[4] != 1 or box_data.get('destination') != dest:
                continue

            key = (coords[0], coords[3])
            counts[key] = counts.get(key, 0) + 1
        return counts

    def _find_zsafe_slot(self, dest, warehouse, x_range):
        for x in x_range:
            for y in range(1, warehouse.num_y + 1):
                for aisle in range(1, warehouse.num_aisles + 1):
                    for side in range(1, warehouse.num_sides + 1):
                        if warehouse.is_slot_empty(aisle, side, x, y, 1):
                            pair_count = self._destination_aisle_height_count(dest, warehouse, aisle, y)
                            if pair_count < self.max_pairs_per_aisle_height:
                                return (aisle, side, x, y, 1)
                            continue

                        if warehouse.is_slot_empty(aisle, side, x, y, 2):
                            z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                            if z1_box and z1_box.get('destination') == dest:
                                return (aisle, side, x, y, 2)
        return None

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        self.dest_counts[dest] = self.dest_counts.get(dest, 0) + 1
        self.total_boxes += 1

        self._ysafe_pair_counts = self._build_aisle_height_counts(dest, warehouse)
        try:
            target_x = 1
            if self.max_weighted_backoff > 0:
                target_x = self._target_x_for_destination(dest, warehouse)

            front_window_end = min(
                warehouse.num_x,
                target_x + self.max_weighted_backoff
            )
            front_window = range(1, front_window_end + 1)

            matching_stack = self._find_matching_z2_slot(dest, warehouse, front_window)
            if matching_stack:
                return matching_stack

            weighted_range = range(target_x, warehouse.num_x + 1)
            weighted_slot = self._find_zsafe_slot(dest, warehouse, weighted_range)
            if weighted_slot:
                return weighted_slot

            fallback_range = range(1, target_x)
            return self._find_zsafe_slot(dest, warehouse, fallback_range)
        finally:
            self._ysafe_pair_counts = None

class ZSafeRWeightedYSafeAlgorithm(ZSafeWeightedYSafeAlgorithm):
    """
    Reordered Z-safe weighted Y-safe algorithm.

    Candidate slots are scanned by X, then side, then aisle, then Y to spread
    early placements across the front face before moving deeper into X.
    """
    def __init__(self, max_weighted_backoff=1, max_pairs_per_aisle_height=2, z2_start_x_ratio=0.6):
        super().__init__(
            max_weighted_backoff=max_weighted_backoff,
            max_pairs_per_aisle_height=max_pairs_per_aisle_height
        )
        self.z2_start_x_ratio = z2_start_x_ratio

    def get_storage_location(self, box_data, warehouse):
        dest = box_data.get('destination')
        self.dest_counts[dest] = self.dest_counts.get(dest, 0) + 1
        self.total_boxes += 1

        self._ysafe_pair_counts = self._build_aisle_height_counts(dest, warehouse)
        try:
            target_x = 1
            if self.max_weighted_backoff > 0:
                target_x = self._target_x_for_destination(dest, warehouse)

            weighted_range = range(target_x, warehouse.num_x + 1)
            weighted_slot = self._find_zsafe_slot(dest, warehouse, weighted_range)
            if weighted_slot:
                return weighted_slot

            fallback_range = range(1, target_x)
            return self._find_zsafe_slot(dest, warehouse, fallback_range)
        finally:
            self._ysafe_pair_counts = None

    def _z2_start_x(self, warehouse):
        ratio = max(0.0, min(1.0, self.z2_start_x_ratio))
        if ratio == 0:
            return 1
        return max(1, min(warehouse.num_x, int((ratio * warehouse.num_x) + 0.999999)))

    def _find_z1_slot_in_x(self, dest, warehouse, x):
        for side in range(1, warehouse.num_sides + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for y in range(1, warehouse.num_y + 1):
                    if not warehouse.is_slot_empty(aisle, side, x, y, 1):
                        continue

                    pair_count = self._destination_aisle_height_count(dest, warehouse, aisle, y)
                    if pair_count < self.max_pairs_per_aisle_height:
                        return (aisle, side, x, y, 1)
        return None

    def _find_matching_z2_slot_in_x(self, dest, warehouse, x):
        for side in range(1, warehouse.num_sides + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for y in range(1, warehouse.num_y + 1):
                    if not warehouse.is_slot_empty(aisle, side, x, y, 2):
                        continue

                    z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                    if z1_box and z1_box.get('destination') == dest:
                        return (aisle, side, x, y, 2)
        return None

    def _find_zsafe_slot(self, dest, warehouse, x_range):
        z2_start_x = self._z2_start_x(warehouse)

        for x in x_range:
            if x >= z2_start_x:
                z2_slot = self._find_matching_z2_slot_in_x(dest, warehouse, x)
                if z2_slot:
                    return z2_slot

            z1_slot = self._find_z1_slot_in_x(dest, warehouse, x)
            if z1_slot:
                return z1_slot
        return None

class ZSafeRWeightedYSafeVarianceAlgorithm(ZSafeRWeightedYSafeAlgorithm):
    """
    Original reordered weighted Y-safe algorithm with snapshot variance.

    Storage prioritizes Y-level carriers closer to X=1. Retrieval only exports
    a pallet when the best 12 same-destination boxes are sufficiently aligned
    with the current X positions of their Y-level shuttles.
    """
    def __init__(
        self,
        max_weighted_backoff=1,
        max_pairs_per_aisle_height=1,
        z2_start_x_ratio=0.6,
        max_avg_squared_wagon_distance=144,
    ):
        super().__init__(
            max_weighted_backoff=max_weighted_backoff,
            max_pairs_per_aisle_height=max_pairs_per_aisle_height,
            z2_start_x_ratio=z2_start_x_ratio,
        )
        self.max_avg_squared_wagon_distance = max_avg_squared_wagon_distance

    def _y_levels_by_carrier_priority(self, warehouse):
        return sorted(
            range(1, warehouse.num_y + 1),
            key=lambda y: (abs(warehouse.shuttles_x[y] - 1), y)
        )

    def _find_z1_slot_in_x(self, dest, warehouse, x):
        y_levels = self._y_levels_by_carrier_priority(warehouse)
        for side in range(1, warehouse.num_sides + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for y in y_levels:
                    if not warehouse.is_slot_empty(aisle, side, x, y, 1):
                        continue

                    pair_count = self._destination_aisle_height_count(dest, warehouse, aisle, y)
                    if pair_count < self.max_pairs_per_aisle_height:
                        return (aisle, side, x, y, 1)
        return None

    def _find_matching_z2_slot_in_x(self, dest, warehouse, x):
        y_levels = self._y_levels_by_carrier_priority(warehouse)
        for side in range(1, warehouse.num_sides + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for y in y_levels:
                    if not warehouse.is_slot_empty(aisle, side, x, y, 2):
                        continue

                    z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                    if z1_box and z1_box.get('destination') == dest:
                        return (aisle, side, x, y, 2)
        return None

    def _avg_squared_wagon_distance(self, items, warehouse):
        return sum(
            (coords[2] - warehouse.shuttles_x[coords[3]]) ** 2
            for coords, _ in items
        ) / len(items)

    def get_retrieval_plan(self, warehouse):
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        best_items = None
        best_score = float('inf')
        for dest, items in dest_groups.items():
            if len(items) < 12:
                continue

            candidates = sorted(
                items,
                key=lambda item: (
                    (item[0][2] - warehouse.shuttles_x[item[0][3]]) ** 2,
                    item[0][4],
                    item[0][2],
                )
            )[:12]
            score = self._avg_squared_wagon_distance(candidates, warehouse)
            if score < self.max_avg_squared_wagon_distance and score < best_score:
                best_score = score
                best_items = candidates

        if best_items is None:
            return None

        best_items.sort(key=lambda item: (item[0][4], item[0][2]))
        return [code for _, code in best_items]

class Variance(ZSafeRWeightedYSafeAlgorithm):
    """
    Operation-aware variance algorithm.

    Storage uses the fast reordered weighted Y-safe path. Retrieval exports
    only pallets whose selected boxes stay tightly aligned while simulating
    the shuttle movements needed to extract the full pallet.
    """
    def __init__(
        self,
        max_weighted_backoff=1,
        max_pairs_per_aisle_height=1,
        z2_start_x_ratio=0.6,
        max_avg_squared_wagon_distance=144,
        retrieval_time_weight=0.08,
        retrieval_frontness_weight=0.15,
        retrieval_unit_limit=48,
    ):
        super().__init__(
            max_weighted_backoff=max_weighted_backoff,
            max_pairs_per_aisle_height=max_pairs_per_aisle_height,
            z2_start_x_ratio=z2_start_x_ratio,
        )
        self.max_avg_squared_wagon_distance = max_avg_squared_wagon_distance
        self.retrieval_time_weight = retrieval_time_weight
        self.retrieval_frontness_weight = retrieval_frontness_weight
        self.retrieval_unit_limit = retrieval_unit_limit

    def _y_levels_by_carrier_priority(self, warehouse):
        return sorted(
            range(1, warehouse.num_y + 1),
            key=lambda y: (abs(warehouse.shuttles_x[y] - 1), y)
        )

    def _find_z1_slot_in_x(self, dest, warehouse, x):
        for side in range(1, warehouse.num_sides + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for y in self._y_levels_by_carrier_priority(warehouse):
                    if not warehouse.is_slot_empty(aisle, side, x, y, 1):
                        continue

                    pair_count = self._destination_aisle_height_count(dest, warehouse, aisle, y)
                    if pair_count < self.max_pairs_per_aisle_height:
                        return (aisle, side, x, y, 1)
        return None

    def _find_matching_z2_slot_in_x(self, dest, warehouse, x):
        for side in range(1, warehouse.num_sides + 1):
            for aisle in range(1, warehouse.num_aisles + 1):
                for y in self._y_levels_by_carrier_priority(warehouse):
                    if not warehouse.is_slot_empty(aisle, side, x, y, 2):
                        continue

                    z1_box = warehouse.grid.get((aisle, side, x, y, 1))
                    if z1_box and z1_box.get('destination') == dest:
                        return (aisle, side, x, y, 2)
        return None

    def _avg_squared_wagon_distance(self, items, warehouse):
        distances = self._operation_squared_wagon_distances(items, warehouse)
        return sum(distances) / len(distances)

    def _max_squared_wagon_distance(self, items, warehouse):
        return max(self._operation_squared_wagon_distances(items, warehouse))

    def _operation_squared_wagon_distances(self, items, warehouse):
        shuttle_x = dict(warehouse.shuttles_x)
        distances = []
        for coords, _ in self._zsafe_retrieval_order(items):
            x = coords[2]
            y = coords[3]
            distances.append((x - shuttle_x[y]) ** 2)
            shuttle_x[y] = 0
        return distances

    def _estimated_retrieval_time(self, items, warehouse):
        shuttle_x = dict(warehouse.shuttles_x)
        total = 0
        for coords, _ in self._zsafe_retrieval_order(items):
            x = coords[2]
            y = coords[3]
            total += abs(x - shuttle_x[y]) + x + 20
            shuttle_x[y] = 0
        return total

    def _zsafe_retrieval_order(self, items):
        return sorted(items, key=lambda item: (item[0][0], item[0][1], item[0][2], item[0][3], item[0][4]))

    def _frontness_score(self, items):
        return sum(coords[2] for coords, _ in items) / len(items)

    def _slot_units_for_destination(self, items, warehouse):
        slot_groups = {}
        for coords, code in items:
            slot_key = coords[:4]
            slot_groups.setdefault(slot_key, []).append((coords, code))

        units = []
        for slot_key, slot_items in slot_groups.items():
            by_z = {coords[4]: (coords, code) for coords, code in slot_items}
            if 1 in by_z:
                units.append([by_z[1]])
            if 1 in by_z and 2 in by_z:
                units.append([by_z[1], by_z[2]])
            elif 2 in by_z:
                z1_box = warehouse.grid.get((slot_key[0], slot_key[1], slot_key[2], slot_key[3], 1))
                if z1_box is None:
                    units.append([by_z[2]])

        return units

    def _unit_score(self, unit, warehouse):
        avg_variance = self._avg_squared_wagon_distance(unit, warehouse)
        retrieval_time = self._estimated_retrieval_time(unit, warehouse)
        frontness = self._frontness_score(unit)
        pair_bonus = -0.2 if len(unit) == 2 else 0
        return (
            avg_variance
            + (retrieval_time * self.retrieval_time_weight)
            + (frontness * self.retrieval_frontness_weight)
            + pair_bonus
        )

    def _candidate_pallet_for_destination(self, items, warehouse):
        units = self._slot_units_for_destination(items, warehouse)
        units = sorted(
            units,
            key=lambda unit: (self._unit_score(unit, warehouse), len(unit))
        )[:self.retrieval_unit_limit]

        selected = []
        selected_codes = set()
        for unit in units:
            if len(selected) + len(unit) > 12:
                continue
            if any(code in selected_codes for _, code in unit):
                continue
            selected.extend(unit)
            selected_codes.update(code for _, code in unit)
            if len(selected) == 12:
                return selected

        return None

    def _pallet_score(self, items, warehouse):
        avg_variance = self._avg_squared_wagon_distance(items, warehouse)
        retrieval_time = self._estimated_retrieval_time(items, warehouse)
        frontness = self._frontness_score(items)
        return (
            avg_variance,
            (retrieval_time * self.retrieval_time_weight) + (frontness * self.retrieval_frontness_weight),
            frontness,
        )

    def get_retrieval_plan(self, warehouse):
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        best_items = None
        best_score = None
        for dest, items in dest_groups.items():
            if len(items) < 12:
                continue

            candidates = self._candidate_pallet_for_destination(items, warehouse)
            if candidates is None:
                continue

            score = self._avg_squared_wagon_distance(candidates, warehouse)
            max_score = self._max_squared_wagon_distance(candidates, warehouse)
            if score >= self.max_avg_squared_wagon_distance:
                continue
            if max_score >= self.max_avg_squared_wagon_distance:
                continue

            pallet_score = self._pallet_score(candidates, warehouse)
            if best_score is None or pallet_score < best_score:
                best_score = pallet_score
                best_items = candidates

        if best_items is None:
            return None

        return [code for _, code in self._zsafe_retrieval_order(best_items)]

class ZSafeWeightedProAlgorithm(ZSafeWeightedAlgorithm):
    """
    Combines ZSafeWeighted's frequency-aware storage with ZSafePro's
    smart retrieval plan.

    STORAGE: inherited from ZSafeWeightedAlgorithm — frequent destinations
    near X=1, rare ones get a soft backoff, all Z-safe.

    RETRIEVAL (from ZSafePro):
      1. Pick destination with 12+ boxes and lowest average X.
      2. Prefer complete Z=1+Z=2 pairs to avoid orphaned Z=2.
      3. Sort by Z ascending, then X ascending.
    """
    def get_retrieval_plan(self, warehouse):
        dest_groups = {}
        for coords, box_data in warehouse.grid.items():
            dest = box_data.get('destination')
            if dest not in dest_groups:
                dest_groups[dest] = []
            dest_groups[dest].append((coords, box_data['code']))

        # Pick destination with lowest average X
        best_dest = None
        best_avg_x = float('inf')
        for dest, items in dest_groups.items():
            if len(items) >= 12:
                avg_x = sum(c[2] for c, _ in items) / len(items)
                if avg_x < best_avg_x:
                    best_avg_x = avg_x
                    best_dest = dest

        if best_dest is None:
            return None

        items = dest_groups[best_dest]

        # Group by (aisle, side, x, y) slot
        slot_groups = {}
        for coords, code in items:
            slot_key = (coords[0], coords[1], coords[2], coords[3])
            if slot_key not in slot_groups:
                slot_groups[slot_key] = []
            slot_groups[slot_key].append((coords, code))

        sorted_slots = sorted(slot_groups.items(), key=lambda s: s[0][2])

        # Prefer complete Z-pairs first
        selected = []
        for slot_key, slot_items in sorted_slots:
            if len(selected) >= 12:
                break
            if len(slot_items) == 2:
                slot_items.sort(key=lambda t: t[0][4])
                for item in slot_items:
                    if len(selected) < 12:
                        selected.append(item)

        for slot_key, slot_items in sorted_slots:
            if len(selected) >= 12:
                break
            if len(slot_items) == 1:
                selected.append(slot_items[0])

        selected.sort(key=lambda t: (t[0][4], t[0][2]))
        return [code for _, code in selected[:12]]

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
