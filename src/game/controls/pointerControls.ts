import type { Vec2 } from '../core/types'

export const pointerToCanvasPoint = (
  event: Pick<PointerEvent, 'clientX' | 'clientY'>,
  canvas: HTMLCanvasElement,
): Vec2 => {
  const bounds = canvas.getBoundingClientRect()
  return {
    x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
  }
}

export const clampAimTarget = (target: Vec2): Vec2 => ({
  x: Math.max(-5.4, Math.min(5.4, target.x)),
  y: Math.max(0.04, Math.min(4.1, target.y)),
})

export const moveAimTarget = (target: Vec2, dx: number, dy: number): Vec2 =>
  clampAimTarget({ x: target.x + dx, y: target.y + dy })
