import { GOAL } from "../config/constants";
import type { Outcome, Vec2, Vec3 } from "../core/types";

const COLLISION_EPSILON = 1e-12;

const distanceSquared = (first: Vec2, second: Vec2): number => {
  const horizontal = first.x - second.x;
  const vertical = first.y - second.y;
  return horizontal * horizontal + vertical * vertical;
};

const distanceToSegmentSquared = (
  point: Vec2,
  start: Vec2,
  end: Vec2,
): number => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared === 0) return distanceSquared(point, start);

  const projection = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
        lengthSquared,
    ),
  );
  return distanceSquared(point, {
    x: start.x + segmentX * projection,
    y: start.y + segmentY * projection,
  });
};

export const interpolateForwardPlaneCrossing = (
  previous: Vec3,
  current: Vec3,
  planeZ: number,
): Vec3 | null => {
  if (current.z <= previous.z || previous.z > planeZ || current.z < planeZ) {
    return null;
  }
  const distance = current.z - previous.z;
  if (distance <= Number.EPSILON) return null;
  const amount = (planeZ - previous.z) / distance;
  return {
    x: previous.x + (current.x - previous.x) * amount,
    y: previous.y + (current.y - previous.y) * amount,
    z: planeZ,
  };
};

export const touchesGoalFrame = (point: Vec2, ballRadius: number): boolean => {
  const collisionRadius = GOAL.postRadius + ballRadius;
  const collisionRadiusSquared = collisionRadius * collisionRadius;
  const leftPost = distanceToSegmentSquared(
    point,
    { x: GOAL.leftPostCenterX, y: GOAL.groundY },
    { x: GOAL.leftPostCenterX, y: GOAL.crossbarCenterY },
  );
  const rightPost = distanceToSegmentSquared(
    point,
    { x: GOAL.rightPostCenterX, y: GOAL.groundY },
    { x: GOAL.rightPostCenterX, y: GOAL.crossbarCenterY },
  );
  const crossbar = distanceToSegmentSquared(
    point,
    { x: GOAL.leftPostCenterX, y: GOAL.crossbarCenterY },
    { x: GOAL.rightPostCenterX, y: GOAL.crossbarCenterY },
  );
  return (
    Math.min(leftPost, rightPost, crossbar) <=
    collisionRadiusSquared + COLLISION_EPSILON
  );
};

/** Classifies the actual ball centre at the goal line. */
export const classifyGoalCrossing = (
  point: Vec2,
  ballRadius: number,
): Exclude<Outcome, "SAVE"> => {
  if (touchesGoalFrame(point, ballRadius)) return "POST";

  const maximumGoalCentreX = GOAL.halfWidth - ballRadius;
  const maximumGoalCentreY = GOAL.crossbarUndersideY - ballRadius;
  const aboveGround = point.y >= GOAL.groundY + ballRadius;
  if (
    Math.abs(point.x) <= maximumGoalCentreX &&
    point.y <= maximumGoalCentreY &&
    aboveGround
  ) {
    return "GOAL";
  }
  return "OUT";
};
