/**
 * # GameEngine.ts
 * 
 * Este archivo contiene la clase principal `GameEngine`.
 * Es responsable de gestionar el ciclo de vida de un tiro penal:
 * - Mantener el estado de la pelota (`BallState`) y el portero (`KeeperState`).
 * - Calcular las físicas y detectar colisiones (gol, poste, atajada) en cada frame (tick).
 * - Ejecutar el evento `onOutcome` cuando se resuelve el tiro.
 * 
 * Si se desea integrar con otra aplicación (como una app de matemáticas),
 * se podría modificar el método `kick(targetX, targetY)` aquí para que acepte
 * un flag `forcedSave: boolean` y lo pase a la IA del portero.
 */
import {
  ADAPTIVE_KEEPER,
  DEFAULT_KEEPER_DIFFICULTY,
  ENGINE,
  GOAL,
} from "../config/constants";
import {
  classifyGoalCrossing,
  intersectsKeeper,
  interpolateForwardPlaneCrossing,
} from "../collision";
import {
  createInitialKeeperState,
  createKeeperPlan,
  markKeeperSaved,
  settleKeeper,
  updateKeeper,
  type KeeperPlan,
} from "../goalkeeper/KeeperAI";
import {
  createInitialBallState,
  collideBallWithGoalNet,
  dampResolvedBall,
  deflectFromFrame,
  deflectFromKeeper,
  integrateBall,
  launchBall,
  type ShotPhysics,
} from "../physics/ballPhysics";
import { SeededRandom } from "../random/SeededRandom";
import type {
  BallState,
  GameEvents,
  GamePhase,
  GameSnapshot,
  KeeperState,
  Outcome,
  Vec2,
  Vec3,
} from "./types";

export interface GameEngineOptions {
  keeperDifficulty?: number;
  autoResetDelay?: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const cloneBall = (ball: BallState): BallState => ({
  ...ball,
  position: { ...ball.position },
  previousPosition: { ...ball.previousPosition },
  velocity: { ...ball.velocity },
  spin: { ...ball.spin },
});

const cloneKeeper = (keeper: KeeperState): KeeperState => ({
  ...keeper,
  position: { ...keeper.position },
  velocity: { ...keeper.velocity },
  target: { ...keeper.target },
});

/**
 * Framework-agnostic penalty engine. World units are metres: x runs across the
 * goal, y points upward and z runs from the ball towards the goal line.
 */
export class GameEngine {
  private readonly events: GameEvents;
  private readonly random: SeededRandom;
  private keeperDifficulty: number;
  private readonly autoResetDelay: number;
  private streak = 0;
  private readonly targetHistory: Vec2[] = [];

  private phase: GamePhase = "ready";
  private ball: BallState = createInitialBallState();
  private keeper: KeeperState = createInitialKeeperState();
  private target: Vec2 | null = null;
  private outcome: Outcome | null = null;
  private trail: Vec3[] = [];
  private keeperTrail: Vec2[] = [];
  private resultAge = 0;
  private elapsed = 0;
  private kickProgress = 0;
  private accumulator = 0;
  private shotPhysics: ShotPhysics | null = null;
  private keeperPlan: KeeperPlan | null = null;
  private pendingGoal = false;

  public constructor(
    events: GameEvents = {},
    seed: number = Date.now(),
    options: GameEngineOptions = {},
  ) {
    this.events = events;
    this.random = new SeededRandom(seed);
    this.keeperDifficulty = clamp(
      options.keeperDifficulty ?? DEFAULT_KEEPER_DIFFICULTY,
      0,
      1,
    );
    this.autoResetDelay = Math.max(
      0.1,
      options.autoResetDelay ?? ENGINE.resultDuration,
    );
  }

  public setStreak(streak: number): void {
    this.streak = Math.max(0, Math.trunc(streak));
  }

