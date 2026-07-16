import type { Vec2, Vec3 } from "../core/types";

const GOAL_MOUTH_WIDTH = 7.32;
const GOAL_MOUTH_HALF_WIDTH = GOAL_MOUTH_WIDTH / 2;
const GOAL_MOUTH_HEIGHT = 2.44;
const GOAL_POST_DIAMETER = 0.12;
const GOAL_POST_RADIUS = GOAL_POST_DIAMETER / 2;

/**
 * FIFA goal dimensions in world metres.
 *
 * `width`, `halfWidth` and `height` describe the CLEAR INNER MOUTH shown by
 * the projection (inside face to inside face, ground to crossbar underside).
 * Frame axes therefore sit one post radius outside those visible boundaries.
 */
export const GOAL = Object.freeze({
  width: GOAL_MOUTH_WIDTH,
  halfWidth: GOAL_MOUTH_HALF_WIDTH,
  height: GOAL_MOUTH_HEIGHT,
  mouthLeftX: -GOAL_MOUTH_HALF_WIDTH,
  mouthRightX: GOAL_MOUTH_HALF_WIDTH,
  crossbarUndersideY: GOAL_MOUTH_HEIGHT,
  groundY: 0,
  planeZ: 11,
  keeperPlaneZ: 10.55,
  postDiameter: GOAL_POST_DIAMETER,
  postRadius: GOAL_POST_RADIUS,
  leftPostCenterX: -GOAL_MOUTH_HALF_WIDTH - GOAL_POST_RADIUS,
  rightPostCenterX: GOAL_MOUTH_HALF_WIDTH + GOAL_POST_RADIUS,
  crossbarCenterY: GOAL_MOUTH_HEIGHT + GOAL_POST_RADIUS,
  frameOuterHalfWidth: GOAL_MOUTH_HALF_WIDTH + GOAL_POST_DIAMETER,
  frameOuterHeight: GOAL_MOUTH_HEIGHT + GOAL_POST_DIAMETER,
  netDepth: 1.6,
});

export const BALL = Object.freeze({
  radius: 0.11,
  start: Object.freeze<Vec3>({ x: 0, y: 0.11, z: 0 }),
  gravity: 9.81,
  groundRestitution: 0.36,
  groundFriction: 0.965,
});

export const KEEPER = Object.freeze({
  home: Object.freeze<Vec2>({ x: 0, y: 0.92 }),
  bodyHalfLength: 0.43,
  bodyRadius: 0.19,
  armLength: 0.61,
  armRadius: 0.105,
  legLength: 0.45,
  legRadius: 0.12,
});

export const ENGINE = Object.freeze({
  fixedStep: 1 / 120,
  maximumFrameDelta: 0.1,
  resultDuration: 1.1,
  maximumFlightDuration: 1.65,
  trailLength: 24,
});

export const NET = Object.freeze({
  sideRestitution: 0.24,
  roofRestitution: 0.2,
  tangentialDamping: 0.78,
});

/**
 * Tuned with the seeded uniform-target simulator in core/simulator.ts.
 * Difficulty affects reaction latency, reach and prediction error, never a
 * post-kick outcome roll.
 */
export const DEFAULT_KEEPER_DIFFICULTY = 0;

export const ADAPTIVE_KEEPER = Object.freeze({
  baseDifficulty: 0.02,
  streakStep: 0.075,
  maximumDifficulty: 0.78,
  repeatedTargetBonus: 0.18,
  historyLimit: 18,
  heatRadiusX: 1.12,
  heatRadiusY: 0.72,
});

export const AIM = Object.freeze({
  horizontalJitter: 0.025,
  verticalJitter: 0.024,
  maximumCurveAcceleration: 0.34,
  minimumFlightTime: 0.74,
  maximumFlightTime: 0.96,
});
