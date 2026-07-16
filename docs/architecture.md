# Architecture Overview

Penal Pixel is a retro-style penalty shootout game built using React and an HTML5 Canvas custom rendering engine. The architecture is designed to cleanly separate game logic from React's rendering lifecycle, ensuring smooth 60/120 FPS simulation regardless of UI updates.

## Core Separation of Concerns

1. **React UI Layer (`src/components/`)**:
   - Manages menus, HUD, settings, and high-level game state (`MenuScreen`, `GameScreen`, `RulesDialog`).
   - Does *not* handle game physics or animation loops directly.
   - Uses a custom hook `useScore` for persistent streak tracking and best score storage.

2. **Game Engine (`src/game/`)**:
   - Written in pure TypeScript without React dependencies.
   - Operates on a fixed timestep for deterministic physics simulation.
   - Divided into distinct modules: `physics`, `goalkeeper`, `collision`, `rendering`, `core`.

## The Game Loop (`GameEngine.ts`)

The `GameEngine` class orchestrates the entire simulation using `requestAnimationFrame`.

- **Fixed Timestep**: The physics step updates at a fixed interval (e.g., 120Hz). This ensures that collision detection (like the ball hitting the post or the net) is reliable regardless of monitor refresh rate.
- **Interpolation**: The renderer interpolates between the previous and current physics state to draw frames at the monitor's exact refresh rate, preventing stuttering.

## State Management

The game state is divided into specific domains:
- `BallState`: 3D position, velocity, and spin.
- `KeeperState`: 2D position (on the goal line), velocity, pose, and dive progress.
- `MatchState`: Score, current streak, and phase (aiming, flying, resolved).

These states are mutated directly by the engine for performance, avoiding the overhead of immutable updates during the high-frequency physics loop. The React layer only reads from these states or receives callbacks when high-level events occur (like a goal or a save).
