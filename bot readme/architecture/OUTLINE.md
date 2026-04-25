# OUTLINE — Arquitectura del proyecto

## Visión general

Sistema de gestión de almacén automatizado para el reto **HackUPC 2026 (Medieval — Hack the Flow)**.
El objetivo es minimizar el tiempo total de operación de los shuttles al almacenar y recuperar cajas, y entrenar una red neuronal que aprenda a imitar (y mejorar) esas decisiones.

### Contexto de dominio

El sistema simula un centro logístico automatizado donde las cajas llegan desde zonas de clasificación y deben almacenarse dentro de un silo tridimensional. Más adelante, esas cajas deben recuperarse y agruparse en pallets completos según su destino.

El sistema trabaja con estos elementos principales:
`Cajas -> Silo -> Shuttles -> Pallets -> Salida`

#### Flujo general
1. Llegan cajas al sistema con un código único de 20 dígitos (origen, destino, lote).
2. El algoritmo decide dónde almacenar cada caja.
3. Los shuttles transportan las cajas hasta sus posiciones.
4. Cuando hay suficientes cajas del mismo destino (12 cajas), se reserva un pallet.
5. El algoritmo decide en qué orden recuperar las cajas, priorizando optimizar el tiempo.
6. Los shuttles extraen las cajas del silo.
7. Las cajas se agrupan en pallets y se consideran enviadas. Máximo de 8 pallets activos a la vez.

### Reglas de negocio importantes

#### Arquitectura física del silo
Cada posición está definida por cinco coordenadas: `(aisle, side, x, y, z)`.
- **Aisles**: 4
- **Sides**: 2
- **X**: 60 posiciones (longitudinal)
- **Y**: 8 niveles
- **Z**: 2 profundidades

#### Regla de profundidad Z
No se puede recuperar directamente una caja en `z=2` si delante de ella, en `z=1`, hay otra caja. Si una caja está bloqueada, primero hay que recolocar la caja bloqueante.

#### Shuttles
Existe un único shuttle por cada nivel `Y`, encargado tanto de la entrada como de la salida.
Tiempo de movimiento: `t = 10 + d` (donde 10s es el tiempo fijo de recoger/dejar y `d` es la distancia recorrida en `X`). Todos los shuttles empiezan en `x=0`.

## Dependencias externas

| Librería | Uso | Impacto |
|----------|-----|---------|
| `numpy`  | Álgebra lineal en la red neuronal (matrices W, b; forward/backward pass) | Solo necesaria para `neural.py` |

## Estructura del proyecto

La arquitectura usa un sistema de carpetas para separar responsabilidades lógicas y visuales:

```text
hackathonupc/
├── bot readme/
│   ├── architecture/
│   │   ├── OUTLINE.md       ← este archivo (arquitectura viva y central)
│   │   └── README.md        ← reglas de mantenimiento de la documentación
│   └── tasks/
│       └── <fechas>_task.md ← tareas activas de agentes
├── controllers/             ← Lógica de control, algoritmos y simulación del silo
│   ├── algorithm/
│   │   ├── algorithms.py
│   │   └── neural.py
│   └── silo_simulator/
│       ├── simulator.py
│       └── warehouse.py
├── main/                    ← Punto de entrada de la aplicación
│   └── main.py
├── views/                   ← Representación visual o interfaces (vacío actualmente)
└── requirements.txt         
```

## Explicación de cada archivo de código

### `controllers/silo_simulator/warehouse.py`
**Resumen de alto nivel:** Define todas las estructuras de datos del almacén y la lógica de bajo nivel (colocar/retirar cajas, consultar posiciones, calcular tiempos de shuttle).

**Explicación detallada:**
- **Position** / **Box**: Clases para coordenadas y datos de las cajas.
- **Shuttle**: Un carro por nivel Y. Calcula el tiempo de viaje con la restricción `10 + |target - current|`.
- **Warehouse**: Gestiona el grid 3D (`grid`), hace validación de restricciones `Z` y mantiene un lookup inverso de las posiciones de cada caja (`box_positions`).

### `controllers/silo_simulator/simulator.py`
**Resumen de alto nivel:** Motor que orquesta la simulación usando un algoritmo intercambiable.

**Explicación detallada:** Carga un flujo de cajas (códigos de 20 dígitos), intenta almacenarlas usando el algoritmo provisto y gestiona la formación de pallets (comprobando el límite de 8 pallets activos). Al final, imprime las métricas de éxito (Total Time, Throughput, Full Pallets %).

### `controllers/algorithm/algorithms.py`
**Resumen de alto nivel:** Implementa la estrategia greedy de almacenamiento/recuperación y genera datos de entrenamiento para la IA.

**Explicación detallada:**
- **`store_greedy`**: Mueve el shuttle con menor coste al slot X más cercano a 0.
- **`retrieve_greedy`**: Recupera caja relocalizando la caja en Z=1 si es necesario.
- **`collect_training_data`**: Genera vectores de estado de ocupación para alimentar a la red neuronal basándose en las decisiones greedy.

### `controllers/algorithm/neural.py`
**Resumen de alto nivel:** Red neuronal feedforward (con NumPy) entrenada por imitación sobre el algoritmo greedy.

**Explicación detallada:** Arquitectura de 3 capas (Input 121 -> ReLU 64 -> ReLU 32 -> Softmax 60). Aprende a predecir la mejor posición X para dejar la caja. Contiene backprop manual y optimización SGD (`train_step`, `fit`, `predict_x`).

### `main/main.py`
**Resumen de alto nivel:** Punto de entrada o script demo para comparar enfoques.

**Explicación detallada:** 
Orquesta dos fases:
1. Una simulación de almacenamiento y recuperación usando el algoritmo greedy.
2. La recolección de datos, entrenamiento de `WarehouseNet` durante 60 épocas, y una comparación del tiempo de operaciones entre la red neuronal y el greedy en un lote nuevo de cajas.

**Notas:**
La ubicación actual de dependencias puede requerir ajustar las rutas de importación (`controllers.warehouse` -> `controllers.silo_simulator.warehouse`, etc.).
