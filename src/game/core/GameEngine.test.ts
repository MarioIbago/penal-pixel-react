import { describe, expect, it, vi } from "vitest";
import { GOAL } from "../config/constants";
import { GameEngine } from "./GameEngine";
import type { GameSnapshot, Outcome } from "./types";

const advanceUntilResolved = (engine: GameEngine): Outcome => {
  for (let index = 0; index < 240; index += 1) {
    engine.update(1 / 120);
    const snapshot = engine.getSnapshot();
    if (snapshot.phase === "resolved" && snapshot.outcome) {
      return snapshot.outcome;
    }
  }
  throw new Error("shot did not resolve");
};

describe("GameEngine", () => {
  it("accepts one continuous target and emits kick/outcome/reset events", () => {
    const onKick = vi.fn();
    const onOutcome = vi.fn();
    const onReset = vi.fn();
    const engine = new GameEngine({ onKick, onOutcome, onReset }, 1234);

    expect(engine.shoot({ x: 1.237, y: 1.814 })).toBe(true);
    expect(engine.shoot({ x: -1, y: 1 })).toBe(false);
    expect(onKick).toHaveBeenCalledWith({ x: 1.237, y: 1.814 });
    expect(advanceUntilResolved(engine)).toMatch(/GOAL|SAVE|POST|OUT/);
    expect(onOutcome).toHaveBeenCalledTimes(1);

    for (let index = 0; index < 150; index += 1) engine.update(1 / 120);
    expect(engine.getSnapshot().phase).toBe("ready");
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("returns detached snapshots that cannot mutate engine state", () => {
    const engine = new GameEngine({}, 99);
    const snapshot = engine.getSnapshot();
    snapshot.ball.position.x = 999;
    snapshot.keeper.position.x = 999;
    expect(engine.getSnapshot().ball.position.x).toBe(0);
    expect(engine.getSnapshot().keeper.position.x).toBe(0);
  });

  it("resolves a far-off aim as a physical miss", () => {
    const engine = new GameEngine({}, 81);
    engine.shoot({ x: 5.2, y: 3.3 });
    expect(advanceUntilResolved(engine)).toBe("OUT");
  });

  it("does not award a goal until the complete ball crosses the line", () => {
    const goalSnapshots: GameSnapshot[] = [];

    for (let seed = 1; seed <= 40 && goalSnapshots.length === 0; seed += 1) {
      const engine = new GameEngine(
        {
          onOutcome: (outcome, snapshot) => {
            if (outcome === "GOAL") goalSnapshots.push(snapshot);
          },
        },
        seed,
      );
      engine.shoot({ x: 2.75, y: 1.75 });
      advanceUntilResolved(engine);
    }

    const goalSnapshot = goalSnapshots[0];
    expect(goalSnapshot).toBeDefined();
    if (!goalSnapshot) throw new Error("No seeded goal was produced");
    expect(goalSnapshot.ball.position.z).toBeGreaterThanOrEqual(
      GOAL.planeZ + goalSnapshot.ball.radius - 1e-9,
    );
  });

  it("keeps a valid right-corner goal inside the net for the result animation", () => {
    let scoredEngine: GameEngine | null = null;

    for (let seed = 1; seed <= 60 && !scoredEngine; seed += 1) {
      const engine = new GameEngine({}, seed);
      engine.shoot({ x: 3.48, y: 1.55 });
      if (advanceUntilResolved(engine) === "GOAL") scoredEngine = engine;
    }

    expect(scoredEngine).not.toBeNull();
    if (!scoredEngine) throw new Error("No seeded right-corner goal was produced");

    for (let index = 0; index < 100; index += 1) {
      const snapshot = scoredEngine.getSnapshot();
      expect(snapshot.phase).toBe("resolved");
      expect(snapshot.outcome).toBe("GOAL");
      expect(Math.abs(snapshot.ball.position.x)).toBeLessThanOrEqual(
        GOAL.halfWidth - snapshot.ball.radius + 1e-9,
      );
      expect(snapshot.ball.position.y).toBeLessThanOrEqual(
        GOAL.height - snapshot.ball.radius + 1e-9,
      );
      scoredEngine.update(1 / 120);
    }
  });
});
