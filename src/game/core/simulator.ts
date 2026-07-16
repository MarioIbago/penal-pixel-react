import {
  BALL,
  DEFAULT_KEEPER_DIFFICULTY,
  GOAL,
} from "../config/constants";
import { SeededRandom } from "../random/SeededRandom";
import { GameEngine } from "./GameEngine";
import type { Outcome, Vec2 } from "./types";

export interface SimulationOptions {
  shots?: number;
  seed?: number;
  keeperDifficulty?: number;
}

export interface SimulationResult {
  shots: number;
  goals: number;
  saves: number;
  posts: number;
  outs: number;
  goalRate: number;
  saveRate: number;
  postRate: number;
  outRate: number;
}

export interface CalibrationOptions extends Omit<SimulationOptions, "keeperDifficulty"> {
  targetGoalRate?: number;
  minimumDifficulty?: number;
  maximumDifficulty?: number;
  steps?: number;
}

export interface CalibrationResult {
  difficulty: number;
  simulation: SimulationResult;
  absoluteError: number;
}

const increment = (
  counts: Record<Outcome, number>,
  outcome: Outcome,
): void => {
  counts[outcome] += 1;
};

/**
 * Fires seeded, uniformly distributed targets over the full physical frame.
 * It uses the same engine as the live game and never samples an outcome.
 */
export const simulateUniformShots = (
  options: SimulationOptions = {},
): SimulationResult => {
  const shots = Math.max(1, Math.trunc(options.shots ?? 2_000));
  const seed = Number.isFinite(options.seed) ? (options.seed as number) : 0xc0ffee;
  const targetRandom = new SeededRandom(seed ^ 0x9e3779b9);
  const engine = new GameEngine({}, seed, {
    keeperDifficulty:
      options.keeperDifficulty ?? DEFAULT_KEEPER_DIFFICULTY,
  });
  const counts: Record<Outcome, number> = {
    GOAL: 0,
    SAVE: 0,
    POST: 0,
    OUT: 0,
  };

  for (let index = 0; index < shots; index += 1) {
    const target: Vec2 = {
      x: targetRandom.range(-GOAL.halfWidth, GOAL.halfWidth),
      y: targetRandom.range(0, GOAL.height),
    };
    if (!engine.shoot(target)) {
      throw new Error("Seeded simulator attempted a kick before reset");
    }

    let outcome: Outcome | null = null;
    const maximumSteps = Math.ceil(2 / (1 / 120));
    for (let step = 0; step < maximumSteps; step += 1) {
      engine.update(1 / 120);
      const snapshot = engine.getSnapshot();
      if (snapshot.phase === "resolved" && snapshot.outcome) {
        outcome = snapshot.outcome;
        break;
      }
    }
    if (!outcome) throw new Error("A simulated shot did not resolve");
    increment(counts, outcome);
    engine.reset();
  }

  return {
    shots,
    goals: counts.GOAL,
    saves: counts.SAVE,
    posts: counts.POST,
    outs: counts.OUT,
    goalRate: counts.GOAL / shots,
    saveRate: counts.SAVE / shots,
    postRate: counts.POST / shots,
    outRate: counts.OUT / shots,
  };
};

export const simulateGoalRate = (options: SimulationOptions = {}): number =>
  simulateUniformShots(options).goalRate;

/** Grid-searches the physical keeper constant against a desired scoring rate. */
export const calibrateKeeperDifficulty = (
  options: CalibrationOptions = {},
): CalibrationResult => {
  const targetGoalRate = options.targetGoalRate ?? 0.6;
  const minimum = Math.max(0, Math.min(1, options.minimumDifficulty ?? 0));
  const maximum = Math.max(
    minimum,
    Math.min(1, options.maximumDifficulty ?? 1),
  );
  const steps = Math.max(2, Math.trunc(options.steps ?? 21));
  let best: CalibrationResult | null = null;

  for (let index = 0; index < steps; index += 1) {
    const amount = index / (steps - 1);
    const difficulty = minimum + (maximum - minimum) * amount;
    const simulation = simulateUniformShots({
      shots: options.shots,
      seed: options.seed,
      keeperDifficulty: difficulty,
    });
    const candidate: CalibrationResult = {
      difficulty,
      simulation,
      absoluteError: Math.abs(simulation.goalRate - targetGoalRate),
    };
    if (!best || candidate.absoluteError < best.absoluteError) best = candidate;
  }

  if (!best) {
    // `steps` is normalised to at least two, so this branch is only a static
    // exhaustiveness guard for strict TypeScript configurations.
    throw new Error("Keeper calibration produced no candidates");
  }
  return best;
};

export const DEFAULT_SIMULATION_TARGET_MIN_Y = BALL.radius;
