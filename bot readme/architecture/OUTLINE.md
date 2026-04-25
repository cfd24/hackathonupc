# OUTLINE.md

## Visión general

Simulador de silo logístico automatizado desarrollado para HackUPC 2026.
El sistema gestiona el almacenamiento y movimiento de cajas dentro de un
silo 3D mediante shuttles automatizados, con el objetivo de minimizar el
tiempo total de operación y maximizar el throughput de palés.

## Arquitectura general

Entrada de cajas → Algoritmo de asignación → Silo (grid 3D)
                                                     ↓
                                              Shuttles (1 por nivel Y)
                                                     ↓
                          Algoritmo de salida → Formación de palés → Envío

## Stack

- Python 3.x
- Sin dependencias externas por ahora

## Estructura del proyecto

bot readme/
├── architecture/
│   ├── OUTLINE.md       ← este archivo, documentación viva de arquitectura
│   └── README.md        ← reglas de cómo mantener OUTLINE.md
└── tasks/
    └── README.md        ← plantilla y reglas para task files

silo_simulator/
├── warehouse.py         ← estructura de datos del silo 3D
├── algorithms.py        ← algoritmos de entrada/salida (intercambiables)
└── simulator.py         ← loop principal de simulación y métricas

## Specs del silo

| Dimensión | Valor         |
|-----------|---------------|
| Pasillos  | 4 (1–4)       |
| Lados     | 2 (1–2)       |
| X         | 60 (1–60)     |
| Y         | 8 (1–8)       |
| Z         | 2 (1–2)       |

- Un shuttle por nivel Y, arranca en X=0
- Tiempo de movimiento: t = 10 + distancia_en_X
- Palé = 12 cajas con mismo destino
- Máximo 8 palés activos simultáneamente

## Formato del código de caja (20 dígitos)

SSSSSSS DDDDDDDD BBBBB
- S: Source (7 dígitos)
- D: Destination (8 dígitos)  
- B: Bulk (5 dígitos)

## Estado actual

🔄 En construcción — primera sesión de hackathon.
- silo_simulator/warehouse.py: base implementada
- silo_simulator/simulator.py: loop de simulación funcional
- silo_simulator/algorithms.py: algoritmo simple implementado