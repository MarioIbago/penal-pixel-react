# Prompt para la IA: Integración de Juego de Penales en App de Matemáticas

Actúa como un desarrollador experto en React y TypeScript. Tu tarea es integrar un motor de juego de penales (Penalty Shootout) basado en HTML5 Canvas dentro de una aplicación de matemáticas existente. 

## Reglas del Negocio y Mecánicas
1. **Recompensa por respuesta:** El juego de penales es un "extra". El usuario resuelve un problema matemático y, dependiendo del resultado, tiene derecho a un tiro.
2. **Respuesta Correcta:** Si el usuario responde bien, gana un tiro libre normal donde tiene probabilidad de anotar (juego normal).
3. **Respuesta Incorrecta:** Si responde mal, el usuario también tira, pero el portero DEBE atajar el balón obligatoriamente.
4. **Persistencia Local:** Todo el progreso de los problemas matemáticos, la racha de goles y el puntaje máximo deben guardarse única y exclusivamente en `localStorage`. Nunca se debe resetear el progreso sin que el usuario lo pida explícitamente.
5. **Sin Backend:** NO debes hacer llamadas a Firebase, NO agregar bases de datos y NO crear funciones API (`/api/*`). Todo debe ser 100% del lado del cliente (Client-side SPA).

## Pasos de Implementación y Referencias al Código

Para lograr esto, debes unir la lógica de la App de Matemáticas con los siguientes archivos del código del juego de penales que te estaré proporcionando:

### 1. Modificación de Dependencias (`package.json`)
Asegúrate de agregar las siguientes librerías al `package.json` de la app de matemáticas, ya que el motor del juego de penales las necesita:
- `lucide-react` (para iconos de la interfaz)
- `motion` (para las animaciones de la interfaz)
*No instales Firebase ni dependencias de backend.*

### 2. Traslado de Assets
Debes copiar todo el contenido de las carpetas `public/assets/` y `public/audio/` del código original del juego a la carpeta `public/` de la aplicación de matemáticas.

### 3. Modificaciones en el Motor del Juego

- **`src/game/core/GameEngine.ts`**:
  Modifica el método que ejecuta el tiro, probablemente `engine.kick(targetX, targetY)`. Añade un parámetro que indique el resultado del problema matemático: `engine.kick(targetX, targetY, forcedSave: boolean)`. Guarda este flag temporalmente en el estado del motor para pasarlo a la IA del portero.

- **`src/game/goalkeeper/KeeperAI.ts`**:
  Este archivo maneja la inteligencia del portero (que actualmente adivina entre 9 zonas). Modifica la función `createKeeperPlan` para que reciba el flag `forcedSave`. 
  - Si `forcedSave === true` (el usuario falló en matemáticas), el portero debe adivinar la zona exacta a la fuerza (`guessedZone = actualZone`) y su tiempo de reacción (`reactionDelay`) debe ser extremadamente bajo o `0` para garantizar que ataje la pelota y vuele hacia donde va el balón.

- **`src/components/GameScreen.tsx`**:
  Este es el componente de React que renderiza el canvas. Envuélvelo en tu UI de Matemáticas. El flujo debe ser:
  1. Mostrar el problema matemático.
  2. El usuario responde (se guarda el resultado correcto/incorrecto en un estado de React).
  3. Se oculta el problema y se muestra el `GameScreen` indicando que puede patear.
  4. El usuario patea.
  5. Se dispara el evento `onOutcome` (ubicado en `src/game/core/types.ts`).
  6. Al terminar la animación, se oculta la cancha y vuelve a aparecer el siguiente problema.

- **`src/hooks/useScore.ts`**:
  El juego ya usa este hook para guardar la racha (`streak`) y el mejor puntaje (`bestScore`) en el `localStorage`. Expándelo o crea un hook similar (ej. `useMathProgress`) para persistir qué problemas se han resuelto y el nivel actual usando `localStorage`.

### Instrucciones Finales para la IA
Por favor, genera el código de los componentes envolventes de matemáticas y muestra exactamente cómo modificar `GameEngine.ts` y `KeeperAI.ts` para aceptar el estado `forcedSave` basado en las instrucciones anteriores. Recuerda mantener todo estrictamente en el cliente (localStorage) y sin llamadas a Firebase.
