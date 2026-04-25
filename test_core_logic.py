from controllers.silo_simulator.warehouse import Warehouse
from controllers.silo_simulator.simulator import Simulator
from controllers.algorithm.algorithms import SimpleAlgorithm

def test_shuttle_time():
    print("Testing Shuttle Time Formula (t = 10 + distance)...")
    wh = Warehouse()
    # Shuttle starts at X=0
    # Move to X=10: dist=10, time = 10 + 10 = 20
    t = wh.move_shuttle(y=1, target_x=10)
    assert t == 20, f"Expected 20, got {t}"
    # Move to X=15: dist=5, time = 10 + 5 = 15
    t = wh.move_shuttle(y=1, target_x=15)
    assert t == 15, f"Expected 15, got {t}"
    print("  PASS")

def test_z_constraints():
    print("Testing Z Constraints (Storage & Retrieval)...")
    wh = Warehouse()
    box1 = {'code': 'B1'*10, 'destination': 'D1'}
    box2 = {'code': 'B2'*10, 'destination': 'D1'}
    
    # 1. Store Z=2 without Z=1 should FAIL
    try:
        wh.store_box(1, 1, 10, 1, 2, box2)
        assert False, "Should have failed storing Z=2 with empty Z=1"
    except ValueError as e:
        print(f"  PASS: Caught expected error: {e}")

    # 2. Store Z=1 then Z=2 should PASS
    wh.store_box(1, 1, 10, 1, 1, box1)
    wh.store_box(1, 1, 10, 1, 2, box2)
    assert not wh.is_slot_empty(1, 1, 10, 1, 1)
    assert not wh.is_slot_empty(1, 1, 10, 1, 2)
    print("  PASS: Storage Z-constraint")

    # 3. Retrieve Z=2 (should relocate Z=1)
    _, total_time = wh.retrieve_box(1, 1, 10, 1, 2)
    print(f"  Z=2 Retrieval Time: {total_time}s")
    assert wh.is_slot_empty(1, 1, 10, 1, 2), "Z=2 should be empty"
    # Check if box1 (Z=1) is still in the warehouse but moved
    box1_pos = wh.box_positions.get(box1['code'])
    assert box1_pos is not None, "Z=1 box should still exist"
    assert box1_pos != (1, 1, 10, 1, 1), "Z=1 should have been relocated"
    print(f"  PASS: Relocation logic (moved to {box1_pos})")

def test_parallelism():
    print("Testing Shuttle Parallelism...")
    wh = Warehouse()
    # If we have two tasks arriving at same time (global_time=0)
    # Level Y=1 moves to X=10 (time 20)
    # Level Y=2 moves to X=60 (time 70)
    wh.move_shuttle(y=1, target_x=10)
    wh.move_shuttle(y=2, target_x=60)
    
    # Global time should be 0 (if arrival_interval=0)
    # Finish times: Y1=20, Y2=70.
    assert wh.shuttles_time[1] == 20
    assert wh.shuttles_time[2] == 70
    # Total makespan should be 70
    assert max(wh.shuttles_time.values()) == 70
    print("  PASS: Shuttles operate independently")

def test_pallet_logic():
    print("Testing Pallet Logic (12 boxes)...")
    sim = Simulator(SimpleAlgorithm())
    # Add 11 boxes for DEST1
    boxes = [f"SRC0001DEST0001B{i:04d}" for i in range(11)]
    sim.run(boxes, arrival_interval=0)
    assert sim.pallets_completed == 0, "Should not complete pallet with 11 boxes"
    
    # Add the 12th box
    sim.run([f"SRC0001DEST0001B0012"], arrival_interval=0)
    assert sim.pallets_completed == 1, "Should complete pallet with 12 boxes"
    print("  PASS")

if __name__ == "__main__":
    print("=== STARTING CORE LOGIC TESTS ===\n")
    test_shuttle_time()
    test_z_constraints()
    test_parallelism()
    test_pallet_logic()
    print("\n=== ALL TESTS PASSED ===")
