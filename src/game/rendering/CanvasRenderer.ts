import type { GameSnapshot, KeeperPose, Outcome, Vec2, Vec3 } from '../core/types'
import type { GameAssets } from './assets'
import { getStageLayout, type StageLayout } from './projection'

const RESULT_LABELS: Record<Outcome, string> = {
  GOAL: '¡GOOOL!',
  SAVE: '¡ATAJADA!',
  POST: '¡POSTE!',
  OUT: 'FUERA',
}

const RESULT_COLORS: Record<Outcome, string> = {
  GOAL: '#fff0ca',
  SAVE: '#a8f4ff',
  POST: '#ffc857',
  OUT: '#fff0ca',
}

/** Atlas order: ready, crouch, high-left; low-left, high-right, low-right. */
export const POSE_INDEX: Record<KeeperPose, number> = {
  ready: 0,
  crouch: 1,
  'high-left': 2,
  'low-left': 3,
  'high-right': 4,
  'low-right': 5,
}

interface KeeperSpriteSpec {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  /** Visible pose height in world metres. */
  worldHeight: number
}

/**
 * Tight per-pose crops remove the atlas' uneven transparent padding. The
 * destination sizes are expressed in world metres, so the keeper keeps the
 * same proportion relative to the 2.44 m goal on every viewport.
 */
const KEEPER_SPRITES: Record<KeeperPose, KeeperSpriteSpec> = {
  ready: {
    cropX: 136 / 512,
    cropY: 110 / 512,
    cropWidth: 294 / 512,
    cropHeight: 355 / 512,
    worldHeight: 1.9,
  },
  crouch: {
    cropX: 140 / 512,
    cropY: 159 / 512,
    cropWidth: 372 / 512,
    cropHeight: 305 / 512,
    worldHeight: 1.55,
  },
  'high-left': {
    cropX: 0,
    cropY: 119 / 512,
    cropWidth: 419 / 512,
    cropHeight: 331 / 512,
    worldHeight: 1.78,
  },
  'low-left': {
    cropX: 40 / 512,
    cropY: 145 / 512,
    cropWidth: 424 / 512,
    cropHeight: 233 / 512,
    worldHeight: 1.18,
  },
  'high-right': {
    cropX: 60 / 512,
    cropY: 44 / 512,
    cropWidth: 420 / 512,
    cropHeight: 326 / 512,
    worldHeight: 1.78,
  },
  'low-right': {
    cropX: 46 / 512,
    cropY: 145 / 512,
    cropWidth: 420 / 512,
    cropHeight: 233 / 512,
    worldHeight: 1.18,
  },
}

const EFFECT_INDEX: Record<Outcome, number> = {
  GOAL: 0,
  SAVE: 1,
  POST: 2,
  OUT: 3,
}

const BALL_VISUAL_SCALE = 1.35
const MINIMUM_BALL_SIZE = 12

const drawCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (image.naturalWidth - sourceWidth) / 2
  const sourceY = (image.naturalHeight - sourceHeight) / 2
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    width,
    height,
  )
}

const drawPixelShadow = (
  context: CanvasRenderingContext2D,
  point: Vec2,
  width: number,
  alpha: number,
): void => {
  context.fillStyle = `rgba(2, 7, 15, ${alpha})`
  context.fillRect(Math.round(point.x - width * 0.42), Math.round(point.y - 2), Math.round(width * 0.84), 5)
  context.fillRect(Math.round(point.x - width * 0.32), Math.round(point.y - 5), Math.round(width * 0.64), 3)
}

export interface RenderOptions {
  aim: Vec2
  reducedMotion: boolean
}

export class CanvasRenderer {
  private layout: StageLayout

  constructor(
    private readonly context: CanvasRenderingContext2D,
    private readonly assets: GameAssets,
  ) {
    this.layout = getStageLayout(context.canvas.width, context.canvas.height)
  }

  resize(width: number, height: number): void {
    this.layout = getStageLayout(width, height)
  }

  getLayout(): StageLayout {
    return this.layout
  }

  render(snapshot: GameSnapshot, options: RenderOptions): void {
    const { context, assets, layout } = this
    context.save()
    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, layout.width, layout.height)

