# OUTLINE — Arquitectura del proyecto

## Visión general

Sistema de gestión de almacén automatizado para el reto **HackUPC 2026 (Medieval — Hack the Flow)**.
El objetivo es minimizar el tiempo total de operación de los shuttles al almacenar y recuperar cajas,
y entrenar una red neuronal que aprenda a imitar (y mejorar) esas decisiones.

```
Cajas entrantes
     │
     ▼
algorithms.py ──store_greedy──► Warehouse (grid 3D)
     │                               │
     │  recoge datos (estado, acción)│
     ▼                               ▼
neural.py ──train──► WarehouseNet   shuttles (uno por nivel Y)
     │
     ▼
main.py (demo: greedy → NN → comparación)
```

Flujo general:
1. Se crean cajas con código de 20 dígitos.
2. El algoritmo greedy elige el nivel Y y la posición X más cercana a la cabeza (X=0).
3. El shuttle del nivel correspondiente se desplaza: cabeza → slot (deposita la caja).
4. Para recuperar: shuttle → slot (recoge) → cabeza; con relocalización si Z=1 bloquea Z=2.
5. Los datos (estado del shuttle + ocupación del almacén, decisión tomada) alimentan la red neuronal.
6. La red aprende a predecir la mejor posición X dada la situación actual del shuttle.

---

## Dependencias externas

| Librería | Uso | Impacto |
|----------|-----|---------|
| `numpy`  | Álgebra lineal en la red neuronal (matrices W, b; forward/backward pass) | Solo necesaria para `neural.py` |

La simulación del almacén (`warehouse.py`, `algorithms.py`) es stdlib puro de Python.

---

## Estructura del proyecto

```
hackathonupc/
├── bot readme/
│   ├── architecture/
│   │   ├── OUTLINE.md       ← este archivo (arquitectura viva)
│   │   └── README.md        ← reglas de mantenimiento de la documentación
│   └── tasks/
│       └── README.md        ← plantilla para ficheros de tarea
├── warehouse.py             ← modelos de datos y clase Warehouse
├── algorithms.py            ← algoritmos greedy + recolección de datos
├── neural.py                ← red neuronal feedforward (NumPy)
├── main.py                  ← punto de entrada / demo
└── requirements.txt         ← numpy>=1.24
```

---

## Archivos de código

### `warehouse.py`

**Qué hace:** Define todas las estructuras de datos del almacén y la lógica de bajo nivel
(colocar/retirar cajas, consultar posiciones libres, calcular tiempos de shuttle).

**Detalle:**

- **`Position` (dataclass frozen):** coordenada de 5 dimensiones `(aisle, side, x, y, z)`.
  Convertible a string de 11 dígitos `AA_SS_XXX_YY_ZZ`. Hashable, usada como clave de dict.

- **`Box` (dataclass):** código de 20 dígitos; propiedades `source`, `destination`, `bulk`.

- **`Shuttle`:** un carro por nivel Y. Comienza en `x=0`.
  Método `travel(target_x)` calcula y acumula `HANDLING_TIME + |current - target|`.

- **`Warehouse`:** almacén principal.
  - `grid: Dict[Position, Box]` — almacenamiento disperso.
  - `box_positions: Dict[str, Position]` — lookup inverso por código de caja.
  - `shuttles: Dict[int, Shuttle]` — un shuttle por cada Y de 1 a 8.
  - `place(box, pos)` — valida restricción Z (no se puede poner en z=2 si z=1 está vacío).
  - `remove(pos)` — extrae caja del grid.
  - `free_positions(y)` — lista de posiciones legales en nivel Y.
  - `occupancy_vector(y, aisle, side)` — vector binario de 120 elementos (entrada de la red neuronal).

**Constantes:** `AISLES=4, SIDES=2, X_MAX=60, Y_MAX=8, Z_MAX=2, HANDLING_TIME=10`

---

### `algorithms.py`

**Qué hace:** Implementa la estrategia greedy de almacenamiento y recuperación,
y genera los datos de entrenamiento para la red neuronal.

