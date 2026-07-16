import { describe, expect, it } from "vitest";
import { createKeeperPlan } from "./KeeperAI";
import type { RandomSource } from "../random/SeededRandom";

const makeRandom = (value: number): RandomSource => ({
  next: () => value,
  range: (minimum) => minimum,
  normal: () => 0,
});

describe("keeper zone AI", () => {
  it("guesses top-left with next() = 0", () => {
    const plan = createKeeperPlan(
      { x: -2.4, y: 1.5 }, // Top-Left
      0.8,
      makeRandom(0),
      0,
    );

    expect(plan.diveDirection).toBe(-1);
    expect(plan.predictedTarget.x).toBeLessThan(0);
    expect(plan.predictedTarget.y).toBeGreaterThan(1.22);
  });

  it("guesses bottom-right with next() = 0.99", () => {
    const plan = createKeeperPlan(
      { x: 2.4, y: 1.0 }, // Bottom-Right
      0.8,
      makeRandom(0.99),
      0,
    );

    expect(plan.diveDirection).toBe(1);
    expect(plan.predictedTarget.x).toBeGreaterThan(0);
    expect(plan.predictedTarget.y).toBeLessThan(1.22);
  });
});
