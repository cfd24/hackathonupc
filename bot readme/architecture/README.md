# README.md — documentación de arquitectura para agentes

Este directorio existe para que cualquier agente de inteligencia artificial, o cualquier persona que no conozca el proyecto, pueda entender rápidamente cómo está organizado el código y cómo se conectan sus partes.

La documentación principal de arquitectura debe mantenerse en el archivo `OUTLINE.md`, que debe estar **siempre actualizado**.

## Objetivo de `OUTLINE.md`

`OUTLINE.md` debe servir como una guía clara, práctica y fiel al estado actual del proyecto. Su función es explicar la arquitectura de forma progresiva: primero la visión general del sistema y después el detalle de cada parte.

Debe estar redactado para que alguien sin contexto previo pueda leerlo y entender:

- qué hace el proyecto,
- cómo se relacionan sus módulos,
- dónde está cada responsabilidad,
- qué dependencias externas utiliza,
- y qué hace cada archivo importante.

## Contenido obligatorio de `OUTLINE.md`

### 1. Visión general al inicio

Al principio del documento debe haber un resumen corto del proyecto y de su arquitectura.

Esa sección debe incluir:

- una explicación breve de qué hace el proyecto,
- un esquema simple de cómo se conectan sus partes,
- y una visión rápida del flujo general del sistema.

La idea es que, en muy poco tiempo, el lector pueda entender cómo encaja todo.

### 2. Dependencias y librerías externas

Debe incluir una lista de las dependencias y librerías externas relevantes del proyecto.

Para cada una, explica:

- su nombre,
- para qué se usa,
- y qué papel cumple dentro del sistema.

No basta con enumerarlas. Hay que dejar claro por qué existen y dónde impactan en la arquitectura.

### 3. Estructura del proyecto

Después debe aparecer la estructura general del proyecto, reflejando las carpetas y archivos importantes.

Dado que la organización seguirá esta forma:

- `bot readme/`
  - `architecture/`
    - `OUTLINE.md`
    - `README.md`
  - `tasks/`
    - `README.md`
- `controllers/`
- `main/`
- `views/`
- `commands.txt`

`OUTLINE.md` debe explicar qué responsabilidad tiene cada carpeta principal y, cuando sea útil, también las subcarpetas y archivos más relevantes.

El objetivo no es solo mostrar nombres, sino explicar qué papel tiene cada zona del proyecto.

### 4. Explicación archivo por archivo

Para cada archivo de código relevante, `OUTLINE.md` debe incluir:

#### Resumen de alto nivel
Primero, una explicación breve en español de qué hace el archivo y cuál es su responsabilidad principal.

#### Explicación más detallada
Después, una explicación más precisa que describa, cuando aplique:

- funciones, clases o componentes importantes,
- flujo interno,
- relación con otros archivos,
- entradas y salidas relevantes,
- decisiones arquitectónicas importantes,
- y cualquier detalle útil para entender el comportamiento real del código.

El orden siempre debe ser:
1. resumen simple,
2. explicación más detallada.

## Cómo debe escribirse

La documentación debe ser:

- clara,
- directa,
- fácil de leer,
- útil para alguien sin contexto,
- y alineada con el estado real del proyecto.

Debe escribirse en español, salvo nombres de archivos, rutas, librerías, clases, funciones o términos técnicos que tenga sentido mantener en su formato original.

## Regla principal de mantenimiento

`OUTLINE.md` debe actualizarse **cada vez que cambie algo importante del proyecto**.

Por ejemplo, cuando:

- se añade o elimina una dependencia,
- se crea, mueve o borra una carpeta importante,
- se añade un archivo relevante,
- cambia la responsabilidad de un módulo,
- cambia el flujo entre partes del sistema,
- o se refactoriza la arquitectura.

No debe dejarse para más tarde. Si cambia el proyecto, también debe cambiar `OUTLINE.md` en la misma tarea.

## Prioridad: entender antes que resumir

La prioridad de este documento no es ser corto, sino ser útil.

Es preferible una explicación algo más larga pero clara, antes que una descripción demasiado breve que obligue a abrir muchos archivos para entender lo básico.

## Estado real del proyecto

La documentación debe reflejar cómo funciona el sistema realmente, no cómo debería funcionar idealmente.

Si hay partes incompletas, deuda técnica, comportamientos poco claros o zonas pendientes de refactorización, eso también debe indicarse de forma explícita.

## Finalidad de este directorio

Este directorio debe funcionar como punto de entrada documental para comprender el proyecto.

En particular:

- `bot readme/architecture/README.md` explica cómo debe mantenerse la documentación de arquitectura.
- `bot readme/architecture/OUTLINE.md` contiene la documentación viva y detallada de la arquitectura real del proyecto.
- `bot readme/tasks/README.md` podrá usarse para documentar reglas de trabajo o seguimiento de tareas, si aplica.

## Instrucción final

Si modificas el proyecto, revisa y actualiza `OUTLINE.md` antes de dar el trabajo por terminado.