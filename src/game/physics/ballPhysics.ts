import { AIM, BALL, GOAL, NET } from "../config/constants";
import type { BallState, Vec2, Vec3 } from "../core/types";
import type { RandomSource } from "../random/SeededRandom";

export interface ShotPhysics {
  actualTarget: Vec2;
  flightTime: number;
  curveAcceleration: number;
}

export interface NetCollision {
  side: "left" | "right" | null;
  roof: boolean;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const length3 = (vector: Vec3): number =>
  Math.hypot(vector.x, vector.y, vector.z);

export const createInitialBallState = (): BallState => ({
  position: { ...BALL.start },
  previousPosition: { ...BALL.start },
  velocity: { x: 0, y: 0, z: 0 },
  spin: { x: 0, y: 0, z: 0 },
  radius: BALL.radius,
  rotation: 0,
  launched: false,
});

/**
 * Builds a ballistic kick that naturally intersects the selected goal-plane
 * coordinate. Small seeded aim and curve errors are introduced before launch;
 * no result is selected here or anywhere else in the engine.
 */
export const launchBall = (
  ball: BallState,
  target: Vec2,
  random: RandomSource,
): ShotPhysics => {
  const heightFactor = clamp(target.y / GOAL.height, -0.4, 1.7);
  const widthFactor = clamp(Math.abs(target.x) / GOAL.halfWidth, 0, 1.7);
  const flightTime = clamp(
    0.69 + heightFactor * 0.055 + widthFactor * 0.018 + random.range(-0.025, 0.025),
    AIM.minimumFlightTime,
    AIM.maximumFlightTime,
  );

  const actualTarget: Vec2 = {
    x: target.x + random.normal(0, AIM.horizontalJitter),
    y: target.y + random.normal(0, AIM.verticalJitter),
  };
  const curveAcceleration = clamp(
    random.normal(0, AIM.maximumCurveAcceleration * 0.43),
    -AIM.maximumCurveAcceleration,
    AIM.maximumCurveAcceleration,
  );

  const start = BALL.start;
  const velocity: Vec3 = {
    x:
      (actualTarget.x - start.x - 0.5 * curveAcceleration * flightTime ** 2) /
      flightTime,
    y:
      (actualTarget.y - start.y + 0.5 * BALL.gravity * flightTime ** 2) /
      flightTime,
    z: (GOAL.planeZ - start.z) / flightTime,
  };

  ball.position = { ...start };
  ball.previousPosition = { ...start };
  ball.velocity = velocity;
  ball.spin = {
    x: velocity.y / ball.radius,
    y: curveAcceleration * 5.5,
    z: -velocity.x / ball.radius,
  };
  ball.rotation = 0;
  ball.launched = true;

  return { actualTarget, flightTime, curveAcceleration };
};

/** Analytic constant-acceleration integration, stable at any fixed step. */
export const integrateBall = (
  ball: BallState,
  deltaSeconds: number,
  curveAcceleration: number,
  allowGroundBounce = true,
): void => {
  ball.previousPosition = { ...ball.position };

  const acceleration: Vec3 = {
    x: curveAcceleration,
    y: -BALL.gravity,
    z: 0,
  };

  ball.position.x +=
    ball.velocity.x * deltaSeconds +
    0.5 * acceleration.x * deltaSeconds * deltaSeconds;
  ball.position.y +=
    ball.velocity.y * deltaSeconds +
    0.5 * acceleration.y * deltaSeconds * deltaSeconds;
  ball.position.z += ball.velocity.z * deltaSeconds;

  ball.velocity.x += acceleration.x * deltaSeconds;
  ball.velocity.y += acceleration.y * deltaSeconds;
  ball.rotation += (length3(ball.velocity) / ball.radius) * deltaSeconds;

  if (allowGroundBounce && ball.position.y < ball.radius) {
    ball.position.y = ball.radius;
    if (ball.velocity.y < 0) {
      ball.velocity.y = -ball.velocity.y * BALL.groundRestitution;
      ball.velocity.x *= BALL.groundFriction;
      ball.velocity.z *= BALL.groundFriction;
    }
  }
};

export const dampResolvedBall = (
  ball: BallState,
  deltaSeconds: number,
  dampingPerSecond: number,
): void => {
  const damping = Math.exp(-dampingPerSecond * deltaSeconds);
  ball.velocity.x *= damping;
  ball.velocity.z *= damping;
  ball.spin.x *= damping;
  ball.spin.y *= damping;
  ball.spin.z *= damping;
};

export const deflectFromKeeper = (ball: BallState, contact: Vec2): void => {
  const lateralOffset = ball.position.x - contact.x;
  ball.position.z = Math.min(ball.position.z, GOAL.keeperPlaneZ - 0.015);
  ball.velocity.x += lateralOffset * 3.5;
  ball.velocity.y = Math.max(1.7, Math.abs(ball.velocity.y) * 0.28 + 1.25);
  ball.velocity.z = -Math.max(4.2, Math.abs(ball.velocity.z) * 0.38);
  ball.spin.y += lateralOffset * 8;
};

export const deflectFromFrame = (ball: BallState, contact: Vec2): void => {
  const nearestPostCenter =
    contact.x < 0 ? GOAL.leftPostCenterX : GOAL.rightPostCenterX;
  const distanceToSidePost = Math.abs(contact.x - nearestPostCenter);
  const distanceToCrossbar = Math.abs(contact.y - GOAL.crossbarCenterY);
  const hitSide = distanceToSidePost <= distanceToCrossbar;
  if (hitSide) {
    const side = Math.sign(contact.x) || 1;
    ball.velocity.x = -side * Math.max(2.5, Math.abs(ball.velocity.x) * 0.72);
    ball.velocity.y *= 0.78;
  } else {
    ball.velocity.y = -Math.max(2.1, Math.abs(ball.velocity.y) * 0.7);
    ball.velocity.x *= 0.82;
  }
  ball.velocity.z = -Math.max(2.2, Math.abs(ball.velocity.z) * 0.24);
  ball.position.z = GOAL.planeZ - 0.02;
  ball.spin.y *= -0.7;
};

/**
 * Keeps a valid goal inside the visible net volume without revisiting its
 * outcome. The cloth has little restitution and absorbs tangential momentum.
 */
export const collideBallWithGoalNet = (ball: BallState): NetCollision => {
  const sideLimit = GOAL.halfWidth - ball.radius;
  const roofLimit = GOAL.crossbarUndersideY - ball.radius;
  let side: NetCollision["side"] = null;
  let roof = false;

  if (ball.position.x > sideLimit) {
    ball.position.x = sideLimit;
    if (ball.velocity.x > 0) {
      ball.velocity.x = -ball.velocity.x * NET.sideRestitution;
    }
    ball.velocity.y *= NET.tangentialDamping;
    ball.velocity.z *= NET.tangentialDamping;
    ball.spin.z *= -NET.sideRestitution;
    side = "right";
  } else if (ball.position.x < -sideLimit) {
    ball.position.x = -sideLimit;
    if (ball.velocity.x < 0) {
      ball.velocity.x = -ball.velocity.x * NET.sideRestitution;
    }
    ball.velocity.y *= NET.tangentialDamping;
    ball.velocity.z *= NET.tangentialDamping;
    ball.spin.z *= -NET.sideRestitution;
    side = "left";
  }

  if (ball.position.y > roofLimit) {
    ball.position.y = roofLimit;
    if (ball.velocity.y > 0) {
      ball.velocity.y = -ball.velocity.y * NET.roofRestitution;
    }
    ball.velocity.x *= NET.tangentialDamping;
    ball.velocity.z *= NET.tangentialDamping;
    ball.spin.x *= -NET.roofRestitution;
    roof = true;
  }

  return { side, roof };
};
