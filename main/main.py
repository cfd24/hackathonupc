"""
HackUPC 2026 — Medieval Challenge
Entry point: runs greedy warehouse simulation, trains NN, then compares them.

Usage:
    python main.py
"""
import random
import sys
import os

# Add project root to sys.path so we can import 'controllers'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from controllers.silo_simulator.warehouse_greedy import Warehouse, Box, Position, X_MAX, Y_MAX, Z_MAX, AISLES, SIDES
from controllers.algorithm.algorithms_greedy import store_greedy, retrieve_greedy, collect_training_data
from controllers.algorithm.neural import WarehouseNet


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1 — Greedy simulation
# ─────────────────────────────────────────────────────────────────────────────

def _banner(title: str) -> None:
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def run_greedy_demo() -> None:
    _banner("Phase 1: Greedy Warehouse Simulation")

    rng = random.Random(7)

    def make_box(i: int) -> Box:
        src  = f"{rng.randint(1_000_000, 9_999_999)}"
        dest = f"{rng.randint(10_000_000, 99_999_999)}"
        return Box(f"{src}{dest}{i:05d}")

    wh    = Warehouse()
    boxes = [make_box(i) for i in range(1, 101)]

    # ── store ──────────────────────────────────────────────────────────────
    print("\n[STORE] Adding 100 boxes to the warehouse:")
    store_times = []
    for box in boxes:
        pos, t = store_greedy(wh, box)
        if pos:
            store_times.append(t)
            print(f"  box {box.code}  ->  {pos}  ({t:.0f}s)")
        else:
            print(f"  box {box.code}  ->  WAREHOUSE FULL")

    print(f"\n  Boxes stored : {wh.total_boxes()} / {wh.capacity()}")
    print(f"  Total store time : {sum(store_times):.0f}s")
    print(f"  Avg  store time  : {sum(store_times)/len(store_times):.1f}s")

    # ── retrieve ───────────────────────────────────────────────────────────
    sample = rng.sample(boxes, 20)
    print(f"\n[RETRIEVE] Retrieving {len(sample)} random boxes:")
    retrieve_times = []
    for box in sample:
        b, t = retrieve_greedy(wh, box.code)
        if b:
            retrieve_times.append(t)
            print(f"  box {b.code}  ({t:.0f}s)")
        else:
            print(f"  box {box.code}  ->  NOT FOUND (already retrieved?)")

    print(f"\n  Total retrieve time : {sum(retrieve_times):.0f}s")
    print(f"  Avg  retrieve time  : {sum(retrieve_times)/len(retrieve_times):.1f}s")

    # ── shuttle summary ────────────────────────────────────────────────────
    print(f"\n[SHUTTLES] Cumulative time per Y level:")
    total_shuttle = 0.0
    for y, s in sorted(wh.shuttles.items()):
        print(f"  Y={y}: {s.total_time:.0f}s  (current x={s.x})")
        total_shuttle += s.total_time
    print(f"  Total across all shuttles: {total_shuttle:.0f}s")


# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 — Neural network
# ─────────────────────────────────────────────────────────────────────────────

def run_nn_demo() -> None:
    _banner("Phase 2: Neural Network (imitation learning from greedy)")

    # Collect greedy decisions as labelled training data
    print("\n[DATA] Running greedy simulation to collect training samples…")
    samples, final_wh = collect_training_data(num_boxes=300, seed=42)
    print(f"  Collected {len(samples)} (state, action) pairs")

    # Train
    net = WarehouseNet(input_dim=121, hidden1=64, hidden2=32, output_dim=60, lr=0.008)
    print("\n[TRAIN] Training WarehouseNet…")
    net.fit(samples, epochs=60, verbose=True)

    # ── comparison on fresh 50-box batch ───────────────────────────────────
    print("\n[COMPARE] Greedy vs NN on 50 fresh boxes (same initial conditions):")

    rng = random.Random(99)

    def make_box(i: int) -> Box:
        src  = f"{rng.randint(1_000_000, 9_999_999)}"
        dest = f"{rng.randint(10_000_000, 99_999_999)}"
        return Box(f"{src}{dest}{i:05d}")

    test_boxes = [make_box(i) for i in range(50)]

    # ── greedy run ──────────────────────────────────────────────────────────
    wh_g      = Warehouse()
    greedy_t  = 0.0
    for box in test_boxes:
        _, t = store_greedy(wh_g, box)
        greedy_t += t

    # ── NN run ──────────────────────────────────────────────────────────────
    wh_n   = Warehouse()
    nn_t   = 0.0
    placed = 0
    for box in test_boxes:
        y       = 1   # simplified: NN targets Y=1 level
        shuttle = wh_n.shuttles[y]
        occ     = wh_n.occupancy_vector(y)
        state   = [shuttle.x / X_MAX] + [float(v) for v in occ]
        x_pred  = net.predict_x(state)   # 1-based

        stored = False
        for z in range(1, Z_MAX + 1):
            pos = Position(1, 1, x_pred, y, z)
            if wh_n.place(box, pos):
                t1   = shuttle.travel(0)
                t2   = shuttle.travel(pos.x)
                nn_t += t1 + t2
                placed += 1
                stored = True
                break
        if not stored:
            # Fallback: greedy for boxes NN couldn't place
            _, t = store_greedy(wh_n, box)
            nn_t += t

    print(f"\n  Greedy total store time : {greedy_t:.0f}s")
    print(f"  NN     total store time : {nn_t:.0f}s")
    ratio = greedy_t / nn_t if nn_t > 0 else 0
    print(f"  NN efficiency vs greedy : {ratio*100:.1f}%")
    print(f"  (NN placed {placed}/50 boxes directly; rest used greedy fallback)")


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_greedy_demo()
    run_nn_demo()
