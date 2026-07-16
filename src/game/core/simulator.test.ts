import { describe, expect, it } from "vitest";
import { DEFAULT_KEEPER_DIFFICULTY } from "../config/constants";
import { simulateUniformShots } from "./simulator";

describe("seeded keeper calibration simulator", () => {
  it("is deterministic and keeps the default near the easy opening scoring rate", () => {
    const options = {
      shots: 800,
      seed: 20_260_712,
      keeperDifficulty: DEFAULT_KEEPER_DIFFICULTY,
    };
    const first = simulateUniformShots(options);
    const second = simulateUniformShots(options);
    expect(second).toEqual(first);
    expect(first.goals + first.saves + first.posts + first.outs).toBe(first.shots);
    expect(first.goalRate).toBeGreaterThanOrEqual(0.78);
    expect(first.goalRate).toBeLessThanOrEqual(0.9);
  });
});
