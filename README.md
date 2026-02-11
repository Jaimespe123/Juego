# 🚗 Car vs Zombies - Versión Modular (ES6 Modules)

## 📦 Estructura del Proyecto

Tu juego ha sido adaptado a **módulos JavaScript (ESM)** para mejor organización y mantenibilidad.

### Archivos Principales

```
├── index.html          # HTML principal (usa type="module")
├── styles.css          # Estilos CSS
├── config.js           # ⚙️ Configuraciones y constantes
├── storage.js          # 💾 Gestión de localStorage
├── ui.js              # 🎨 Manejo de interfaz de usuario
└── main.js            # 🎮 Punto de entrada principal
```

## 🎯 ¿Qué es JSM (JavaScript Modules)?

Los **módulos ES6 (ESM)** permiten:
- ✅ Dividir el código en archivos separados
- ✅ Importar/exportar funcionalidades entre archivos
- ✅ Mejor organización y mantenibilidad
- ✅ Evitar colisiones de nombres globales
- ✅ Cargar código solo cuando se necesita

## 📚 Descripción de Cada Módulo

### 1. `config.js` - Configuración
Contiene todas las constantes del juego:
- **CONFIG**: Parámetros de física y gameplay
- **ZOMBIE_TYPES**: Tipos de zombies
- **ACHIEVEMENTS**: Logros disponibles
- **POWERUP_TYPES**: Power-ups
- **SHOP_COLORS**: Colores de coches
- **UPGRADES**: Mejoras disponibles

```javascript
import { CONFIG, ZOMBIE_TYPES } from './config.js';
```

### 2. `storage.js` - Almacenamiento
Clase `StorageManager` que maneja:
- Datos del jugador (monedas, puntuación, etc.)
- Logros desbloqueados
- Progreso de mejoras
- Guardar/cargar desde localStorage

```javascript
import { StorageManager } from './storage.js';
const storage = new StorageManager();
```

### 3. `ui.js` - Interfaz de Usuario
Clase `UIManager` que gestiona:
- Menús (principal, tienda, game over, etc.)
- HUD (puntuación, vida, velocidad)
- Mensajes en pantalla
- Renderizado de elementos visuales

```javascript
import { UIManager } from './ui.js';
const ui = new UIManager(storage);
```

### 4. `main.js` - Lógica Principal
Punto de entrada que:
- Inicializa Three.js
- Controla el loop del juego
- Maneja física del coche
- Coordina todos los módulos

```javascript
// Se carga automáticamente desde index.html
<script type="module" src="main.js"></script>
```

## 🔄 Diferencias con la Versión Original

### ❌ Antes (Sin Módulos)
```javascript
// Todo en un solo archivo app.js dentro de un IIFE
(function() {
  'use strict';
  const CONFIG = { ... };
  // 2000+ líneas de código...
})();
```

### ✅ Ahora (Con Módulos)
```javascript
// config.js
export const CONFIG = { ... };

// main.js
import { CONFIG } from './config.js';
```

## 🚀 Cómo Ejecutar

### Opción 1: Servidor Local (Recomendado)
Los módulos ES6 requieren un servidor web:

```bash
# Con Python 3
python -m http.server 8000

# Con Node.js
npx serve
```

Luego abre: `http://localhost:8000`

### Opción 2: Live Server (VS Code)
1. Instala la extensión "Live Server"
2. Click derecho en `index.html` → "Open with Live Server"

### ⚠️ No Funciona
- Abrir directamente `index.html` desde el sistema de archivos
- Los módulos necesitan el protocolo `http://` o `https://`

## 🔧 Modificar el Código

### Añadir un Nuevo Tipo de Zombie
```javascript
// config.js
export const ZOMBIE_TYPES = {
  // ... existentes
  NINJA: {
    name: "Ninja",
    color: 0x000000,
    speed: 2.5,
    health: 1,
    damage: 20,
    points: 60,
    coins: 6,
    size: 0.7,
    emoji: "🥷"
  }
};
```

### Añadir una Nueva Función
```javascript
// Crear nuevo archivo utils.js
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Importar en main.js
import { randomRange } from './utils.js';
```

## 📝 Ventajas de Esta Estructura

1. **Código Organizado**: Cada archivo tiene una responsabilidad clara
2. **Fácil de Mantener**: Cambios localizados en archivos específicos
3. **Reutilizable**: Los módulos se pueden importar donde se necesiten
4. **Escalable**: Fácil añadir nuevos módulos
5. **Debugging**: Más fácil encontrar y corregir errores

## 🎓 Aprender Más

- [MDN - Módulos JavaScript](https://developer.mozilla.org/es/docs/Web/JavaScript/Guide/Modules)
- [Import/Export](https://javascript.info/import-export)
- [ES6 Features](https://es6-features.org/)

## 🐛 Solución de Problemas

### Error: "Cannot use import statement outside a module"
✅ Asegúrate de usar `<script type="module" src="main.js"></script>`

### Error: "CORS policy"
✅ Usa un servidor local, no abras el archivo directamente

### Three.js no funciona
✅ Verifica que los scripts de Three.js se carguen antes de main.js
✅ Considera usar la versión modular de Three.js con import maps

## 📦 Próximos Pasos

Para una estructura aún más modular, podrías crear:
- `physics.js` - Sistema de física
- `zombies.js` - Lógica de zombies
- `powerups.js` - Sistema de power-ups
- `audio.js` - Sistema de audio
- `renderer.js` - Configuración de Three.js

---

¡Disfruta programando! 🎮
