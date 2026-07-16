/**
 * # GameScreen.tsx
 * 
 * Este componente es el contenedor principal del minijuego (interfaz React).
 * - Envuelve a `GameCanvas`, que es donde se dibuja todo usando el renderizador en 2D.
 * - Renderiza el `Hud` superior (marcador, racha, etc.).
 * - Captura los resultados (`onOutcome`) para actualizar la UI de React.
 * 
 * Para la integración de Matemáticas:
 * Este componente debe envolverse o modificarse para que reciba el resultado
 * de la pregunta matemática. Si la pregunta está activa, podrías ocultar el canvas
 * y mostrar el problema, luego de responder, muestras de nuevo el canvas y permites tirar.
 */
import { useCallback, useState } from 'react'
import type { Outcome } from '../game/core'
import { GameCanvas } from './GameCanvas'
import { Hud } from './Hud'
import { ScreenReaderStatus } from './ScreenReaderStatus'

export interface GameScreenProps {
  points: number
  streak: number
  bestStreak: number
  muted: boolean
  onToggleMute: () => void
  onMenu: () => void
  onOutcome: (outcome: Outcome) => void
}

export function GameScreen({
  points,
  streak,
  bestStreak,
  muted,
  onToggleMute,
  onMenu,
  onOutcome,
}: GameScreenProps) {
  const [status, setStatus] = useState('Listo para tirar.')
  const handleStatus = useCallback((message: string) => setStatus(message), [])

  return (
    <main className="game-screen">
      <div className="game-screen__stage">
        <GameCanvas
          muted={muted}
          streak={streak}
          onOutcome={onOutcome}
          onStatus={handleStatus}
        />
      </div>
      <Hud
        score={points}
        streak={streak}
        bestStreak={bestStreak}
        muted={muted}
        onToggleMute={onToggleMute}
        onMenu={onMenu}
      />
      <ScreenReaderStatus message={status} assertive />
    </main>
  )
}
