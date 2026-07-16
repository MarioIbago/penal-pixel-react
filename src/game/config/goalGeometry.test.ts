import { describe, expect, it } from "vitest";
import {
  BALL_RADIUS as RENDER_BALL_RADIUS,
  GOAL_DISTANCE as RENDER_GOAL_DISTANCE,
  GOAL_HEIGHT as RENDER_GOAL_HEIGHT,
  GOAL_WIDTH as RENDER_GOAL_WIDTH,
} from "../rendering/projection";
import { BALL, GOAL } from "./constants";

describe("world goal geometry", () => {
  it("defines 7.32 by 2.44 metres as the clear visible mouth", () => {
    expect(GOAL.width).toBe(7.32);
    expect(GOAL.mouthLeftX).toBe(-3.66);
    expect(GOAL.mouthRightX).toBe(3.66);
    expect(GOAL.crossbarUndersideY).toBe(2.44);
    expect(GOAL.groundY).toBe(0);
  });

  it("places twelve-centimetre frame axes outside the clear mouth", () => {
    expect(GOAL.postDiameter).toBe(0.12);
    expect(GOAL.postRadius).toBe(0.06);
    expect(GOAL.leftPostCenterX).toBeCloseTo(-3.72, 12);
    expect(GOAL.rightPostCenterX).toBeCloseTo(3.72, 12);
    expect(GOAL.crossbarCenterY).toBeCloseTo(2.5, 12);
    expect(GOAL.frameOuterHalfWidth).toBeCloseTo(3.78, 12);
    expect(GOAL.frameOuterHeight).toBeCloseTo(2.56, 12);
  });

  it("stays numerically aligned with the visible world projection", () => {
    expect(GOAL.width).toBe(RENDER_GOAL_WIDTH);
    expect(GOAL.height).toBe(RENDER_GOAL_HEIGHT);
    expect(GOAL.planeZ).toBe(RENDER_GOAL_DISTANCE);
    expect(BALL.radius).toBe(RENDER_BALL_RADIUS);
  });
});