  public shoot(target: Vec2): boolean {
    if (
      this.phase !== "ready" ||
      !Number.isFinite(target.x) ||
      !Number.isFinite(target.y)
    ) {
      return false;
    }

    this.phase = "flight";
    this.target = { x: target.x, y: target.y };
    this.outcome = null;
    this.resultAge = 0;
    this.elapsed = 0;
    this.kickProgress = 0;
    this.accumulator = 0;
    this.trail = [{ ...this.ball.position }];
    this.keeperTrail = [{ ...this.keeper.position }];
    this.keeper = createInitialKeeperState();
    this.pendingGoal = false;

    this.shotPhysics = launchBall(this.ball, target, this.random);
    const keeperImpactTime =
      this.shotPhysics.flightTime * (GOAL.keeperPlaneZ / GOAL.planeZ);
    this.keeperPlan = createKeeperPlan(
      this.shotPhysics.actualTarget,
      keeperImpactTime,
      this.random,
      this.getAdaptiveDifficulty(),
      this.readPlayerTarget(),
    );
    this.rememberTarget(target);

    this.events.onKick?.({ ...this.target });
    return true;
  }

  public update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    this.accumulator += Math.min(deltaSeconds, ENGINE.maximumFrameDelta);
    while (this.accumulator + Number.EPSILON >= ENGINE.fixedStep) {
      this.step(ENGINE.fixedStep);
      this.accumulator -= ENGINE.fixedStep;
    }
  }

  public reset(): void {
    this.resetInternal(true);
  }

