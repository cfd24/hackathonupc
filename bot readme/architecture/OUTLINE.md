# OUTLINE — Arquitectura del proyecto

## Visión general

Sistema de gestión de almacén automatizado para el reto **HackUPC 2026 (Medieval — Hack the Flow)**.
El objetivo es minimizar el tiempo total de operación de los shuttles al almacenar y recuperar cajas. La aplicación está diseñada como un *sandbox* para poder programar, probar y comparar fácilmente diferentes algoritmos logísticos.

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
7. La caja se considera extraída cuando x=0.
8. Las cajas se agrupan en pallets y se consideran enviadas. Máximo de 8 pallets activos a la vez.

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

Actualmente, no hay dependencias externas. La simulación utiliza librerías nativas de Python (`sys`, `os`, `time`, `random`).

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
│   │   └── algorithms.py
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
- **Shuttle**: Un carro por nivel Y. Calcula el tiempo de viaje con la restricción `10 + |target - current|`.
- **Warehouse**: Gestiona el grid 3D (`grid`), hace validación de restricciones `Z`.

### `controllers/silo_simulator/simulator.py`
**Resumen de alto nivel:** Motor que orquesta la simulación usando un algoritmo intercambiable.

**Explicación detallada:** Carga un flujo de cajas (códigos de 20 dígitos), intenta almacenarlas usando el algoritmo provisto y gestiona la formación de pallets (comprobando el límite de 8 pallets activos). Al final, contabiliza el tiempo (`total_time = max(shuttles_time)`) y calcula las métricas de éxito (Total Time, Throughput, Full Pallets %).

### `controllers/algorithm/algorithms.py`
**Resumen de alto nivel:** Define la interfaz de los algoritmos y proporciona una implementación base `SimpleAlgorithm`.

**Explicación detallada:**
- **`BaseAlgorithm`**: Interfaz con `get_storage_location` y `get_retrieval_plan`.
- **`SimpleAlgorithm`**: Un algoritmo muy simple que coloca cajas en el primer hueco que encuentra (`x=1`, `y=1`...) y recupera pallets ciegamente cuando llega a 12 cajas, sin optimización de tiempos. Sirve como *baseline*.

### `main/main.py`
**Resumen de alto nivel:** Sandbox de prueba de rendimiento.

**Explicación detallada:**
Este script es el entorno de pruebas (*sandbox*). Genera un flujo de miles de cajas y las envía al simulador iterando sobre todos los algoritmos listados en `AVAILABLE_ALGORITHMS`. Finalmente, pinta una tabla con los resultados (tiempo, pallets enviados y throughput) de todos los algoritmos, permitiendo compararlos.
