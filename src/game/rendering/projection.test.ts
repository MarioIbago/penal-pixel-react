import { describe, expect, it } from 'vitest'
import {
  GOAL_HEIGHT,
  GOAL_WIDTH,
  getStageLayout,
} from './projection'

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]

describe('responsive stage projection', () => {
  it.each(VIEWPORTS)(
    'keeps the visual goal mouth at the real 3:1 ratio in $width x $height',
    ({ width, height }) => {
      const { goalMouth } = getStageLayout(width, height)

      expect(goalMouth.width / goalMouth.height).toBeCloseTo(
        GOAL_WIDTH / GOAL_HEIGHT,
        10,
      )
    },
  )

  it.each(VIEWPORTS)(
    'aligns physical goal corners with the visual mouth in $width x $height',
    ({ width, height }) => {
      const { goalMouth, projection } = getStageLayout(width, height)
      const topRight = projection.targetToCanvas({
        x: GOAL_WIDTH / 2,
        y: GOAL_HEIGHT,
      })

      expect(topRight.x).toBeCloseTo(goalMouth.x + goalMouth.width, 8)
      expect(topRight.y).toBeCloseTo(goalMouth.y, 8)
    },
  )

  it('interpolates smoothly around the former portrait breakpoint', () => {
    const before = getStageLayout(1000, 1179)
    const after = getStageLayout(1000, 1181)
    const beforeMouthBottom =
      (before.goalMouth.y + before.goalMouth.height) / before.height
    const afterMouthBottom =
      (after.goalMouth.y + after.goalMouth.height) / after.height

    expect(Math.abs(after.goalImage.width - before.goalImage.width)).toBeLessThan(2)
    expect(Math.abs(afterMouthBottom - beforeMouthBottom)).toBeLessThan(0.0001)
  })

  it('preserves the established landscape and tall-portrait endpoint sizes', () => {
    const landscape = getStageLayout(1000, 1000)
    const tallPortrait = getStageLayout(1000, 1600)

    expect(landscape.goalImage.width).toBeCloseTo(670, 8)
    expect(tallPortrait.goalImage.width).toBeCloseTo(1050, 8)
  })
})
