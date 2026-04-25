"""
Simple 3-layer feedforward neural network (NumPy only).

Task: given the current shuttle state, predict the optimal X slot (1..X_MAX)
for storing the next box — trained via imitation learning on the greedy algorithm.

Architecture:
  Input  (121):  [shuttle_x_norm(1), occupancy_vector(120)]
  Hidden (64):   ReLU
  Hidden (32):   ReLU
  Output (60):   Softmax → probability over X positions 1..60
"""
from __future__ import annotations
import numpy as np
from typing import List, Tuple


def _relu(x: np.ndarray) -> np.ndarray:
    return np.maximum(0.0, x)


def _softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


class WarehouseNet:
    """
    Feedforward net trained to imitate the greedy placement algorithm.
    Pure NumPy — no external ML framework needed.
    """

    def __init__(
        self,
        input_dim:  int   = 121,
        hidden1:    int   = 64,
        hidden2:    int   = 32,
        output_dim: int   = 60,
        lr:         float = 0.01,
        seed:       int   = 0,
    ) -> None:
        self.lr = lr
        rng = np.random.default_rng(seed)

        def init(rows: int, cols: int) -> np.ndarray:
            return rng.normal(0, np.sqrt(2.0 / cols), (rows, cols)).astype(np.float32)

        self.W1 = init(hidden1,    input_dim)
        self.b1 = np.zeros(hidden1,    dtype=np.float32)
        self.W2 = init(hidden2,    hidden1)
        self.b2 = np.zeros(hidden2,    dtype=np.float32)
        self.W3 = init(output_dim, hidden2)
        self.b3 = np.zeros(output_dim, dtype=np.float32)

    # ── forward / predict ─────────────────────────────────────────────────────

    def _forward(self, x: np.ndarray) -> Tuple[np.ndarray, dict]:
        z1 = self.W1 @ x + self.b1;  a1 = _relu(z1)
        z2 = self.W2 @ a1 + self.b2; a2 = _relu(z2)
        z3 = self.W3 @ a2 + self.b3
        probs = _softmax(z3)
        return probs, {"x": x, "z1": z1, "a1": a1, "z2": z2, "a2": a2, "probs": probs}

    def predict_x(self, state: List[float]) -> int:
        """Return the predicted best X position (1-indexed)."""
        probs, _ = self._forward(np.array(state, dtype=np.float32))
        return int(np.argmax(probs)) + 1   # 0-based → 1-based

    # ── training ──────────────────────────────────────────────────────────────

    def _backward(self, cache: dict, target: int) -> None:
        probs   = cache["probs"]
        delta3  = probs.copy()
        delta3[target] -= 1.0          # dL/dz3 for cross-entropy + softmax

        dW3 = np.outer(delta3, cache["a2"]); db3 = delta3
        delta2 = (self.W3.T @ delta3) * (cache["z2"] > 0)
        dW2 = np.outer(delta2, cache["a1"]); db2 = delta2
        delta1 = (self.W2.T @ delta2) * (cache["z1"] > 0)
        dW1 = np.outer(delta1, cache["x"]);  db1 = delta1

        self.W3 -= self.lr * dW3; self.b3 -= self.lr * db3
        self.W2 -= self.lr * dW2; self.b2 -= self.lr * db2
        self.W1 -= self.lr * dW1; self.b1 -= self.lr * db1

    def train_step(self, state: List[float], target_x_index: int) -> float:
        """Single SGD step. target_x_index is 0-based. Returns cross-entropy loss."""
        x = np.array(state, dtype=np.float32)
        probs, cache = self._forward(x)
        loss = -np.log(probs[target_x_index] + 1e-9)
        self._backward(cache, target_x_index)
        return float(loss)

    def fit(
        self,
        samples: List[Tuple[List[float], int]],
        epochs:  int   = 60,
        verbose: bool  = True,
    ) -> List[float]:
        """
        Train on (state_vector, target_x_index) pairs collected from greedy algorithm.
        Returns list of per-epoch average losses.
        """
        import random
        rng = random.Random(1)
        losses = []
        for epoch in range(1, epochs + 1):
            rng.shuffle(samples)
            epoch_loss = 0.0
            correct    = 0
            for state, target in samples:
                loss = self.train_step(state, target)
                epoch_loss += loss
                if self.predict_x(state) - 1 == target:
                    correct += 1
            avg = epoch_loss / len(samples)
            losses.append(avg)
            if verbose and epoch % 10 == 0:
                acc = correct / len(samples) * 100
                print(f"  epoch {epoch:3d}  loss={avg:.4f}  acc={acc:.1f}%")
        return losses
