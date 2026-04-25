# Task ID: TASK-015
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Unassigned
**Task Type:** Feature

## Objective & Success

**Primary Objective:** Update the warehouse grid configuration to match the physical layout: 4 aisles, each with 2 sides, with shelves that only see one aisle. Z should be 1 or 2, X should be 1 to 60, and Y should be 1 to 8.

**Success Criteria:**
- Warehouse grid correctly represents 4 aisles × 2 sides × 60 X positions × 8 Y positions × 2 Z positions
- Each shelf only has visibility to one aisle
- Coordinate system properly constrains placement and retrieval

**Definition of Done:**
- [ ] Update warehouse.py grid initialization to use new dimensions
- [ ] Verify aisle/side logic ensures shelves only see one aisle
- [ ] Ensure Z-depth blocking rules work correctly with new configuration
- [ ] Test that shuttles operate correctly per level (Y) across all aisles

## Current State Analysis

The current OUTLINE.md describes the warehouse with:
- **Aisles**: 4
- **Sides**: 2
- **X**: 60 positions (longitudinal)
- **Y**: 8 levels
- **Z**: 2 depths

However, the implementation may not correctly enforce that "every shelf only sees one aisle" - this is a physical constraint where each shelf belongs to a specific aisle and cannot see into adjacent aisles.

## Implementation Requirements

### Grid Structure
The grid should be organized as:
```
grid[aisle][side][x][y][z]
```

Where:
- `aisle`: 0-3 (4 aisles)
- `side`: 0-1 (2 sides per aisle)
- `x`: 1-60 (longitudinal positions)
- `y`: 1-8 (vertical levels)
- `z`: 1-2 (depth - z=1 is front, z=2 is back)

### Key Constraints
1. Each shelf (combination of aisle + side + x + y) only sees its own aisle
2. A shuttle at level Y can only access positions within its assigned aisle
3. Z-blocking rule: cannot retrieve z=2 if z=1 has a box in the same x,y position

### Files to Modify
- `controllers/silo_simulator/warehouse.py` - Grid initialization and position validation
- `controllers/silo_simulator/simulator.py` - Shuttle movement logic (if needed)

## Acceptance Criteria

1. Grid dimensions are: 4 aisles × 2 sides × 60 X × 8 Y × 2 Z
2. When placing/retrieving, the aisle parameter is properly validated
3. Shuttles only operate within their assigned aisle
4. Z-blocking rule works correctly (cannot access z=2 if z=1 is occupied)
5. All existing tests pass with new configuration