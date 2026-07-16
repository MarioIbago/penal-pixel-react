import { useEffect, useState, useRef } from 'react';
import { PixelButton } from './PixelButton';

export interface HudProps {
  score: number;
  streak: number;
  bestStreak: number;
  muted: boolean;
  onToggleMute: () => void;
  onMenu: () => void;
}


function SoundIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      className="pixel-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <path d="M3 9h4V7h2V5h3v14H9v-2H7v-2H3V9Z" fill="currentColor" />
      {muted ? (
        <path
          d="M15 8h2v2h2V8h2v2h-2v2h2v2h-2v-2h-2v2h-2v-2h2v-2h-2V8Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M15 8h2v2h2v4h-2v2h-2v-2h2v-4h-2V8Zm4-3h2v2h-2V5Zm2 2h2v10h-2V7Zm-2 10h2v2h-2v-2Z"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      className="pixel-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <path
        d="M10 3h4v2h3v2h2v2h2v12h-7v-6h-4v6H3V9h2V7h2V5h3V3Zm-5 8v8h3v-6h8v6h3v-8h-2V9h-2V7h-6v2H7v2H5Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  );
}

export function Hud({
  score,
  streak,
  bestStreak,
  muted,
  onToggleMute,
  onMenu,
}: HudProps) {
  const [pulse, setPulse] = useState(false);
  const prevBestRef = useRef(bestStreak);

  useEffect(() => {
    if (bestStreak > prevBestRef.current && bestStreak > 0) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 600);
      prevBestRef.current = bestStreak;
      return () => clearTimeout(timer);
    }
  }, [bestStreak]);

  return (
    <header className="game-hud" aria-label="Marcador y controles">
      <dl className="game-hud__stats" aria-label="Marcador">
        <div className="game-hud__stat">
          <dt>Puntos</dt>
          <dd>{score}</dd>
        </div>
        <div className="game-hud__stat">
          <dt>Racha</dt>
          <dd>{streak}</dd>
        </div>
        <div className={`game-hud__stat game-hud__stat--best ${pulse ? 'is-new-best' : ''}`}>
          <dt>Mejor</dt>
          <dd>{bestStreak}</dd>
        </div>
      </dl>

      <div className="game-hud__actions">
        <PixelButton
          variant="icon"
          iconOnly
          aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
          aria-pressed={muted}
          title={muted ? 'Activar sonido' : 'Silenciar sonido'}
          onClick={onToggleMute}
        >
          <SoundIcon muted={muted} />
        </PixelButton>
        <PixelButton
          variant="icon"
          iconOnly
          aria-label="Volver al menú"
          title="Volver al menú"
          onClick={onMenu}
        >
          <MenuIcon />
        </PixelButton>
      </div>
    </header>
  );
}

