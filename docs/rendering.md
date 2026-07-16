# Rendering System

Penal Pixel uses a custom HTML5 Canvas renderer (`src/game/rendering/CanvasRenderer.ts`) to draw the 3D game state onto a 2D screen with a retro pixel-art aesthetic.

## 3D to 2D Projection (`projection.ts`)

Although the game physics run in 3D space, the graphics are purely 2D sprites. To marry these, the engine uses perspective projection:
- **Focal Length**: Defines the field of view.
- **Scaling**: As objects (like the ball) move further away along the Z-axis, their projected size on the screen decreases.
- **Coordinates**: X and Y coordinates in 3D are projected onto the 2D canvas, keeping the goal centered.

## Asset Pipeline

All visual assets are stored as sprite sheets or single images in `public/assets/`. They are loaded asynchronously during initialization (`assets.ts`).

- **Ball**: Uses a horizontal strip (`ball-strip.png`) to animate rotation. The current frame is selected based on the ball's accumulated rotation in the physics engine.
- **Keeper**: Uses an atlas (`keeper-atlas.png`) containing various poses (ready, crouch, dive).
- **Leg/Kicker**: A strip (`leg-strip.png`) that animates only when a kick is triggered.
- **Stadium**: Static background image. Responsive logic selects a portrait or landscape version based on the user's screen aspect ratio.

## Rendering Pipeline

Every frame, the `CanvasRenderer` executes the following steps in order (Painter's Algorithm):
1. **Background**: Draws the stadium sky and stands.
2. **Goal & Net (Back)**: Draws the back part of the goal.
3. **Goalkeeper**: Draws the keeper sprite based on their current pose and projected position.
4. **Ball**: Draws the ball, calculating its scaled size and selecting the correct rotation frame.
5. **Goal (Front)**: Draws the front posts and crossbar over the ball if it is inside the goal.
6. **Leg**: Draws the kicker's leg animation in the foreground.
7. **UI Overlays**: Draws aiming arrows or visual effects (like the save flash).

## Pixel Perfect Aesthetics

To maintain the retro look:
- The canvas context uses `imageSmoothingEnabled = false`.
- CSS is configured with `image-rendering: pixelated` and `image-rendering: crisp-edges`.
- Coordinates are often rounded or floored to prevent sub-pixel blurring, keeping edges sharp.