  public getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      ball: cloneBall(this.ball),
      keeper: cloneKeeper(this.keeper),
      trail: this.trail.map((point) => ({ ...point })),
      keeperTrail: this.keeperTrail.map((point) => ({ ...point })),
      target: this.target ? { ...this.target } : null,
      outcome: this.outcome,
      resultAge: this.resultAge,
      kickProgress: this.kickProgress,
      elapsed: this.elapsed,
    };
  }

  private step(deltaSeconds: number): void {
    if (this.phase === "flight") {
      this.stepFlight(deltaSeconds);
      return;
    }
    if (this.phase === "resolved") {
      this.stepResolved(deltaSeconds);
    }
  }

  private stepFlight(deltaSeconds: number): void {
    if (!this.shotPhysics || !this.keeperPlan) {
      this.resolve("OUT");
      return;
    }

    this.elapsed += deltaSeconds;
    updateKeeper(
      this.keeper,
      this.keeperPlan,
      this.elapsed,
      deltaSeconds,
    );
    integrateBall(
      this.ball,
      deltaSeconds,
      this.shotPhysics.curveAcceleration,
      true,
    );
    this.kickProgress = clamp(this.ball.position.z / GOAL.planeZ, 0, 1);
    this.pushTrail(this.ball.position, this.keeper.position);

    if (this.pendingGoal) {
      const fullCrossing = interpolateForwardPlaneCrossing(
        this.ball.previousPosition,
        this.ball.position,
        GOAL.planeZ + this.ball.radius,
      );
      if (fullCrossing) {
        this.completeGoal();
      }
      return;
    }

    const keeperCrossing = interpolateForwardPlaneCrossing(
      this.ball.previousPosition,
      this.ball.position,
      GOAL.keeperPlaneZ,
    );
    if (
      keeperCrossing &&
      intersectsKeeper(
        { x: keeperCrossing.x, y: keeperCrossing.y },
        this.ball.radius,
        this.keeper,
      )
    ) {
      this.ball.position = { ...keeperCrossing };
      deflectFromKeeper(this.ball, this.keeper.position);
      markKeeperSaved(this.keeper);
      this.resolve("SAVE");
      return;
    }

    const goalCrossing = interpolateForwardPlaneCrossing(
      this.ball.previousPosition,
      this.ball.position,
      GOAL.planeZ,
    );
    if (goalCrossing) {
      const crossing = { x: goalCrossing.x, y: goalCrossing.y };
      const result = classifyGoalCrossing(crossing, this.ball.radius);
      if (result === "POST") {
        this.ball.position = { ...goalCrossing };
        deflectFromFrame(this.ball, crossing);
      } else if (result === "GOAL") {
        const fullCrossing = interpolateForwardPlaneCrossing(
          this.ball.previousPosition,
          this.ball.position,
          GOAL.planeZ + this.ball.radius,
        );
        if (fullCrossing) {
          this.completeGoal();
        } else {
          // Keep simulating until the complete ball has crossed the line.
          this.pendingGoal = true;
        }
        return;
      }
      this.resolve(result);
      return;
    }

    if (
      this.elapsed >= ENGINE.maximumFlightDuration ||
      this.ball.position.z < -2 ||
      (this.ball.velocity.z <= 0 && this.ball.position.z < GOAL.planeZ)
    ) {
      this.resolve("OUT");
    }
  }

  private stepResolved(deltaSeconds: number): void {
    this.resultAge += deltaSeconds;
    this.elapsed += deltaSeconds;
    settleKeeper(this.keeper, deltaSeconds, this.outcome === "SAVE");

    integrateBall(this.ball, deltaSeconds, 0, true);
    if (this.outcome === "GOAL") collideBallWithGoalNet(this.ball);
    const damping = this.outcome === "GOAL" ? 2.9 : 2.2;
    dampResolvedBall(this.ball, deltaSeconds, damping);
    if (
      this.outcome === "GOAL" &&
      this.ball.position.z > GOAL.planeZ + GOAL.netDepth
    ) {
      this.ball.position.z = GOAL.planeZ + GOAL.netDepth;
      this.ball.velocity.z = -Math.abs(this.ball.velocity.z) * 0.18;
    }
    this.pushTrail(this.ball.position, this.keeper.position);

    if (this.resultAge + Number.EPSILON >= this.autoResetDelay) {
      this.resetInternal(true);
    }
  }

  private resolve(outcome: Outcome): void {
    if (this.phase !== "flight") return;
    this.phase = "resolved";
    this.outcome = outcome;
    this.resultAge = 0;
    this.events.onOutcome?.(outcome, this.getSnapshot());
  }

  private completeGoal(): void {
    this.ball.velocity.x *= 0.62;
    this.ball.velocity.y *= 0.62;
    this.ball.velocity.z *= 0.34;
    collideBallWithGoalNet(this.ball);
    const latestTrailPoint = this.trail.length - 1;
    if (latestTrailPoint >= 0) {
      this.trail[latestTrailPoint] = { ...this.ball.position };
    }
    this.resolve("GOAL");
  }

  private pushTrail(point: Vec3, keeperPoint: Vec2): void {
    this.trail.push({ ...point });
    if (this.trail.length > ENGINE.trailLength) {
      this.trail.splice(0, this.trail.length - ENGINE.trailLength);
    }
    this.keeperTrail.push({ ...keeperPoint });
    if (this.keeperTrail.length > ENGINE.trailLength) {
      this.keeperTrail.splice(0, this.keeperTrail.length - ENGINE.trailLength);
    }
  }

  private getAdaptiveDifficulty(): number {
    return clamp(
      ADAPTIVE_KEEPER.baseDifficulty +
        this.streak * ADAPTIVE_KEEPER.streakStep +
        this.keeperDifficulty,
      0,
      ADAPTIVE_KEEPER.maximumDifficulty,
    );
  }

  private readPlayerTarget(): { targetHistory: Vec2[] } {
    return {
      targetHistory: this.targetHistory,
    };
  }

  private rememberTarget(target: Vec2): void {
    this.targetHistory.push({ ...target });
    if (this.targetHistory.length > ADAPTIVE_KEEPER.historyLimit) {
      this.targetHistory.splice(
        0,
        this.targetHistory.length - ADAPTIVE_KEEPER.historyLimit,
      );
    }
  }

  private resetInternal(emitEvent: boolean): void {
    this.phase = "ready";
    this.ball = createInitialBallState();
    this.keeper = createInitialKeeperState();
    this.target = null;
    this.outcome = null;
    this.trail = [];
    this.keeperTrail = [];
    this.resultAge = 0;
    this.elapsed = 0;
    this.kickProgress = 0;
    this.accumulator = 0;
    this.shotPhysics = null;
    this.keeperPlan = null;
    this.pendingGoal = false;
    if (emitEvent) this.events.onReset?.();
  }
}

export default GameEngine;
