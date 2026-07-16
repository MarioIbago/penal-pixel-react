/**
 * # KeeperAI.ts
 * 
 * En este archivo reside la lógica de Inteligencia Artificial del portero.
 * Funciones clave:
 * - `getZone`: Divide la portería en 9 zonas (3x3).
 * - `createKeeperPlan`: Decide hacia dónde saltará el portero basado en
 *   el historial de tiros del jugador y un factor aleatorio (pesos).
 * - `updateKeeper`: Ejecuta la animación y el desplazamiento del portero a lo largo del tiempo.
 * 
 * Para la integración de Matemáticas:
 * Aquí se debe modificar `createKeeperPlan` para que si se le pasa el flag
 * `forcedSave = true`, adivine obligatoriamente la `actualZone` donde va el tiro
 * y su `reactionDelay` sea mínimo, garantizando así que ataje el disparo si el 
 * jugador respondió mal la pregunta.
 */
import { GOAL, KEEPER } from "../config/constants";
import type { KeeperState, Vec2 } from "../core/types";
import type { RandomSource } from "../random/SeededRandom";

export interface KeeperPlan {
  predictedTarget: Vec2;
  endPosition: Vec2;
  reactionDelay: number;
  impactTime: number;
  diveDirection: -1 | 0 | 1;
}

export interface KeeperRead {
  targetHistory: Vec2[];
}

type Zone = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const getZone = (pos: Vec2): Zone => {
  let col = 1;
  if (pos.x < -1.22) col = 0;
  else if (pos.x > 1.22) col = 2;

  let row = 1;
  if (pos.y > 1.63) row = 0;
  else if (pos.y < 0.81) row = 2;

  return (row * 3 + col) as Zone;
};

const getZoneCenter = (zone: number): Vec2 => {
  const row = Math.floor(zone / 3);
  const col = zone % 3;
  
  const x = col === 0 ? -1.83 : col === 1 ? 0 : 1.83;
  const y = row === 0 ? 1.83 : row === 1 ? 1.22 : 0.61;
  
  return { x, y };
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const lerp = (start: number, end: number, amount: number): number =>
  start + (end - start) * amount;

const smoothStep = (amount: number): number => {
  const t = clamp(amount, 0, 1);
  return t * t * (3 - 2 * t);
};

const directionOf = (horizontal: number): -1 | 0 | 1 => {
  if (horizontal > 0.18) return 1;
  if (horizontal < -0.18) return -1;
  return 0;
};

export const createInitialKeeperState = (): KeeperState => ({
  position: { ...KEEPER.home },
  x: KEEPER.home.x,
  y: KEEPER.home.y,
  velocity: { x: 0, y: 0 },
  target: { ...KEEPER.home },
  targetX: KEEPER.home.x,
  targetY: KEEPER.home.y,
  pose: "ready",
  diveDirection: 0,
  direction: 0,
  diveProgress: 0,
  reactionDelay: 0,
  elapsed: 0,
  committed: false,
  saveFlash: 0,
});

/**
 * Turns the observed trajectory into a physical dive plan. Difficulty only
 * changes reaction time, reach and observation error. The resulting save (or
 * miss) is still decided later by ball/silhouette intersection.
 */
export const createKeeperPlan = (
  actualImpact: Vec2,
  impactTime: number,
  random: RandomSource,
  difficulty: number,
  read: KeeperRead = { targetHistory: [] },
): KeeperPlan => {
  const skill = clamp(difficulty, 0, 1);
  const actualZone = getZone(actualImpact);
  
  // Calculate weights based on history (session tendencies)
  const weights: [number, number, number, number, number, number, number, number, number] = [1, 1, 1, 1, 1, 1, 1, 1, 1]; // Base probability weights for each zone
  const historyWeight = 2.0 + (skill * 8.0); // Learns much faster at higher difficulties
  
  for (let i = 0; i < read.targetHistory.length; i++) {
    const pastTarget = read.targetHistory[i];
    const pastZone = getZone(pastTarget!);
    // Give more weight to more recent shots
    const recency = (i + 1) / read.targetHistory.length;
    weights[pastZone] += historyWeight * recency;
  }
  
  // Add a base chance to just guess perfectly based on difficulty
  // Pro save rate is ~20-25%, so we make the keeper quite formidable at high streaks.
  const perfectGuessChance = lerp(0.02, 0.45, skill);
  
  let guessedZone = 4;
  
  if (random.next() < perfectGuessChance) {
    guessedZone = actualZone;
  } else {
    // Pick a random zone based on calculated weights
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = random.next() * totalWeight;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i as Zone];
      if (r <= 0) {
        guessedZone = i;
        break;
      }
    }
  }

  // If the keeper guesses correctly, they save it (dive to the ball's actual impact)
  // Otherwise, they dive to the center of the wrong zone they guessed.
  let predictedTarget: Vec2;
  if (guessedZone === actualZone) {
    predictedTarget = { ...actualImpact };
  } else {
    predictedTarget = getZoneCenter(guessedZone);
  }

  const diveDirection = directionOf(predictedTarget.x);
  
  // High skill reduces reaction delay
  const reactionDelay = clamp(
    lerp(0.78, 0.15, skill) + random.range(-0.034, 0.026),
    0.12,
    Math.max(0.13, impactTime - 0.17),
  );

  // The hands lead the body during a dive, so the centre deliberately stops
  // slightly short of the predicted impact point.
  const handLead = diveDirection * lerp(0.08, 0.3, skill);
  const endPosition: Vec2 = {
    x: clamp(predictedTarget.x - handLead, -2.48, 2.48),
    y: clamp(predictedTarget.y, 0.48, 1.84),
  };

  return {
    predictedTarget,
    endPosition,
    reactionDelay,
    impactTime,
    diveDirection,
  };
};

