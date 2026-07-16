import { describe, expect, it } from "vitest";
import { GOAL } from "../config/constants";
import { SeededRandom } from "../random/SeededRandom";
import {
  collideBallWithGoalNet,
  createInitialBallState,
  deflectFromFrame,
  integrateBall,
  launchBall,
} from "./ballPhysics";

describe("ball physics", () => {
  it("follows the precomputed ballistic trajectory to the physical goal plane", () => {
    const ball = createInitialBallState();
    const shot = launchBall(ball, { x: 2.1, y: 1.7 }, new SeededRandom(101));
    const steps = 240;
    const delta = shot.flightTime / steps;
    for (let index = 0; index < steps; index += 1) {
      integrateBall(ball, delta, shot.curveAcceleration, false);
    }
    expect(ball.position.z).toBeCloseTo(GOAL.planeZ, 8);
    expect(ball.position.x).toBeCloseTo(shot.actualTarget.x, 8);
    expect(ball.position.y).toBeCloseTo(shot.actualTarget.y, 8);
  });

  it("reflects side-post and crossbar impacts along the matching frame normal", () => {
    const sidePostBall = createInitialBallState();
    sidePostBall.position = { x: GOAL.rightPostCenterX, y: 1.1, z: GOAL.planeZ };
    sidePostBall.velocity = { x: 3, y: 2, z: 15 };
    deflectFromFrame(sidePostBall, {
      x: GOAL.rightPostCenterX,
      y: 1.1,
    });
    expect(sidePostBall.velocity.x).toBeLessThan(0);
    expect(sidePostBall.velocity.z).toBeLessThan(0);

    const crossbarBall = createInitialBallState();
    crossbarBall.position = { x: 0.4, y: GOAL.crossbarCenterY, z: GOAL.planeZ };
    crossbarBall.velocity = { x: 2, y: 4, z: 15 };
    deflectFromFrame(crossbarBall, {
      x: 0.4,
      y: GOAL.crossbarCenterY,
    });
    expect(crossbarBall.velocity.y).toBeLessThan(0);
    expect(crossbarBall.velocity.z).toBeLessThan(0);
  });

  it("absorbs outward motion against both side nets", () => {
    const sideLimit = GOAL.halfWidth - 0.11;
    const rightBall = createInitialBallState();
    rightBall.position = { x: sideLimit + 0.2, y: 1.2, z: GOAL.planeZ + 0.4 };
    rightBall.velocity = { x: 4, y: 1, z: 5 };

    expect(collideBallWithGoalNet(rightBall)).toEqual({
      side: "right",
      roof: false,
    });
    expect(rightBall.position.x).toBeCloseTo(sideLimit, 12);
    expect(rightBall.velocity.x).toBeLessThan(0);
    expect(Math.abs(rightBall.velocity.x)).toBeLessThan(4);
    expect(rightBall.velocity.z).toBeLessThan(5);

    const leftBall = createInitialBallState();
    leftBall.position = { x: -sideLimit - 0.2, y: 1.2, z: GOAL.planeZ + 0.4 };
    leftBall.velocity = { x: -4, y: 1, z: 5 };
    expect(collideBallWithGoalNet(leftBall).side).toBe("left");
    expect(leftBall.position.x).toBeCloseTo(-sideLimit, 12);
    expect(leftBall.velocity.x).toBeGreaterThan(0);
  });

  it("contains a scored ball below the net roof without changing in-bounds balls", () => {
    const roofLimit = GOAL.height - 0.11;
    const roofBall = createInitialBallState();
    roofBall.position = { x: 0.5, y: roofLimit + 0.16, z: GOAL.planeZ + 0.5 };
    roofBall.velocity = { x: 1, y: 3, z: 5 };

    expect(collideBallWithGoalNet(roofBall)).toEqual({
      side: null,
      roof: true,
    });
    expect(roofBall.position.y).toBeCloseTo(roofLimit, 12);
    expect(roofBall.velocity.y).toBeLessThan(0);
    expect(Math.abs(roofBall.velocity.y)).toBeLessThan(3);

    const freeBall = createInitialBallState();
    freeBall.position = { x: 1, y: 1.4, z: GOAL.planeZ + 0.5 };
    freeBall.velocity = { x: 1, y: -1, z: 4 };
    const original = structuredClone(freeBall);
    expect(collideBallWithGoalNet(freeBall)).toEqual({
      side: null,
      roof: false,
    });
    expect(freeBall).toEqual(original);
  });
});
