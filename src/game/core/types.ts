export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Outcome = "GOAL" | "SAVE" | "POST" | "OUT";

export type GamePhase = "ready" | "flight" | "resolved";

export type KeeperPose =
  | "ready"
  | "crouch"
  | "low-left"
  | "high-left"
  | "low-right"
  | "high-right";

export interface BallState {
  position: Vec3;
  previousPosition: Vec3;
  velocity: Vec3;
  spin: Vec3;
  radius: number;
  rotation: number;
  launched: boolean;
}

export interface KeeperState {
  /** Centre of the keeper silhouette on the goal plane, in metres. */
  position: Vec2;
  /** Flat aliases kept for renderers that consume sprite coordinates. */
  x: number;
  y: number;
  velocity: Vec2;
  /** The point the keeper currently believes the shot is heading towards. */
  target: Vec2;
  targetX: number;
  targetY: number;
  pose: KeeperPose;
  diveDirection: -1 | 0 | 1;
  direction: -1 | 0 | 1;
  diveProgress: number;
  reactionDelay: number;
  elapsed: number;
  committed: boolean;
  saveFlash: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  ball: BallState;
  keeper: KeeperState;
  trail: readonly Vec3[];
  keeperTrail: readonly Vec2[];
  /** The continuous goal-plane coordinate selected by the player. */
  target: Vec2 | null;
  outcome: Outcome | null;
  resultAge: number;
  kickProgress: number;
  /** Seconds elapsed since the current kick. Zero while ready. */
  elapsed: number;
}

export interface GameEvents {
  onKick?: (target: Vec2) => void;
  onOutcome?: (outcome: Outcome, snapshot: GameSnapshot) => void;
  onReset?: () => void;
}