**Detalle:**

- **`store_greedy(warehouse, box)`:**
  1. Selecciona el nivel Y cuyo shuttle tiene menor coste estimado (`shuttle.x + nearest_free_x`).
  2. Dentro de ese Y, elige el slot con X más cercano a 0.
  3. Mueve el shuttle: 0 (recogida) → slot.x (depósito).
  Devuelve `(Position, tiempo)`.

- **`retrieve_greedy(warehouse, box_code)`:**
  1. Localiza la caja vía `box_positions`.
  2. Si está en `z=2` y `z=1` está ocupado, relocaliza la caja de `z=1` al slot libre más cercano.
  3. Mueve el shuttle: box.x (recogida) → 0 (entrega a la salida).
  Devuelve `(Box, tiempo)`.

- **`collect_training_data(num_boxes, seed)`:**
  Ejecuta la simulación greedy y captura, por cada almacenamiento:
  - estado: `[shuttle_x / X_MAX, *occupancy_vector(y)]` → vector de 121 floats.
  - acción: `pos.x - 1` (índice 0-based de la posición X elegida).
  Devuelve lista de tuplas `(state, target_x_index)` para entrenar la red.

---

### `neural.py`

**Qué hace:** Red neuronal feedforward de 3 capas entrenada por imitación (imitation learning)
sobre las decisiones del algoritmo greedy.

**Arquitectura:**

```
Entrada (121)  →  Capa 1 ReLU (64)  →  Capa 2 ReLU (32)  →  Salida Softmax (60)
[shuttle_x_norm, occupancy×120]                              [probabilidad sobre X=1..60]
```

**Detalle de `WarehouseNet`:**

- Inicialización He (`sqrt(2/fan_in)`) para evitar gradientes que desaparecen.
- `_forward(x)` → devuelve `(probs, cache)` con activaciones intermedias para backprop.
- `_backward(cache, target)` → backprop manual con regla de la cadena; gradientes aplicados con SGD.
- `train_step(state, target_x_index)` → un paso SGD; devuelve la pérdida cross-entropy.
- `fit(samples, epochs, verbose)` → bucle de entrenamiento sobre los pares greedy;
  imprime pérdida y accuracy cada 10 épocas.
- `predict_x(state)` → devuelve el índice X predicho (1-based).

**Limitación conocida:** el vector de ocupación solo cubre `aisle=1, side=1`.
La red aprende el patrón de llenado del pasillo 1; los demás pasillos se gestionan por greedy.
Extensión natural: ampliar el vector de estado a todos los pasillos.

---

### `main.py`

**Qué hace:** Punto de entrada que orquesta las dos fases y muestra los resultados.

**Fase 1 (greedy demo):**
- Almacena 100 cajas mostrando posición y tiempo de cada una.
- Recupera 20 cajas aleatorias.
- Imprime resumen de tiempos acumulados por shuttle.

**Fase 2 (NN demo):**
- Llama a `collect_training_data(300)` para generar muestras.
- Entrena `WarehouseNet` durante 60 épocas.
- Compara el tiempo total de almacenaje (50 cajas) entre greedy y NN.

---

## Flujo de datos resumido

```
make_box()
    │
    ▼
store_greedy()  ──────────────────────────────────► Warehouse.place()
    │                                                      │
    │ captura (state, pos.x-1)                             │
    ▼                                                      ▼
collect_training_data()                            Shuttle.travel()
    │
    ▼
WarehouseNet.fit()
    │
    ▼
WarehouseNet.predict_x()  →  Warehouse.place()  →  comparar tiempos
```

---

## Estado actual

- Implementación base completada: almacenamiento, recuperación, red neuronal.
- La red aprende a imitar al greedy; la comparación de tiempos valida la aproximación.
- Pendiente: extender vector de estado a todos los pasillos, añadir gestión de pallets
  (12 cajas × destino, 8 pallets simultáneos), y optimizar selección de nivel Y en la red.
