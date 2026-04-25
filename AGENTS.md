read the README.md files on bot readme. why does the simulation always return the same values? even if you change the number of seconds the robots take to process a pallet to an absurdly large number, it still returns the same---
name: HackUPC Warehouse Simulation
description: "Agent instructions for HackUPC 2026 warehouse simulation project with silo simulator, robot palletization, and algorithm testing"
applyTo: "**/*"
---

# HackUPC 2026 — Warehouse Simulation Agent

## Quick Start

Run the simulation sandbox:
```bash
python main/main.py
```

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `main/` | Entry point, sandbox CLI |
| `controllers/silo_simulator/` | Core simulation (Simulator, Robot, Warehouse classes) |
| `controllers/algorithm/` | Storage/retrieval algorithms (SimpleAlgorithm, DistanceGreedyAlgorithm) |
| `frontend/` | Web dashboard (HTML/CSS/JS) |
| `bot readme/` | Architecture documentation |

## Key Files

- [main/main.py](main/main.py) — Sandbox runner, algorithm selection, box stream generation
- [controllers/silo_simulator/simulator.py](controllers/silo_simulator/simulator.py) — `Simulator`, `Robot` classes (4 slots per robot)
- [controllers/silo_simulator/warehouse.py](controllers/silo_simulator/warehouse.py) — Grid-based warehouse (aisles, sides, X, Y, Z coordinates)
- [controllers/algorithm/algorithms.py](controllers/algorithm/algorithms.py) — `BaseAlgorithm`, `SimpleAlgorithm`, `DistanceGreedyAlgorithm`

## Architecture Docs

See [bot readme/architecture/OUTLINE.md](bot%20readme/architecture/OUTLINE.md) for detailed architecture documentation.

## Dependencies

- `numpy>=1.24` — See [requirements.txt](requirements.txt)

## Common Tasks

- **Add new algorithm**: Create class inheriting from `BaseAlgorithm` in `controllers/algorithm/algorithms.py`, add to `AVAILABLE_ALGORITHMS` in `main/main.py`
- **Modify robot behavior**: Edit `Robot` class in `controllers/silo_simulator/simulator.py`
- **Frontend changes**: Edit `frontend/index.html`, `frontend/app.js`, `frontend/style.css`