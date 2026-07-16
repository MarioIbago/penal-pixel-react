import { describe, expect, it } from "vitest";
import { BALL, GOAL } from "../config/constants";
import {
  classifyGoalCrossing,
  interpolateForwardPlaneCrossing,
} from "./goalDetection";

describe("goal detection", () => {
  it("interpolates the exact point where a fast ball crosses a plane", () => {
    expect(
      interpolateForwardPlaneCrossing(
        { x: 0, y: 1, z: 10 },
        { x: 2, y: 2, z: 12 },
        11,
      ),
    ).toEqual({ x: 1, y: 1.5, z: 11 });
  });

  it("separates goals, frame hits and misses from continuous coordinates", () => {
    expect(classifyGoalCrossing({ x: 2.1, y: 1.3 }, BALL.radius)).toBe(
      "GOAL",
    );
    expect(
      classifyGoalCrossing(
        { x: GOAL.halfWidth - 0.02, y: 1.2 },
        BALL.radius,
      ),
    ).toBe("POST");
    expect(
      classifyGoalCrossing({ x: 0.2, y: GOAL.height - 0.02 }, BALL.radius),
    ).toBe("POST");
    expect(classifyGoalCrossing({ x: 4.4, y: 1 }, BALL.radius)).toBe("OUT");
  });

  it("uses the visible inner faces as the 7.32 metre mouth boundaries", () => {
    const epsilon = 1e-6;
    const lastClearCentreX = GOAL.mouthRightX - BALL.radius;

    expect(
      classifyGoalCrossing(
        { x: lastClearCentreX - epsilon, y: 1.1 },
        BALL.radius,
      ),
    ).toBe("GOAL");
    expect(
      classifyGoalCrossing({ x: lastClearCentreX, y: 1.1 }, BALL.radius),
    ).toBe("POST");
    expect(
      classifyGoalCrossing(
        { x: lastClearCentreX + epsilon, y: 1.1 },
        BALL.radius,
      ),
    ).toBe("POST");

    expect(
      classifyGoalCrossing(
        { x: -lastClearCentreX + epsilon, y: 1.1 },
        BALL.radius,
      ),
    ).toBe("GOAL");
    expect(
      classifyGoalCrossing({ x: -lastClearCentreX, y: 1.1 }, BALL.radius),
    ).toBe("POST");
  });

  it("uses the visible crossbar underside as the 2.44 metre boundary", () => {
    const epsilon = 1e-6;
    const lastClearCentreY = GOAL.crossbarUndersideY - BALL.radius;

    expect(
      classifyGoalCrossing(
        { x: 0.8, y: lastClearCentreY - epsilon },
        BALL.radius,
      ),
    ).toBe("GOAL");
    expect(
      classifyGoalCrossing({ x: 0.8, y: lastClearCentreY }, BALL.radius),
    ).toBe("POST");
    expect(
      classifyGoalCrossing(
        { x: 0.8, y: lastClearCentreY + epsilon },
        BALL.radius,
      ),
    ).toBe("POST");
  });

  it("classifies inner and outer top corners without square hitboxes", () => {
    const epsilon = 1e-6;
    const clearX = GOAL.mouthRightX - BALL.radius;
    const clearY = GOAL.crossbarUndersideY - BALL.radius;
    const outsideFrameX =
      GOAL.rightPostCenterX + GOAL.postRadius + BALL.radius;

    expect(
      classifyGoalCrossing(
        { x: clearX - epsilon, y: clearY - epsilon },
        BALL.radius,
      ),
    ).toBe("GOAL");
    expect(
      classifyGoalCrossing(
        { x: clearX + epsilon, y: clearY + epsilon },
        BALL.radius,
      ),
    ).toBe("POST");
    expect(
      classifyGoalCrossing(
        { x: outsideFrameX + epsilon, y: 1.2 },
        BALL.radius,
      ),
    ).toBe("OUT");
  });

  it("allows a rolling ball tangent to the ground but rejects a buried centre", () => {
    expect(
      classifyGoalCrossing({ x: 1.4, y: BALL.radius }, BALL.radius),
    ).toBe("GOAL");
    expect(
      classifyGoalCrossing(
        { x: 1.4, y: BALL.radius - 1e-6 },
        BALL.radius,
      ),
    ).toBe("OUT");
  });
});
