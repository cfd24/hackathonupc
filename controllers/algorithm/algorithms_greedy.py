"""
Greedy storage and retrieval algorithms.
Also exposes collect_training_data() used by the neural network trainer.
"""
from __future__ import annotations
import random
from typing import Optional, Tuple, List

from controllers.silo_simulator.warehouse_greedy import Warehouse, Box, Position, AISLES, SIDES, X_MAX, Y_MAX, Z_MAX


# ── helpers ───────────────────────────────────────────────────────────────────

def _nearest_free(warehouse: Warehouse, y: int, prefer_x: int = 0) -> Optional[Position]:
    """Return the free position at height y whose X is closest to prefer_x."""
    free = warehouse.free_positions(y)
    if not free:
        return None
    return min(free, key=lambda p: abs(p.x - prefer_x))


def _best_y(warehouse: Warehouse) -> int:
    """
    Pick the Y level that minimises estimated store cost:
    shuttle_x (trip to head) + nearest_free_x (trip to slot).
    """
    best_y    = 1
    best_cost = float("inf")
    for y, shuttle in warehouse.shuttles.items():
        free = warehouse.free_positions(y)
        if not free:
            continue
        nearest_x = min(p.x for p in free)
        cost = shuttle.x + nearest_x   # proportional to actual time
        if cost < best_cost:
            best_cost = cost
            best_y    = y
    return best_y


# ── public API ────────────────────────────────────────────────────────────────

def store_greedy(warehouse: Warehouse, box: Box) -> Tuple[Optional[Position], float]:
    """
    Store box:
      1. Choose Y level with lowest estimated cost.
      2. Choose slot with X closest to head (x=0).
      3. Shuttle travels: current → 0 (pick up box) → slot (deposit).
    Returns (position, time) or (None, 0) if warehouse is full.
    """
    y       = _best_y(warehouse)
    shuttle = warehouse.shuttles[y]
    pos     = _nearest_free(warehouse, y, prefer_x=0)
    if pos is None:
        return None, 0.0

    t1 = shuttle.travel(0)       # pick up box at entrance
    t2 = shuttle.travel(pos.x)   # deposit at slot
    warehouse.place(box, pos)
    return pos, t1 + t2


def retrieve_greedy(warehouse: Warehouse, box_code: str) -> Tuple[Optional[Box], float]:
    """
    Retrieve box:
      - If box is at z=2 and z=1 is occupied, relocate z=1 first.
      - Shuttle: current → box_x (pick) → 0 (deliver to exit).
    Returns (box, time) or (None, 0) if box not found.
    """
    if box_code not in warehouse.box_positions:
        return None, 0.0

    pos     = warehouse.box_positions[box_code]
    shuttle = warehouse.shuttles[pos.y]
    total   = 0.0

    if pos.z == 2:
        z1_pos = Position(pos.aisle, pos.side, pos.x, pos.y, 1)
        z1_box = warehouse.get_box(z1_pos)
        if z1_box:
            total += shuttle.travel(z1_pos.x)   # pick up blocking box
            warehouse.remove(z1_pos)
            reloc = _nearest_free(warehouse, pos.y)
            if reloc:
                total += shuttle.travel(reloc.x)
                warehouse.place(z1_box, reloc)
            else:                               # no space: put it back
                warehouse.place(z1_box, z1_pos)
                total += shuttle.travel(z1_pos.x)

    total += shuttle.travel(pos.x)   # pick up target box
    box    = warehouse.remove(pos)
    total += shuttle.travel(0)       # deliver to head
    return box, total


# ── training data collection ──────────────────────────────────────────────────

def collect_training_data(
    num_boxes: int = 300,
    seed: int = 42,
) -> Tuple[List, Warehouse]:
    """
    Run greedy simulation and record (state_vector, chosen_x_index) for each store.
    state_vector = [shuttle_x_normalised, *occupancy_vector(y, aisle=1, side=1)]
    chosen_x_index = pos.x - 1  (0-based)

    Returns (samples, final_warehouse).
    """
    rng = random.Random(seed)

    def make_box(i: int) -> Box:
        src  = f"{rng.randint(1_000_000, 9_999_999)}"
        dest = f"{rng.randint(10_000_000, 99_999_999)}"
        return Box(f"{src}{dest}{i:05d}")

    warehouse = Warehouse()
    samples: List[Tuple] = []

    for i in range(num_boxes):
        box = make_box(i)

        y       = _best_y(warehouse)
        shuttle = warehouse.shuttles[y]
        occ     = warehouse.occupancy_vector(y)
        state   = [shuttle.x / X_MAX] + [float(v) for v in occ]

        pos, _ = store_greedy(warehouse, box)
        if pos is not None:
            samples.append((state, pos.x - 1))   # 0-based target

    return samples, warehouse
