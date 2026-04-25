from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Dict, List

AISLES        = 4
SIDES         = 2
X_MAX         = 60
Y_MAX         = 8
Z_MAX         = 2
HANDLING_TIME = 10


@dataclass(frozen=True)
class Position:
    aisle: int   # 1..AISLES
    side:  int   # 1..SIDES
    x:     int   # 1..X_MAX
    y:     int   # 1..Y_MAX  (also = shuttle level)
    z:     int   # 1..Z_MAX

    def __str__(self) -> str:
        return f"{self.aisle:02d}_{self.side:02d}_{self.x:03d}_{self.y:02d}_{self.z:02d}"


@dataclass
class Box:
    code: str  # 20-digit: source(7) + destination(8) + bulk(5)

    @property
    def source(self) -> str:
        return self.code[:7]

    @property
    def destination(self) -> str:
        return self.code[7:15]

    @property
    def bulk(self) -> str:
        return self.code[15:]


class Shuttle:
    """One automated cart per Y level. Starts at X=0 (head/entrance)."""

    def __init__(self, y: int) -> None:
        self.y = y
        self.x: int = 0
        self.total_time: float = 0.0

    def travel(self, target_x: int) -> float:
        """Move to target_x. Returns time cost = HANDLING_TIME + distance."""
        cost = HANDLING_TIME + abs(self.x - target_x)
        self.total_time += cost
        self.x = target_x
        return cost


class Warehouse:
    """
    3-D silo: AISLES × SIDES × X_MAX × Y_MAX × Z_MAX cells.
    One Shuttle per Y level; all start at x=0.
    Z constraint: z=1 must be occupied before z=2 can be filled,
                  and z=1 must be relocated before z=2 can be retrieved.
    """

    def __init__(self) -> None:
        self.grid:          Dict[Position, Box] = {}
        self.box_positions: Dict[str, Position] = {}
        self.shuttles:      Dict[int, Shuttle]  = {
            y: Shuttle(y) for y in range(1, Y_MAX + 1)
        }

    # ── queries ───────────────────────────────────────────────────────────────

    def is_occupied(self, pos: Position) -> bool:
        return pos in self.grid

    def get_box(self, pos: Position) -> Optional[Box]:
        return self.grid.get(pos)

    def free_positions(self, y: int) -> List[Position]:
        """All positions at height y that can legally accept a new box."""
        result = []
        for aisle in range(1, AISLES + 1):
            for side in range(1, SIDES + 1):
                for x in range(1, X_MAX + 1):
                    z1 = Position(aisle, side, x, y, 1)
                    if not self.is_occupied(z1):
                        result.append(z1)
                    else:
                        z2 = Position(aisle, side, x, y, 2)
                        if not self.is_occupied(z2):
                            result.append(z2)
        return result

    def occupancy_vector(self, y: int, aisle: int = 1, side: int = 1) -> List[int]:
        """120-element binary vector (0=free,1=occupied) for a given y/aisle/side slice."""
        vec = []
        for x in range(1, X_MAX + 1):
            for z in range(1, Z_MAX + 1):
                vec.append(1 if self.is_occupied(Position(aisle, side, x, y, z)) else 0)
        return vec

    # ── mutations ─────────────────────────────────────────────────────────────

    def place(self, box: Box, pos: Position) -> bool:
        """Place box at pos. Returns False if illegal (occupied or z-constraint)."""
        if self.is_occupied(pos):
            return False
        if pos.z == 2:
            z1 = Position(pos.aisle, pos.side, pos.x, pos.y, 1)
            if not self.is_occupied(z1):
                return False  # z=1 must be filled first
        self.grid[pos] = box
        self.box_positions[box.code] = pos
        return True

    def remove(self, pos: Position) -> Optional[Box]:
        box = self.grid.pop(pos, None)
        if box:
            self.box_positions.pop(box.code, None)
        return box

    # ── stats ─────────────────────────────────────────────────────────────────

    def total_boxes(self) -> int:
        return len(self.grid)

    def capacity(self) -> int:
        return AISLES * SIDES * X_MAX * Y_MAX * Z_MAX

    def __repr__(self) -> str:
        return f"Warehouse({self.total_boxes()}/{self.capacity()} boxes)"