    drawCover(
      context,
      layout.portrait ? assets.stadiumPortrait : assets.stadiumLandscape,
      layout.width,
      layout.height,
    )

    const shake = snapshot.outcome === 'POST' && snapshot.resultAge < 0.34 && !options.reducedMotion
      ? Math.round(Math.sin(snapshot.resultAge * 92) * (1 - snapshot.resultAge / 0.34) * 5)
      : 0

    this.drawGoal(shake)
    if (snapshot.keeperTrail) this.drawKeeperTrail(snapshot.keeperTrail)
    this.drawKeeper(snapshot)
    if (snapshot.trail) this.drawBallTrail(snapshot.trail)
    this.drawLeg(snapshot)
    if (snapshot.outcome) this.drawResult(snapshot, options.reducedMotion)
    this.drawBall(snapshot)
    this.drawGoalLineCue(snapshot)

    if (snapshot.phase === 'ready') this.drawReticle(options.aim)

    context.restore()
  }

  private drawGoal(offsetX: number): void {
    const { context, assets, layout } = this
    context.drawImage(
      assets.goal,
      Math.round(layout.goalImage.x + offsetX),
      Math.round(layout.goalImage.y),
      Math.round(layout.goalImage.width),
      Math.round(layout.goalImage.height),
    )
  }

  private drawKeeper(snapshot: GameSnapshot): void {
    const { context, assets, layout } = this
    const keeper = snapshot.keeper
    const projected = layout.projection.project({
      x: keeper.x,
      y: keeper.y,
      z: 10.55,
    })
    const cellWidth = assets.keeperAtlas.naturalWidth / 3
    const cellHeight = assets.keeperAtlas.naturalHeight / 2
    const index = POSE_INDEX[keeper.pose]
    const column = index % 3
    const row = Math.floor(index / 3)
    const sprite = KEEPER_SPRITES[keeper.pose]
    const sourceX = column * cellWidth + cellWidth * sprite.cropX
    const sourceY = row * cellHeight + cellHeight * sprite.cropY
    const sourceWidth = cellWidth * sprite.cropWidth
    const sourceHeight = cellHeight * sprite.cropHeight
    const destinationHeight = projected.scale * sprite.worldHeight
    const destinationWidth = destinationHeight * (sourceWidth / sourceHeight)
    const drawX = projected.x - destinationWidth / 2
    const drawY = projected.y - destinationHeight / 2

    context.save()
    if (keeper.saveFlash > 0) {
      context.globalAlpha = 0.72 + keeper.saveFlash * 0.28
      context.filter = `brightness(${1 + keeper.saveFlash * 1.15})`
    }
    context.drawImage(
      assets.keeperAtlas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      Math.round(drawX),
      Math.round(drawY),
      Math.round(destinationWidth),
      Math.round(destinationHeight),
    )
    context.restore()
  }

  private drawBallTrail(trail: readonly Vec3[]): void {
    const { context, layout } = this
    const firstVisible = Math.max(0, trail.length - 14)
    for (let index = firstVisible; index < trail.length - 1; index += 2) {
      const point = layout.projection.project(trail[index] as Vec3)
      const progress = (index - firstVisible + 1) / Math.max(1, trail.length - firstVisible)
      const size = Math.max(3, Math.round(point.scale * 0.036))
      context.fillStyle = `rgba(255, 240, 202, ${progress * 0.62})`
      context.beginPath()
      context.arc(Math.round(point.x), Math.round(point.y), size / 1.5, 0, Math.PI * 2)
      context.fill()
    }
  }

  private drawKeeperTrail(trail: readonly Vec2[]): void {
    const { context, layout } = this
    const firstVisible = Math.max(0, trail.length - 10)
    for (let index = firstVisible; index < trail.length - 1; index += 2) {
      const point = layout.projection.project({
        x: trail[index]!.x,
        y: trail[index]!.y,
        z: 10.55,
      })
      const progress = (index - firstVisible + 1) / Math.max(1, trail.length - firstVisible)
      const size = Math.max(4, Math.round(point.scale * 0.05))
      context.fillStyle = `rgba(168, 244, 255, ${progress * 0.5})`
      context.beginPath()
      context.arc(Math.round(point.x), Math.round(point.y), size / 1.5, 0, Math.PI * 2)
      context.fill()
    }
  }

  private drawBall(snapshot: GameSnapshot): void {
    const { context, assets, layout } = this
    const ball = snapshot.ball
    const point = layout.projection.project(ball.position)
    const ground = layout.projection.project({
      x: ball.position.x,
      y: 0,
      z: ball.position.z,
    })
    const physicalDiameter = ball.radius * 2 * point.scale
    const destinationSize = Math.max(
      MINIMUM_BALL_SIZE,
      Math.round(physicalDiameter * BALL_VISUAL_SCALE),
    )
    const heightRatio = Math.max(0, Math.min(1, ball.position.y / 2.5))
    drawPixelShadow(
      context,
      ground,
      destinationSize * 1.12,
      0.34 * (1 - heightRatio * 0.58),
    )

    const cellWidth = assets.ballStrip.naturalWidth / 4
    const sourceHeight = assets.ballStrip.naturalHeight
    const frame = Math.abs(Math.floor(ball.rotation / (Math.PI / 2))) % 4
    const netProgress = Math.max(0, Math.min(1, (ball.position.z - 10.55) / 0.72))
    if (netProgress > 0) {
      const glowSize = destinationSize * (1.3 + netProgress * 0.35)
      const glowInset = Math.max(1, Math.round(glowSize * 0.14))
      context.fillStyle = `rgba(255, 240, 202, ${0.24 * netProgress})`
      context.fillRect(
        Math.round(point.x - glowSize / 2 + glowInset),
        Math.round(point.y - glowSize / 2),
        Math.round(glowSize - glowInset * 2),
        Math.round(glowSize),
      )
      context.fillRect(
        Math.round(point.x - glowSize / 2),
        Math.round(point.y - glowSize / 2 + glowInset),
        Math.round(glowSize),
        Math.round(glowSize - glowInset * 2),
      )
    }
    context.drawImage(
      assets.ballStrip,
      frame * cellWidth,
      0,
      cellWidth,
      sourceHeight,
      Math.round(point.x - destinationSize / 2),
      Math.round(point.y - destinationSize / 2),
      Math.round(destinationSize),
      Math.round(destinationSize),
    )
  }

  private drawGoalLineCue(snapshot: GameSnapshot): void {
    const { context, layout } = this
    if (snapshot.phase !== 'flight' && snapshot.outcome !== 'GOAL') return
    const ball = snapshot.ball
    const crossingProgress = Math.max(0, Math.min(1, (ball.position.z - 10.76) / 0.48))
    const goalFlash = snapshot.outcome === 'GOAL'
      ? Math.max(0, 1 - snapshot.resultAge / 0.42)
      : crossingProgress
    if (goalFlash <= 0) return

    const ballPoint = layout.projection.project(ball.position)
    const pixel = Math.max(3, Math.round(layout.goalMouth.width * 0.006))
    const netY = Math.max(layout.goalMouth.y, Math.min(layout.goalMouth.y + layout.goalMouth.height, ballPoint.y))
    context.save()
    context.globalAlpha = Math.min(0.86, goalFlash)
    context.fillStyle = '#fff0ca'
    for (let offset = -2; offset <= 2; offset += 1) {
      const x = Math.round(ballPoint.x + offset * pixel * 3)
      context.fillRect(x, Math.round(netY - pixel), pixel, pixel * 2)
    }
    context.fillStyle = '#19b858'
    context.fillRect(
      Math.round(ballPoint.x - pixel * 7),
      Math.round(netY + pixel * 3),
      pixel * 14,
      pixel,
    )
    context.fillStyle = '#d8402f'
    context.fillRect(
      Math.round(ballPoint.x - pixel * 5),
      Math.round(netY - pixel * 4),
      pixel * 10,
      pixel,
    )
    context.restore()
  }

  private drawLeg(snapshot: GameSnapshot): void {
    const { context, assets, layout } = this
    if (snapshot.phase === 'resolved' && snapshot.resultAge > 0.28) return

    const cellWidth = assets.legStrip.naturalWidth / 3
    const sourceY = assets.legStrip.naturalHeight * 0.1
    const sourceHeight = assets.legStrip.naturalHeight * 0.7
    const frame = snapshot.phase === 'ready'
      ? 0
      : snapshot.kickProgress < 0.14
        ? 1
        : 2
    const destinationHeight = layout.height * (layout.portrait ? 0.36 : 0.42)
    const destinationWidth = destinationHeight * (cellWidth / sourceHeight)
    const shift = frame === 2 ? destinationWidth * 0.1 : 0

    context.drawImage(
      assets.legStrip,
      frame * cellWidth,
      sourceY,
      cellWidth,
      sourceHeight,
      Math.round(layout.width / 2 - destinationWidth / 2 + shift),
      Math.round(
        layout.height - destinationHeight * (layout.portrait ? 0.78 : 0.62),
      ),
      Math.round(destinationWidth),
      Math.round(destinationHeight),
    )
  }

  private drawReticle(aim: Vec2): void {
    const { context, layout } = this
    const point = layout.projection.targetToCanvas(aim)
    const size = Math.max(10, Math.min(18, layout.width * 0.025))
    const x = Math.round(point.x)
    const y = Math.round(point.y)

    context.fillStyle = 'rgba(4, 10, 32, 0.82)'
    context.fillRect(x - 2, y - size - 2, 4, size * 2 + 4)
    context.fillRect(x - size - 2, y - 2, size * 2 + 4, 4)
    context.fillStyle = '#fff0ca'
    context.fillRect(x - 1, y - size, 2, size * 2)
    context.fillRect(x - size, y - 1, size * 2, 2)
    context.clearRect(x - 3, y - 3, 6, 6)
  }

  private drawResult(snapshot: GameSnapshot, reducedMotion: boolean): void {
    const { context, assets, layout } = this
    const outcome = snapshot.outcome
    if (!outcome) return
    const age = snapshot.resultAge
    const effectCellWidth = assets.effectsStrip.naturalWidth / 4
    const sourceY = assets.effectsStrip.naturalHeight * 0.08
    const sourceHeight = assets.effectsStrip.naturalHeight * 0.5
    const progress = Math.min(1, age / 0.22)
    const fade = age > 0.76 ? Math.max(0, 1 - (age - 0.76) / 0.3) : 1
    const pulse = reducedMotion ? 1 : 0.82 + progress * 0.28
    const effectSize = Math.min(
      layout.goalMouth.width * 0.3,
      layout.goalMouth.height * 0.95,
    ) * pulse
    const targetPoint = snapshot.target
      ? layout.projection.targetToCanvas(snapshot.target)
      : null
    const followsShot = outcome === 'GOAL' || outcome === 'POST'
    const effectX = followsShot && targetPoint
      ? Math.max(
          layout.goalMouth.x,
          Math.min(layout.goalMouth.x + layout.goalMouth.width, targetPoint.x),
        )
      : layout.width / 2
    const effectY = followsShot && targetPoint
      ? Math.max(
          layout.goalMouth.y,
          Math.min(layout.goalMouth.y + layout.goalMouth.height, targetPoint.y),
        )
      : layout.goalMouth.y + layout.goalMouth.height * 0.47
    const index = EFFECT_INDEX[outcome]

    context.save()
    context.globalAlpha = fade
    context.drawImage(
      assets.effectsStrip,
      index * effectCellWidth,
      sourceY,
      effectCellWidth,
      sourceHeight,
      Math.round(effectX - effectSize / 2),
      Math.round(effectY - effectSize / 2),
      Math.round(effectSize),
      Math.round(effectSize),
    )

    const fontSize = Math.max(18, Math.min(44, layout.width * (layout.portrait ? 0.07 : 0.044)))
    context.font = `${fontSize}px "Press Start 2P", monospace`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    const labelY = Math.max(fontSize, layout.goalImage.y - fontSize * 0.12)
    context.fillStyle = '#040a20'
    context.fillText(RESULT_LABELS[outcome], layout.width / 2 + 4, labelY + 5)
    context.fillStyle = RESULT_COLORS[outcome]
    context.fillText(RESULT_LABELS[outcome], layout.width / 2, labelY)
    context.restore()
  }
}
