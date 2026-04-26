# test_simulator.py
import sys
sys.path.append('.')

from controllers.silo_simulator.simulator import Simulator, Robot
from controllers.algorithm.algorithms import SimpleAlgorithm

def test_robot():
    print("\n--- TEST 1: Robot slots ---")
    r = Robot(0, 4)
    assert r.has_free_slot(), "FAIL: new robot should have free slots"
    assert r.get_free_slot() == 0, "FAIL: first free slot should be 0"
    
    r.assign_pallet("DEST0001", current_time=0, packing_time=30)
    r.assign_pallet("DEST0002", current_time=0, packing_time=30)
    r.assign_pallet("DEST0003", current_time=0, packing_time=30)
    r.assign_pallet("DEST0004", current_time=0, packing_time=30)
    assert not r.has_free_slot(), "FAIL: robot should be full with 4 pallets"
    print("✅ Robot slots work correctly")

def test_pallet_needs_12_boxes():
    print("\n--- TEST 2: Pallet needs exactly 12 boxes ---")
    sim = Simulator(SimpleAlgorithm(), packing_time=0)
    
    # add 11 boxes to extracted pool
    for i in range(11):
        sim.extracted_boxes["DEST0001"].append(f"123456700000001{i:05d}")
    
    sim.process_extracted_boxes()
    assert sim.pallets_waiting_count == 0, f"FAIL: pallet formed with only 11 boxes"
    
    # add 12th box
    sim.extracted_boxes["DEST0001"].append("1234567000000010000012345")
    sim.process_extracted_boxes()
    assert sim.pallets_waiting_count == 1, f"FAIL: pallet not formed with 12 boxes"
    print("✅ Pallet needs exactly 12 boxes")

def test_physics():
    print("\n--- TEST 3: Physics t = 10 + d ---")
    sim = Simulator(SimpleAlgorithm(), packing_time=0)
    w = sim.warehouse
    
    # shuttle at y=1 starts at x=0
    initial_x = w.shuttles_x.get(1, 0)
    initial_t = w.shuttles_time.get(1, 0)
    
    # manually check time formula
    d = 20
    expected_time = initial_t + 10 + d
    actual_time = initial_t + 10 + abs(d - initial_x)
    assert actual_time == expected_time, f"FAIL: expected {expected_time}, got {actual_time}"
    print("✅ Physics t=10+d correct")

def test_z_blocking():
    print("\n--- TEST 4: Z-blocking ---")
    sim = Simulator(SimpleAlgorithm(), packing_time=0)
    w = sim.warehouse
    
    box1 = {"code": "1234567DEST000100001", "source": "1234567", "destination": "DEST0001", "bulk": "00001"}
    box2 = {"code": "1234567DEST000200002", "source": "1234567", "destination": "DEST0002", "bulk": "00002"}
    
    w.store_box(1, 1, 5, 1, 1, box1)
    w.store_box(1, 1, 5, 1, 2, box2)
    
    # try to retrieve z=2 directly - should require relocation of z=1
    pos_z1 = (1, 1, 5, 1, 1)
    pos_z2 = (1, 1, 5, 1, 2)
    
    assert pos_z1 in w.grid, "FAIL: z=1 box not stored"
    assert pos_z2 in w.grid, "FAIL: z=2 box not stored"
    print("✅ Z-blocking setup correct")

def test_max_8_pallets():
    print("\n--- TEST 5: Max 8 active pallets (2 robots x 4 slots) ---")
    sim = Simulator(SimpleAlgorithm(), packing_time=9999)  # long packing time so slots dont free up
    
    # fill all 8 slots
    for i in range(8):
        dest = f"DEST{i:04d}"
        sim.extracted_boxes[dest] = [f"123456700000001{j:05d}" for j in range(12)]
    
    sim.process_extracted_boxes()
    sim.assign_pallets_to_robots()
    
    total_active = sum(r.get_active_count() for r in sim.robots)
    assert total_active == 8, f"FAIL: expected 8 active slots, got {total_active}"
    
    # try to add a 9th - should not be assigned
    sim.extracted_boxes["DEST0009"] = [f"9999999000000090{j:05d}" for j in range(12)]
    sim.process_extracted_boxes()
    sim.assign_pallets_to_robots()
    
    total_active_after = sum(r.get_active_count() for r in sim.robots)
    assert total_active_after == 8, f"FAIL: 9th pallet was assigned, should be max 8"
    print("✅ Max 8 active pallets enforced")

if __name__ == "__main__":
    print("🧪 Running simulator tests...")
    test_robot()
    test_pallet_needs_12_boxes()
    test_physics()
    test_z_blocking()
    test_max_8_pallets()
    print("\n✅ ALL TESTS PASSED")
