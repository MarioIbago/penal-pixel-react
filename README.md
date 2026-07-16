# Penal Pixel ⚽

¡Bienvenido a Penal Pixel! Un minijuego web de penales infinitos creado con React, TypeScript y HTML5 Canvas 2D. 

Este proyecto está diseñado con una arquitectura modular y limpia, separando la lógica del juego (motor, físicas, IA) de la vista (React y Canvas).

## 🚀 Arquitectura del Proyecto

El código fuente está estructurado de la siguiente manera:

- `src/game/` - Contiene toda la lógica agnóstica de la interfaz.
  - `core/` - Motor del juego (`GameEngine.ts`), tipos y simulador.
  - `physics/` - Lógica de físicas del balón y trayectorias.
  - `goalkeeper/` - Inteligencia Artificial del portero y cálculo de zonas.
  - `collision/` - Detección de colisiones (gol, poste, atajada, fuera).
  - `rendering/` - Renderizador basado en HTML5 Canvas (`CanvasRenderer.ts`).
  - `scoring/` - Sistema de puntuación y rachas persistido en `localStorage`.
  - `audio/` - Efectos de sonido retro.
- `src/components/` - Componentes de interfaz de usuario de React (HUD, Menús, Canvas wrapper).

## 🎮 Cómo Jugar

Haz clic o toca cualquier punto de la portería o sus alrededores para disparar. También puedes mover la mira con las flechas del teclado y chutar con Enter o Espacio.

## 🛠️ Ejecutar el proyecto

```bash
npm install
npm run dev
```

## ✅ Verificar código

```bash
# Compilar proyecto
npm run build

# Correr pruebas unitarias (Vitest)
npm run test

# Linting
npm run lint
```

## 🧩 Integración en otras aplicaciones (Ej. App de Matemáticas)

Este juego fue diseñado para poder ser utilizado como una recompensa visual (minijuego) dentro de otras aplicaciones. 

Para integrar este motor dentro de otra aplicación (como una app de problemas matemáticos), sigue estas directrices:

1. **Assets**: Copia la carpeta `public/assets/` y `public/audio/` a tu nuevo proyecto.
2. **Dependencias**: Asegúrate de tener instalados `lucide-react` y `motion`.
3. **Modificación del Motor**: Puedes modificar `GameEngine.ts` para que reciba un parámetro de "resultado" del problema matemático. Si el jugador se equivocó en el problema, puedes pasarle ese dato a la IA del portero (`KeeperAI.ts`) forzando a que ataje el balón de forma automática y con tiempo de reacción `0`.
4. **Persistencia Local**: El progreso y los resultados matemáticos deben guardarse en `localStorage` al igual que la racha del juego actual (revisar `src/game/scoring/storage.ts` y `src/hooks/useScore.ts`). No se requiere Backend ni llamadas a bases de datos.

Puedes encontrar un prompt detallado para la integración en `docs/math_integration_prompt.md`.
