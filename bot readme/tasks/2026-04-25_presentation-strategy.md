---
name: "Presentation Strategy & Final Algorithms"
status: "Completed"
---

# Estrategia de Presentación y Resultados de Algoritmos

## Resumen del Trabajo
Hemos integrado los cambios de los compañeros (que incluyeron una generación dinámica del sandbox y tiempos de empaquetado de robots) con nuestros algoritmos experimentales y la métrica crítica de bloqueos.

### Métrica Clave: Z-Blocks (Relocations)
Descubrimos que en una simulación de **operación continua** (miles de cajas entrando y saliendo sin pausa), los algoritmos "ingenuos" como el Simple Baseline sufren cuellos de botella severos debido a los `Z-Blocks`. 

Un `Z-Block` ocurre cuando un shuttle necesita acceder a una caja guardada en profundidad 2 (`Z=2`), pero la posición de delante (`Z=1`) está ocupada por una caja que no pertenece al mismo destino. Esto obliga al shuttle a coger la caja de delante, moverla temporalmente a otro hueco, volver, y coger la caja objetivo, duplicando o triplicando el tiempo de operación.

### Algoritmos en el Sandbox (Benchmark 5)
1. **Simple Baseline**: Guarda la caja en el primer hueco que encuentra (X mínimo). Es muy rápido en almacenes vacíos, pero genera cientos de Z-Blocks a largo plazo.
2. **Distance Greedy**: Optimizado por los compañeros, busca el slot vacío más cercano a la posición actual del shuttle.
3. **Column Grouping**: Creado por los compañeros. Asigna columnas completas (todas las Y para un mismo X) a un solo destino. Reduce los bloqueos Z ordenando inteligentemente la recogida.
4. **Destination Zones**: Nuestro algoritmo que asigna bandas de 'X' exclusivas a cada destino, previniendo que cajas de destinos distintos compartan la misma coordenada Z.
5. **Maturity First**: Nuestro algoritmo híbrido que evalúa si un destino está cerca de formar un palé (>=8 cajas) para asignarle prioridad VIP (X bajos).

## Consejo para el Pitch Final
1. Enseñar en vivo el terminal del sandbox.
2. Explicar cómo el primer algoritmo que hicisteis (Simple) se atascaba moviendo cajas estorbo (Z-Blocks).
3. Mostrar cómo la evolución natural de la ingeniería os llevó a separar cajas por destino, creando algoritmos como *Column Grouping* y *Destination Zones* que sacrifican un poco de distancia de viaje (tiempo X) para eliminar la fragmentación y la necesidad de apartar cajas de delante.

## Siguientes Pasos
- El repositorio está fusionado y limpio en `main`.
- Cualquier Agente IA puede continuar desde este punto leyendo el `main.py` y añadiendo nuevos algoritmos híbridos a la lista `AVAILABLE_ALGORITHMS`.
