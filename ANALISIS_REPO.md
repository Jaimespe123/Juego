# Análisis técnico y vista previa — Car vs Zombies

## Vista previa actual
- El juego arranca con una interfaz moderna (HUD, menú principal, tienda, logros y ajustes) y un render 3D con Three.js.
- Se tomó una captura del estado actual para referencia visual.

## Diagnóstico rápido

### 1) Estado del gameplay (incompleto)
- El núcleo de movimiento del coche está implementado (`updateCar`, `updateCamera`), pero los sistemas de juego principales siguen en `placeholder`:
  - `updateZombies()`
  - `updatePowerups()`
- Esto deja la experiencia sin loop de progreso real (oleadas, riesgo/recompensa y escalado).

### 2) Desacople de UI vs lógica
- La `UIManager` tiene muchas responsabilidades (navegación de overlays, HUD, tienda, logros, mensajes, powerups).
- En `main.js`, el control de estado y la renderización 3D también cargan mucha responsabilidad.
- Hay riesgo de que futuras features rompan flujo por acoplamiento entre estado global y DOM.

### 3) Datos persistentes y evolución de schema
- `StorageManager` hace migraciones básicas, pero no existe versionado explícito de schema de guardado.
- A futuro, cualquier cambio grande de datos puede romper partidas guardadas.

### 4) Arquitectura de dependencias Three.js
- El proyecto mezcla import map de `three` con carga UMD por `<script src=...three.min.js>` y luego usa `THREE` global.
- Funciona, pero complica mantenimiento y debugging (dos estilos de consumo en paralelo).

### 5) Calidad y observabilidad
- No hay tests automatizados ni linting visible.
- No hay métricas de frame time, spawn rate, colisiones o errores (más allá de logs/alert).

---

## Mejoras recomendadas (priorizadas)

## P0 — Imprescindible para jugabilidad
1. **Implementar sistema de zombies completo**
   - Spawn por oleadas (curvas por tiempo + dificultad).
   - Comportamiento base (persecución/offset lateral).
   - Detección de colisión coche-zombie y zombie-jugador.
   - Recompensas: puntos, monedas, combo, multiplicadores.

2. **Implementar sistema de powerups**
   - Spawn probabilístico con cooldown global.
   - Pick-up por proximidad.
   - Aplicación/expiración por duración y limpieza en `resetGame`.
   - Integración con HUD de activos.

3. **Balance de progresión**
   - Definir una función de dificultad por oleada (vida/velocidad/cantidad).
   - Revisar economía de tienda vs ritmo de monedas.

## P1 — Estabilidad y mantenibilidad
4. **Separar sistemas en módulos de dominio**
   - `systems/carSystem.js`
   - `systems/zombieSystem.js`
   - `systems/powerupSystem.js`
   - `systems/combatSystem.js`
   - `systems/audioSystem.js`

5. **Introducir un pequeño Event Bus o Store**
   - Evitar llamadas cruzadas directas entre UI y lógica de juego.
   - Ejemplos de eventos: `GAME_STARTED`, `ZOMBIE_KILLED`, `PLAYER_DAMAGED`, `POWERUP_PICKED`.

6. **Versionado de datos guardados**
   - Añadir `saveVersion` y migraciones por versión.
   - Validar payload antes de persistir.

## P2 — Calidad técnica / DX
7. **Unificar estrategia de Three.js**
   - O todo por ESM (`import * as THREE from 'three'`) o todo global UMD.
   - Recomendación: ESM completo para coherencia con la base modular actual.

8. **Agregar lint + formato + checks mínimos**
   - ESLint + Prettier.
   - Script de validación en CI (al menos `lint` y `type-check` con JSDoc/TS gradual).

9. **Tests de lógica pura**
   - Unit tests para:
     - cálculo de spawn,
     - escalado de dificultad,
     - fórmulas de daño/recompensa,
     - migración de storage.

## P3 — Producto/UX
10. **Mejorar accesibilidad y UX de overlays**
   - Trampa de foco en modales.
   - Cierre por `Esc`.
   - Etiquetas ARIA consistentes para estados dinámicos.

11. **Observabilidad de rendimiento**
   - Métrica de `delta` promedio y picos.
   - Contador de entidades activas y colisiones por minuto.

---

## Plan sugerido en 2 sprints

### Sprint 1 (gameplay funcional)
- Zombie system + colisiones + damage loop.
- Powerups funcionales con duraciones.
- Ajuste mínimo de economía.

### Sprint 2 (arquitectura y calidad)
- Refactor por sistemas + bus de eventos.
- Versionado de guardado.
- Linting + tests de lógica + hardening de UI.
