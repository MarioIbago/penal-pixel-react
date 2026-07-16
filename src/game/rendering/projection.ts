import type { Vec2, Vec3 } from '../core/types'

export const GOAL_WIDTH = 7.32
export const GOAL_HEIGHT = 2.44
export const GOAL_DISTANCE = 11
export const BALL_RADIUS = 0.11

const GOAL_IMAGE_MOUTH_X = 0.108
const GOAL_IMAGE_MOUTH_Y = 0.214
const GOAL_IMAGE_MOUTH_WIDTH = 0.784
const GOAL_IMAGE_MOUTH_HEIGHT = 0.584
const GOAL_IMAGE_MOUTH_BOTTOM = GOAL_IMAGE_MOUTH_Y + GOAL_IMAGE_MOUTH_HEIGHT

// The generated goal sprite is intentionally stretched so its visible mouth
// matches the real 7.32 m x 2.44 m goal. Deriving the image height from its
// width keeps horizontal and vertical world-space projection at one scale.
const GOAL_IMAGE_HEIGHT_PER_WIDTH =
  GOAL_IMAGE_MOUTH_WIDTH /
  ((GOAL_WIDTH / GOAL_HEIGHT) * GOAL_IMAGE_MOUTH_HEIGHT)
const RESPONSIVE_BLEND_START = 1.05
const RESPONSIVE_BLEND_END = 1.6

const smoothstep = (value: number): number => {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

const responsiveBlendForAspect = (aspect: number): number =>
  smoothstep(
    (aspect - RESPONSIVE_BLEND_START) /
      (RESPONSIVE_BLEND_END - RESPONSIVE_BLEND_START),
  )

const mix = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface StageLayout {
  width: number
  height: number
  portrait: boolean
  goalImage: Rect
  goalMouth: Rect
  projection: Projection
}

export interface ProjectedPoint extends Vec2 {
  scale: number
}

export class Projection {
  readonly cameraZ = -2.4
  readonly cameraY: number
  readonly focalLength: number
  readonly centerX: number
  readonly centerY: number
  readonly goalScale: number

  constructor(
    readonly goalMouth: Rect,
    desiredBallY: number,
  ) {
    this.goalScale = goalMouth.width / GOAL_WIDTH
    this.centerX = goalMouth.x + goalMouth.width / 2

    const cameraFactor = (GOAL_DISTANCE - this.cameraZ) / -this.cameraZ
    const desiredDelta = (desiredBallY - (goalMouth.y + goalMouth.height)) / this.goalScale
    this.cameraY = (desiredDelta + cameraFactor * BALL_RADIUS) / (cameraFactor - 1)
    this.focalLength = this.goalScale * (GOAL_DISTANCE - this.cameraZ)
    this.centerY = goalMouth.y + goalMouth.height - this.goalScale * this.cameraY
  }

  project(point: Vec3): ProjectedPoint {
    const depth = Math.max(0.35, point.z - this.cameraZ)
    const scale = this.focalLength / depth
    return {
      x: this.centerX + point.x * scale,
      y: this.centerY - (point.y - this.cameraY) * scale,
      scale,
    }
  }

  targetFromCanvas(point: Vec2): Vec2 {
    const bottom = this.goalMouth.y + this.goalMouth.height
    return {
      x: Math.max(-5.4, Math.min(5.4, (point.x - this.centerX) / this.goalScale)),
      y: Math.max(0.04, Math.min(4.1, (bottom - point.y) / this.goalScale)),
    }
  }

  targetToCanvas(target: Vec2): Vec2 {
    return {
      x: this.centerX + target.x * this.goalScale,
      y: this.goalMouth.y + this.goalMouth.height - target.y * this.goalScale,
    }
  }
}

export const getStageLayout = (width: number, height: number): StageLayout => {
  const aspect = height / width
  const portrait = aspect > 1.18
  const responsiveBlend = responsiveBlendForAspect(aspect)
  const goalImageWidth = width * mix(0.67, 1.05, responsiveBlend)
  const goalImageHeight = goalImageWidth * GOAL_IMAGE_HEIGHT_PER_WIDTH
  const goalLineY = height * mix(0.565, 0.552, responsiveBlend)
  const goalImage: Rect = {
    x: (width - goalImageWidth) / 2,
    y: goalLineY - goalImageHeight * GOAL_IMAGE_MOUTH_BOTTOM,
    width: goalImageWidth,
    height: goalImageHeight,
  }

  const goalMouth: Rect = {
    x: goalImage.x + goalImage.width * GOAL_IMAGE_MOUTH_X,
    y: goalImage.y + goalImage.height * GOAL_IMAGE_MOUTH_Y,
    width: goalImage.width * GOAL_IMAGE_MOUTH_WIDTH,
    height: goalImage.height * GOAL_IMAGE_MOUTH_HEIGHT,
  }

  const desiredBallY = height * mix(0.71, 0.72, responsiveBlend)
  const projection = new Projection(goalMouth, desiredBallY)

  return { width, height, portrait, goalImage, goalMouth, projection }
}
