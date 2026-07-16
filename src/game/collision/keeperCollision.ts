import { KEEPER } from "../config/constants";
import type { KeeperState, Vec2 } from "../core/types";

export interface KeeperCapsule {
  start: Vec2;
  end: Vec2;
  radius: number;
}

const distanceToCapsuleSquared = (
  point: Vec2,
  capsule: KeeperCapsule,
): number => {
  const segmentX = capsule.end.x - capsule.start.x;
  const segmentY = capsule.end.y - capsule.start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const amount =
    lengthSquared === 0
      ? 0
      : Math.min(
          1,
          Math.max(
            0,
            ((point.x - capsule.start.x) * segmentX +
              (point.y - capsule.start.y) * segmentY) /
              lengthSquared,
          ),
        );
  const closestX = capsule.start.x + segmentX * amount;
  const closestY = capsule.start.y + segmentY * amount;
  const horizontal = point.x - closestX;
  const vertical = point.y - closestY;
  return horizontal * horizontal + vertical * vertical;
};

export const getKeeperCapsules = (keeper: KeeperState): readonly KeeperCapsule[] => {
  const direction = keeper.direction;
  const rotation = direction * keeper.diveProgress * Math.PI * 0.39;
  const bodyAxis = { x: Math.sin(rotation), y: Math.cos(rotation) };
  const centre = keeper.position;
  const bodyStart = {
    x: centre.x - bodyAxis.x * KEEPER.bodyHalfLength,
    y: centre.y - bodyAxis.y * KEEPER.bodyHalfLength,
  };
  const bodyEnd = {
    x: centre.x + bodyAxis.x * KEEPER.bodyHalfLength,
    y: centre.y + bodyAxis.y * KEEPER.bodyHalfLength,
  };

  const capsules: KeeperCapsule[] = [
    {
      start: bodyStart,
      end: bodyEnd,
      radius: KEEPER.bodyRadius,
    },
    {
      start: bodyEnd,
      end: bodyEnd,
      radius: KEEPER.bodyRadius * 0.86,
    },
  ];

  if (direction === 0) {
    const shoulder = {
      x: centre.x,
      y: centre.y + KEEPER.bodyHalfLength * 0.42,
    };
    const idleArmLength = KEEPER.armLength * 0.58;
    capsules.push(
      {
        start: shoulder,
        end: { x: shoulder.x - idleArmLength, y: shoulder.y - 0.07 },
        radius: KEEPER.armRadius,
      },
      {
        start: shoulder,
        end: { x: shoulder.x + idleArmLength, y: shoulder.y - 0.07 },
        radius: KEEPER.armRadius,
      },
    );
  } else {
    const highDive = keeper.pose === "high-left" || keeper.pose === "high-right";
    const leadX = direction * (highDive ? 0.84 : 0.96);
    const leadY = highDive ? 0.54 : -0.16;
    const leadLength = Math.hypot(leadX, leadY);
    const lead = { x: leadX / leadLength, y: leadY / leadLength };
    const shoulder = {
      x: centre.x + bodyAxis.x * KEEPER.bodyHalfLength * 0.37,
      y: centre.y + bodyAxis.y * KEEPER.bodyHalfLength * 0.37,
    };
    const armReach = KEEPER.armLength * (0.72 + keeper.diveProgress * 0.28);
    capsules.push(
      {
        start: {
          x: shoulder.x + bodyAxis.x * 0.075,
          y: shoulder.y + bodyAxis.y * 0.075,
        },
        end: {
          x: shoulder.x + lead.x * armReach + bodyAxis.x * 0.075,
          y: shoulder.y + lead.y * armReach + bodyAxis.y * 0.075,
        },
        radius: KEEPER.armRadius,
      },
      {
        start: {
          x: shoulder.x - bodyAxis.x * 0.075,
          y: shoulder.y - bodyAxis.y * 0.075,
        },
        end: {
          x: shoulder.x + lead.x * armReach - bodyAxis.x * 0.075,
          y: shoulder.y + lead.y * armReach - bodyAxis.y * 0.075,
        },
        radius: KEEPER.armRadius,
      },
    );
  }

  const legBase = {
    x: centre.x - bodyAxis.x * KEEPER.bodyHalfLength * 0.65,
    y: centre.y - bodyAxis.y * KEEPER.bodyHalfLength * 0.65,
  };
  const legDirection = direction === 0 ? 1 : direction;
  capsules.push(
    {
      start: legBase,
      end: {
        x: legBase.x - legDirection * KEEPER.legLength * 0.42,
        y: Math.max(0.08, legBase.y - KEEPER.legLength * 0.7),
      },
      radius: KEEPER.legRadius,
    },
    {
      start: legBase,
      end: {
        x: legBase.x + legDirection * KEEPER.legLength * 0.48,
        y: Math.max(0.08, legBase.y - KEEPER.legLength * 0.62),
      },
      radius: KEEPER.legRadius,
    },
  );

  return capsules;
};

export const intersectsKeeper = (
  ballCentre: Vec2,
  ballRadius: number,
  keeper: KeeperState,
): boolean =>
  getKeeperCapsules(keeper).some((capsule) => {
    const collisionRadius = capsule.radius + ballRadius;
    return distanceToCapsuleSquared(ballCentre, capsule) <= collisionRadius ** 2;
  });
