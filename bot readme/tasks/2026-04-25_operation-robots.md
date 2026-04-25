# Task ID: TASK-016
**Created Date:** 2026-04-25
**Last Modified:** 2026-04-25
**Current Agent:** Unassigned
**Task Type:** Feature

## Objetivo y Éxito

**Objetivo Principal:** Implementar el sistema de robots de paletización con 2 robots que pueden procesar hasta 8 pallets simultáneamente (4 cada uno).

**Criterios de Éxito:**
- Sistema de 2 robots con 4 slots de procesamiento cada uno
- Las cajas extraídas se agrupan por Destination
- Un pallet se forma con 12 cajas del mismo destino
- El pallet pasa a empaquetarse solo cuando hay un slot libre
- Tiempo de empaquetado configurable como input del programa
- Métricas actualizadas para reflejar el nuevo flujo

**Definición de Done:**
- [ ] Sistema de 2 robots implementado con 4 slots cada uno
- [ ] Lógica de formación de pallets por Destination
- [ ] Cola de espera cuando no hay slots libres
- [ ] Input de tiempo de empaquetado validado (entero >= 0)
- [ ] Estados claramente diferenciados: caja extraída, pallet listo, pallet en empaquetado, pallet enviado
- [ ] Métricas actualizadas: pallets esperando, en empaquetado, enviados, uso de robots, tiempo medio por pallet
- [ ] OUTLINE.md actualizado con la nueva arquitectura

## Análisis del Estado Actual

Actualmente en `simulator.py`:
- Los pallets se consideran enviados inmediatamente cuando se extrae la caja número 12
- No hay sistema de robots
- No hay tiempo de empaquetado
- El límite de 8 pallets activos se usa de forma diferente

## Requisitos de Implementación

### Configuración de Robots
- **Número de robots**: 2
- **Slots por robot**: 4
- **Máximo pallets simultáneos**: 8

### Estados de un Pallet
1. **Caja extraída**: La caja salió del silo (x=0)
2. **Pallet listo**: Hay 12 cajas extraídas del mismo Destination esperando robot
3. **Pallet en empaquetado**: Un robot está trabajando en él
4. **Pallet enviado**: El robot terminó el empaquetado

### Flujo de Procesamiento
```
1. Caja se extrae del silo (x=0)
2. Se agrupa por Destination en una cola de extracción
3. Cuando hay 12 cajas del mismo destino → pallet listo
4. Si hay slot libre en algún robot → pallet pasa a empaquetarse
5. Empaquetado tarda X segundos (configurable)
6. Cuando termina → pallet enviado
7. Si no hay slots → pallet espera en cola
```

### Input de Usuario
El programa debe pedir:
```
Introduce el tiempo de empaquetado por pallet en segundos:
```
Validación: debe ser un entero >= 0.

### Métricas a Añadir
- `pallets_waiting_robot`: Pallets listos esperando slot libre
- `pallets_packing`: Pallets actualmente en proceso de empaquetado
- `pallets_sent`: Pallets que finished el empaquetado
- `robot_utilization`: Porcentaje de uso de cada robot
- `avg_pallet_time`: Tiempo medio desde que se forma el pallet hasta que se envía

### Métricas a Modificar
- `total_pallets` ahora cuenta solo los pallets enviados (no los listos)

## Archivos a Modificar

### `main/main.py`
- Añadir input para tiempo de empaquetado
- Validar que sea entero >= 0
- Pasar el tiempo al simulador

### `controllers/silo_simulator/simulator.py`
- Implementar clase Robot con 4 slots
- Implementar sistema de colas por Destination
- Gestionar asignación de pallets a robots
- Calcular tiempo de empaquetado
- Actualizar métricas

### `controllers/silo_simulator/warehouse.py` (si es necesario)
- Añadir métodos辅助 si se necesitan

### `bot readme/architecture/OUTLINE.md`
- Actualizar sección de arquitectura física del silo
- Explicar el sistema de robots
- Documentar los estados de un pallet
- Documentar el tiempo configurable de empaquetado
- Actualizar las métricas del sistema

## Consideraciones de Arquitectura

- La lógica de robots debe estar en `simulator.py` ya que gestiona el flujo de simulación
- Los pallets en cola deben agruparse por Destination
- Cada robot debe trackear sus 4 slots independientes
- El tiempo de empaquetado debe ser un parámetro del simulador

## Criterios de Aceptación

1. ✅ Input de tiempo de empaquetado funciona y valida correctamente
2. ✅ 2 robots con 4 slots cada uno = máximo 8 pallets simultáneos
3. ✅ Pallets se forman con 12 cajas del mismo Destination
4. ✅ Pallets esperan en cola si no hay slots libres
5. ✅ El tiempo de empaquetado es configurable
6. ✅ Métricas reflejan el nuevo flujo (pallet enviado = empaquetado terminado)
7. ✅ OUTLINE.md documenta el nuevo sistema
8. ✅ No hay duplicación de responsabilidades