export const updateKeeper = (
  keeper: KeeperState,
  plan: KeeperPlan,
  shotElapsed: number,
  deltaSeconds: number,
): void => {
  const previous = { ...keeper.position };
  keeper.elapsed = shotElapsed;
  keeper.target = { ...plan.predictedTarget };
  keeper.targetX = plan.predictedTarget.x;
  keeper.targetY = plan.predictedTarget.y;
  keeper.reactionDelay = plan.reactionDelay;
  keeper.diveDirection = plan.diveDirection;
  keeper.direction = plan.diveDirection;

  if (shotElapsed < plan.reactionDelay) {
    const anticipation = smoothStep(shotElapsed / Math.max(plan.reactionDelay, 0.001));
    keeper.position.x = KEEPER.home.x;
    keeper.position.y = KEEPER.home.y - anticipation * 0.055;
    keeper.pose = anticipation < 0.18 ? "ready" : "crouch";
    keeper.diveProgress = 0;
    keeper.committed = false;
  } else {
    const availableTime = Math.max(0.08, plan.impactTime - plan.reactionDelay);
    const rawProgress = clamp(
      (shotElapsed - plan.reactionDelay) / availableTime,
      0,
      1,
    );
    const movement = smoothStep(rawProgress);
    const diveDistance = Math.abs(plan.endPosition.x - KEEPER.home.x);
    const arcHeight = plan.diveDirection !== 0 
      ? Math.sin(rawProgress * Math.PI) * (0.15 + diveDistance * 0.1)
      : 0;
      
    keeper.position.x = lerp(KEEPER.home.x, plan.endPosition.x, movement);
    keeper.position.y = lerp(
      KEEPER.home.y - 0.055,
      plan.endPosition.y,
      movement,
    ) + arcHeight;
    const isHigh = plan.predictedTarget.y > GOAL.height * 0.54;
    keeper.pose =
      plan.diveDirection < 0
        ? isHigh
          ? "high-left"
          : "low-left"
        : plan.diveDirection > 0
          ? isHigh
            ? "high-right"
            : "low-right"
          : "crouch";
    keeper.diveProgress = rawProgress;
    keeper.committed = true;
  }

  const inverseDelta = deltaSeconds > 0 ? 1 / deltaSeconds : 0;
  keeper.velocity.x = (keeper.position.x - previous.x) * inverseDelta;
  keeper.velocity.y = (keeper.position.y - previous.y) * inverseDelta;
  keeper.x = keeper.position.x;
  keeper.y = keeper.position.y;
  keeper.saveFlash = Math.max(0, keeper.saveFlash - deltaSeconds * 2.8);
};

export const settleKeeper = (
  keeper: KeeperState,
  deltaSeconds: number,
  saved: boolean,
): void => {
  keeper.elapsed += deltaSeconds;
  if (!saved && keeper.diveProgress < 0.05) keeper.pose = "crouch";
  keeper.saveFlash = Math.max(0, keeper.saveFlash - deltaSeconds * 2.8);
  const damping = Math.exp(-9 * deltaSeconds);
  keeper.velocity.x *= damping;
  keeper.velocity.y *= damping;
};

export const markKeeperSaved = (keeper: KeeperState): void => {
  keeper.saveFlash = 1;
};
