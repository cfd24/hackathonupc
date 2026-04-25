# Silo Simulator Base

This component provides a performance-oriented simulation engine for the logistics silo hackathon project.

## Components

- **`warehouse.py`**: The data structure representing the 3D silo grid. It tracks 8 independent shuttles (one per level) and simulates parallel movement.
- **`algorithms.py`**: A clean interface for storage and retrieval strategies. Swap algorithms by inheriting from `BaseAlgorithm`.
- **`simulator.py`**: The main entry point. It parses box codes, runs the simulation loop, and outputs performance metrics.

## Performance Metrics

The simulator tracks:
- **Total Time**: The timestamp when the last shuttle finishes its last operation.
- **Throughput**: Boxes processed per hour.
- **Full Pallets %**: Percentage of boxes that successfully formed a 12-box pallet.

## How to Use

1. **Run the demo**:
   ```bash
   python3 silo_simulator/simulator.py
   ```

2. **Add new boxes**:
   Modify the `__main__` block in `simulator.py` or call `Simulator.run(box_codes_list)`.

3. **Implement a new algorithm**:
   Create a new class in `algorithms.py` that inherits from `BaseAlgorithm` and implement `get_storage_location` and `get_retrieval_plan`.
