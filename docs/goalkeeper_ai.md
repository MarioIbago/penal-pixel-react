# Goalkeeper AI and Movement

The goalkeeper (`src/game/goalkeeper/KeeperAI.ts`) is designed to provide a dynamic and challenging opponent that reacts naturally to the player's shots.

## Decision Making

When the ball is kicked, the Keeper AI immediately formulates a `KeeperPlan`. The plan consists of:
- **Predicted Target**: Where the keeper thinks the ball will cross the goal line.
- **Reaction Delay**: How long the keeper takes to start moving.
- **Dive Direction**: Left, right, or center.

### Difficulty and Error Simulation

The keeper is not perfect. Their prediction is affected by:
- **Inherent Difficulty**: Higher difficulty reduces reaction time and prediction error.
- **Experience**: The keeper learns over time if the player repeatedly shoots in the same direction, reducing their error margin for that zone.
- **Misreads**: There is a chance the keeper completely misreads the shot, diving the wrong way or standing still. This is crucial for making the game feel fair and giving the player moments of satisfaction when they "fool" the keeper.

## Movement Trajectory

Once the reaction delay passes, the keeper executes the dive:
1. **Anticipation**: During the reaction delay, the keeper slightly lowers their stance into a "crouch" pose.
2. **Explosive Start**: The movement uses an `easeOutCubic` curve. This makes the initial leap explosive and fast, slowing down as they reach full extension.
3. **Parabolic Arc**: If diving to the side, a natural jump arc (using a sine wave based on dive progress) is added to the Y-axis. This simulates jumping off the ground to reach the corners, rather than just gliding in a straight line.

## Rendering and Poses

The keeper is rendered using a sprite atlas with specific poses:
- `ready`: Default standing.
- `crouch`: Preparing to dive.
- `high-left` / `low-left`: Diving left.
- `high-right` / `low-right`: Diving right.

The pose is selected based on the dive direction and the predicted height of the ball.

## Collision

Keeper collision (`keeperCollision.ts`) is distinct from goal collision. It models the keeper as a collection of geometric primitives (a capsule for the body, and spheres for hands/feet). If the ball intersects these during the dive, a save is registered, and the ball is deflected.
