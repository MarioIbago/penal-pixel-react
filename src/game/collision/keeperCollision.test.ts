import { describe, expect, it } from "vitest";
import { BALL } from "../config/constants";
import { createInitialKeeperState } from "../goalkeeper/KeeperAI";
import { intersectsKeeper } from "./keeperCollision";

describe("keeper collision", () => {
  it("uses the visible keeper silhouette instead of a result roll", () => {
    const keeper = createInitialKeeperState();
    expect(intersectsKeeper({ x: 0, y: 0.92 }, BALL.radius, keeper)).toBe(
      true,
    );
    expect(intersectsKeeper({ x: 2.8, y: 2.1 }, BALL.radius, keeper)).toBe(
      false,
    );
  });
});
