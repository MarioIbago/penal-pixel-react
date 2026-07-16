import { useCallback, useState } from 'react'
import { GameScreen } from './components/GameScreen'
import { MenuScreen } from './components/MenuScreen'
import { RulesDialog } from './components/RulesDialog'
import { useScore } from './game/scoring'

type Screen = 'menu' | 'game'

export function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const { points, streak, best, recordOutcome, resetRun } = useScore()

  const play = useCallback(() => {
    resetRun()
    setRulesOpen(false)
    setScreen('game')
  }, [resetRun])

  const returnToMenu = useCallback(() => setScreen('menu'), [])
  const toggleMuted = useCallback(() => setMuted((current) => !current), [])

  if (screen === 'game') {
    return (
      <GameScreen
        points={points}
        streak={streak}
        bestStreak={best}
        muted={muted}
        onToggleMute={toggleMuted}
        onMenu={returnToMenu}
        onOutcome={recordOutcome}
      />
    )
  }

  return (
    <>
      <MenuScreen onPlay={play} onOpenRules={() => setRulesOpen(true)} />
      <RulesDialog open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  )
}
