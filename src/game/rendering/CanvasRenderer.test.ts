import { describe, expect, it } from 'vitest'
import { POSE_INDEX } from './CanvasRenderer'

describe('keeper sprite atlas', () => {
  it('keeps left and right dive poses aligned with their atlas cells', () => {
    expect(POSE_INDEX['high-left']).toBe(2)
    expect(POSE_INDEX['low-left']).toBe(3)
    expect(POSE_INDEX['high-right']).toBe(4)
    expect(POSE_INDEX['low-right']).toBe(5)
  })
})
