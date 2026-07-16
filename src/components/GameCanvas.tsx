import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { RetroAudio } from '../game/audio'
import { moveAimTarget, pointerToCanvasPoint } from '../game/controls/pointerControls'
import { GameEngine, type Outcome, type Vec2 } from '../game/core'
import { CanvasRenderer, loadGameAssets } from '../game/rendering'

const OUTCOME_STATUS: Record<Outcome, string> = {
  GOAL: 'Gol. Sumas un punto y aumenta tu racha.',
  SAVE: 'Atajada. La racha vuelve a cero.',
  POST: 'El balón pegó en el poste. La racha vuelve a cero.',
  OUT: 'Tiro fuera. La racha vuelve a cero.',
}

export interface GameCanvasProps {
  muted: boolean
  streak: number
  onOutcome: (outcome: Outcome) => void
  onStatus: (message: string) => void
}

const playOutcomeSound = (audio: RetroAudio, outcome: Outcome): void => {
  if (outcome === 'GOAL') audio.playGoal()
  else if (outcome === 'SAVE') audio.playSave()
  else if (outcome === 'POST') audio.playPost()
  else audio.playOut()
}

export function GameCanvas({ muted, streak, onOutcome, onStatus }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<CanvasRenderer | null>(null)
  const aimRef = useRef<Vec2>({ x: 0, y: 1.35 })
  const outcomeHandlerRef = useRef(onOutcome)
  const statusHandlerRef = useRef(onStatus)
  const audioRef = useRef<RetroAudio | null>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [assetsReady, setAssetsReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    outcomeHandlerRef.current = onOutcome
    statusHandlerRef.current = onStatus
  }, [onOutcome, onStatus])

  useEffect(() => {
    const audio = new RetroAudio()
    const engine = new GameEngine({
      onKick: () => {
        void audio.unlock()
        audio.playKick()
        statusHandlerRef.current('Tiro en camino.')
      },
      onOutcome: (outcome) => {
        playOutcomeSound(audio, outcome)
        outcomeHandlerRef.current(outcome)
        statusHandlerRef.current(OUTCOME_STATUS[outcome])
      },
      onReset: () => statusHandlerRef.current('Listo para el siguiente tiro.'),
    })
    audioRef.current = audio
    engineRef.current = engine

    return () => {
      engine.reset()
      engineRef.current = null
      audioRef.current = null
      void audio.close()
    }
  }, [])

  useEffect(() => {
    audioRef.current?.setMuted(muted)
  }, [muted])

  useEffect(() => {
    engineRef.current?.setStreak(streak)
  }, [streak])

  useEffect(() => {
    let active = true
    void loadGameAssets()
      .then((assets) => {
        const canvas = canvasRef.current
        if (!active || !canvas) return
        const context = canvas.getContext('2d', { alpha: false })
        if (!context) throw new Error('Canvas 2D no disponible')
        rendererRef.current = new CanvasRenderer(context, assets)
        setAssetsReady(true)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!assetsReady) return undefined
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    const engine = engineRef.current
    if (!canvas || !renderer || !engine) return undefined

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const resize = (): void => {
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width <= 0 || bounds.height <= 0) return
      const density = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.max(1, Math.round(bounds.width * density))
      const height = Math.max(1, Math.round(bounds.height * density))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        renderer.resize(width, height)
      }
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas.parentElement ?? canvas)
    window.addEventListener('resize', resize, { passive: true })
    let frameId = 0
    let lastTime = performance.now()

    const frame = (time: number): void => {
      const delta = document.hidden ? 0 : Math.min(0.05, Math.max(0, (time - lastTime) / 1000))
      lastTime = time
      if (delta > 0) engine.update(delta)
      renderer.render(engine.getSnapshot(), {
        aim: aimRef.current,
        reducedMotion: reducedMotionQuery.matches,
      })
      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)
    const resetClock = (): void => {
      lastTime = performance.now()
    }
    document.addEventListener('visibilitychange', resetClock)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(frameId)
      document.removeEventListener('visibilitychange', resetClock)
    }
  }, [assetsReady])

  const updatePointerAim = (event: ReactPointerEvent<HTMLCanvasElement>): Vec2 | null => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer) return null
    const canvasPoint = pointerToCanvasPoint(event.nativeEvent, canvas)
    const target = renderer.getLayout().projection.targetFromCanvas(canvasPoint)
    aimRef.current = target
    return target
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.pointerType === 'mouse' || event.buttons > 0) updatePointerAim(event)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>): void => {
    if (event.button !== 0 || !assetsReady) return
    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    const target = updatePointerAim(event)
    if (target) engineRef.current?.shoot(target)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>): void => {
    const step = event.shiftKey ? 0.32 : 0.17
    let handled = true
    if (event.key === 'ArrowLeft') aimRef.current = moveAimTarget(aimRef.current, -step, 0)
    else if (event.key === 'ArrowRight') aimRef.current = moveAimTarget(aimRef.current, step, 0)
    else if (event.key === 'ArrowUp') aimRef.current = moveAimTarget(aimRef.current, 0, step)
    else if (event.key === 'ArrowDown') aimRef.current = moveAimTarget(aimRef.current, 0, -step)
    else if (event.key === 'Enter' || event.key === ' ') engineRef.current?.shoot(aimRef.current)
    else handled = false
    if (handled) event.preventDefault()
  }

  return (
    <div className="game-canvas-shell">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        tabIndex={0}
        role="application"
        aria-label="Portería. Mueve la mira con las flechas y dispara con Enter o Espacio; también puedes hacer clic o tocar."
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
      />
      {loadError ? (
        <div className="game-canvas-error" role="alert">
          No se pudo preparar el campo.
        </div>
      ) : null}
    </div>
  )
}
