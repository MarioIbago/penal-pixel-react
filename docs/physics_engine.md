# Physics Engine

The physics engine in Penal Pixel (`src/game/physics/`) simulates a 3D ball trajectory using a custom lightweight integrator, projecting it onto a 2D canvas for rendering.

## 3D Coordinate System

The game operates in a right-handed 3D coordinate system:
- **X-axis**: Horizontal (left to right). Center of the goal is `0`.
- **Y-axis**: Vertical (bottom to top). Ground is `0`.
- **Z-axis**: Depth. The penalty spot is `0`, and the goal line is at `10.55` meters.

## Ball Dynamics (`ballPhysics.ts`)

The ball simulation includes:
- **Gravity**: Constant downward acceleration applied to the Y-axis.
- **Drag**: Air resistance that slows the ball down over time, proportional to its velocity.
- **Magnus Effect (Spin)**: The ball curves in the air based on its initial spin. The cross product of the spin vector and velocity vector produces a force that deflects the ball.

### The Kick

When the player kicks, the engine takes the 2D pointer swipe and translates it into a 3D velocity vector.
- **Elevation**: Driven by the length and speed of the swipe.
- **Direction**: Driven by the angle of the swipe.
- **Curve/Spin**: If the swipe is curved, spin is added, making the ball curl towards the corners.

## Collision Detection (`collision/`)

Since the physics run at a fixed timestep, the engine uses swept sphere collision detection against the goalposts and the net.

1. **Goalposts (`goalDetection.ts`)**:
   - The posts and crossbar are treated as cylinders.
   - The ball checks for intersection with these cylinders on every frame.
   - If a collision occurs, the ball's velocity vector is reflected across the collision normal, applying a restitution (bounciness) factor.

2. **The Net**:
   - The net is composed of planes (back, left, right, roof).
   - Hitting the net rapidly damps the ball's velocity, bringing it to a rest inside the goal.

3. **Ground Bounces**:
   - Simple plane collision at `Y = 0` with high friction and low restitution.
