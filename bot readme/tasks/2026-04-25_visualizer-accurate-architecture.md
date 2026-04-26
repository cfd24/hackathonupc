# Task ID: TASK-004
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Antigravity
**Task Type:** Refactor

---

## Objective & Success

**Primary Objective:** Replace the generic dot grid with an accurate visual 
representation of the real silo architecture so a human can immediately 
understand what they're looking at.

**Success Criteria:**
- Aisles, sides, X positions, Y levels, and Z depth all clearly visible
- Shuttle positions shown and animated per Y level
- Z-blocking clearly visualized (Z=1 vs Z=2)
- Box identity visible on hover (destination, pallet group)
- Coordinate system labeled (aisle, side, X, Y, Z)

---

## Real Silo Architecture

**Exact dimensions:**
- Aisles: 4 (Aisle 1–4)
- Sides per aisle: 2 (Left=01, Right=02)
- X positions: 1–60 (length of aisle, 1=head/entrance, 60=end)
- Y levels: 1–8 (height, Y=1 is ground level)
- Z depth: 1–2 only (Z=1 = front/accessible, Z=2 = behind Z=1)

**Position ID format:** AISLE_SIDE_X_Y_Z
Example: 01_02_003_04_01 = Aisle 1, Right side, X=3, Y=4, Z=1

**Box ID format:** 20-digit code
- Source (7 digits): warehouse origin
- Destination (8 digits): store/platform
- Bulk number (5 digits): batch ID

**Shuttle rules:**
- 1 shuttle per Y level = 8 shuttles total
- Each shuttle starts at X=0 (head) at t=0
- Shared for inbound AND outbound
- Time formula: t = 10 + |X_destination - X_current|
- Shuttle must go to head (X=0) to pick up inbound box first

**Pallet rules:**
- 1 pallet = 12 boxes, same destination
- Max 8 active pallets at once (2 robots × 4 slots)
- Dynamic priority: pick boxes in whatever order optimizes shuttle travel,
  regardless of pallet reservation order

---

## Visualization Design

**Layout — show one aisle at a time, switchable:**

Main view = side view of one aisle (X axis horizontal, Y axis vertical):