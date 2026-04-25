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

#### Sistema de Robots de Paletización
El sistema incluye **2 robots** de paletización, cada uno con **4 slots de procesamiento**, permitiendo un máximo de **8 pallets simultáneos** en empaquetado.

**Estados de un pallet:**
1. **Caja extraída**: La caja salió del silo (x=0)
2. **Pallet listo**: Hay 12 cajas extraídas del mismo Destination esperando robot
3. **Pallet en empaquetado**: Un robot está trabajando en él
4. **Pallet enviado**: El robot terminó el empaquetado

**Flujo de procesamiento:**
1. Las cajas se extraen del silo
2. Las cajas extraídas se agrupan por Destination
3. Cuando hay 12 cajas del mismo destino → pallet listo
4. Si hay slot libre en algún robot → pallet pasa a empaquetarse
5. El empaquetado tarda X segundos (configurable como input)
6. Cuando termina → pallet enviado
7. Si no hay slots → pallet espera en cola

**Tiempo de empaquetado:**
- Configurable como input al ejecutar el programa
- Debe ser un entero >= 0
- Ejemplo: `Introduce el tiempo de empaquetado por pallet en segundos:`

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
- **Warehouse**: Gestiona el grid 3D (`grid`), hace validación de restricciones `Z` y acumula el tiempo de movimiento de los shuttles tanto al almacenar como al recuperar cajas.

### `controllers/silo_simulator/simulator.py`
**Resumen de alto nivel:** Motor que orquesta la simulación usando un algoritmo intercambiable, incluyendo el sistema de robots de paletización.

**Explicación detallada:** 
- Carga un flujo de cajas (códigos de 20 dígitos), intenta almacenarlas usando el algoritmo provisto
- Gestiona la extracción de cajas y formación de pallets (12 cajas del mismo Destination)
- **Sistema de Robots**: 
  - 2 robots con 4 slots cada uno (clase `Robot`)
  - Asigna pallets a slots libres cuando disponibles
  - Procesa el empaquetado con tiempo configurable
- **Gestión de estados**: 
  - `extracted_boxes`: Cajas extraídas esperando formar pallet
  - `ready_pallets`: Pallets listos (12 cajas) esperando robot
  - `packing_pallets`: Pallets en proceso de empaquetado
  - `sent_pallets`: Pallets que finished el empaquetado
- Al final, contabiliza el tiempo total como el máximo entre los shuttles, el reloj global y la última finalización de robot, y calcula las métricas de éxito

**Métricas del sistema:**
- `boxes_processed`: Cajas almacenadas
- `pallets_waiting_count`: Pallets listos esperando slot libre
- `pallets_packing_count`: Pallets en proceso de empaquetado
- `sent_pallets`: Pallets enviados (empaquetado terminado)
- `robot_utilization`: Porcentaje de uso de los robots
- `avg_send_time`: Tiempo medio desde pallet listo hasta enviado

### `controllers/algorithm/algorithms.py`
**Resumen de alto nivel:** Define la interfaz de los algoritmos y proporciona varias implementaciones estratégicas.

**Explicación detallada:**
- **`BaseAlgorithm`**: Interfaz con `get_storage_location` y `get_retrieval_plan`.
- **`SimpleAlgorithm`**: Coloca cajas secuencialmente en el primer hueco disponible y recupera pallets ciegamente. Sirve como *baseline*.
- **`DistanceGreedyAlgorithm`**: Optimiza la colocación inmediata buscando la celda más cercana al robot actual para minimizar tiempo de guardado, aunque genera desorden a largo plazo.
- **`ColumnGroupingAlgorithm`**: Estrategia de alto rendimiento que asigna columnas verticales enteras a destinos específicos. Esto paraleliza masivamente la recuperación de pallets entre varios shuttles y elimina las penalizaciones de la regla de profundidad (Z).
- **`VelocityColumnAlgorithm`**: Mejora sobre `ColumnGroupingAlgorithm` que aprende dinámicamente la velocidad (frecuencia) de los destinos. Asigna las columnas más cercanas a la puerta (X=1) a los destinos más frecuentes (Fast) y las columnas del fondo (X=60) a los destinos menos frecuentes (Slow).
- **`VelocitySimpleAlgorithm`**: Aplica la estrategia dinámica de velocidad (Fast=X=1, Slow=X=60) a la lógica de guardado de `SimpleAlgorithm`.
- **`ZSafeSimpleAlgorithm`**: Mejora sobre `SimpleAlgorithm` que impone compatibilidad de destino en la profundidad Z. Nunca coloca una caja en Z=2 si la caja en Z=1 pertenece a un destino diferente. Esto elimina completamente las penalizaciones por reubicación Z durante la recuperación. La lógica de recuperación ordena por Z ascendente (Z=1 antes que Z=2) para garantizar cero bloqueos.
- **`ZSafeProAlgorithm`**: Versión optimizada de `ZSafeSimpleAlgorithm` con tres mejoras: (1) almacenamiento en dos pasadas — primero busca Z=2 donde Z=1 ya coincide con el destino (empaquetado denso), luego Z=1 vacíos; (2) recuperación inteligente — elige el destino con la X media más baja (más cercano a la puerta); (3) selección de cajas por pares Z=1+Z=2 del mismo slot para evitar dejar cajas Z=2 huérfanas.
- **`ZSafeWeightedAlgorithm`**: Variante Z-safe que aprende online la frecuencia de cada destino. Los destinos con mayor peso observado (`cajas_del_destino / cajas_totales_observadas`) buscan huecos cerca de X=1; los menos frecuentes reciben un retroceso suave y configurable (`max_weighted_backoff`, por defecto 1) que aumenta con la ocupación del almacén. Con `max_weighted_backoff=0`, se comporta como `ZSafeSimpleAlgorithm`.
- **`ZSafeWeightedProAlgorithm`**: Combina el almacenamiento ponderado por frecuencia de `ZSafeWeightedAlgorithm` con el plan de recuperación inteligente de `ZSafeProAlgorithm`: selecciona el destino con menor X media, prioriza pares Z=1+Z=2 completos y ordena por Z ascendente.

### `main/main.py`
**Resumen de alto nivel:** Sandbox de prueba de rendimiento.

**Explicación detallada:**
Este script es el entorno de pruebas (*sandbox*). 
- Genera flujos de miles de cajas y las envía al simulador iterando sobre todos los algoritmos listados en `AVAILABLE_ALGORITHMS`.
- **Benchmarking de Capacidad:** Ejecuta cada algoritmo en 4 escenarios distintos: con el almacén vacío (0%), y pre-llenado al 25%, 50% y 75% de su capacidad. Esto permite medir cómo se degradan los algoritmos cuando el espacio es limitado.
- **Pide el tiempo de empaquetado** como input al usuario (validando que sea entero >= 0).
- **Pide el número de destinos** y genera pesos aleatorios para repartir las cajas entre esos destinos.
- El flujo de cajas es no determinista por defecto: cada ejecución crea pesos y códigos nuevos, pero los mismos flujos se usan para todos los algoritmos en una misma ejecución para garantizar una comparativa justa.
- Pasa el tiempo de empaquetado al simulador.
- Finalmente, pinta una tabla con los resultados (tiempo, pallets enviados y throughput) de todos los algoritmos en cada nivel de capacidad, permitiendo compararlos.
