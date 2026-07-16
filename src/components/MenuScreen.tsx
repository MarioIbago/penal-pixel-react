import { PixelButton } from './PixelButton';

export interface MenuScreenProps {
  onPlay: () => void;
  onOpenRules: () => void;
}

export function MenuScreen({ onPlay, onOpenRules }: MenuScreenProps) {
  return (
    <main className="menu-screen" aria-labelledby="menu-title">
      <picture className="menu-screen__stadium" aria-hidden="true">
        <source
          media="(orientation: portrait)"
          srcSet="/assets/stadium-portrait.png"
        />
        <img src="/assets/stadium-landscape.png" alt="" draggable={false} />
      </picture>

      <div className="menu-screen__vignette" aria-hidden="true" />

      <div className="menu-scene" aria-hidden="true">
        <img
          className="menu-scene__goal pixel-art"
          src="/assets/goal.png"
          alt=""
          draggable={false}
        />
        <span className="menu-scene__keeper pixel-art" />
        <span className="menu-scene__ball pixel-art" />
        <span className="menu-scene__leg pixel-art" />
      </div>

      <h1 className="menu-title" id="menu-title">
        <span>PENAL</span>{' '}
        <span>PIXEL</span>
      </h1>

      <nav className="menu-actions" aria-label="Menú principal">
        <PixelButton fullWidth onClick={onPlay}>
          JUGAR
        </PixelButton>
        <PixelButton variant="secondary" fullWidth onClick={onOpenRules}>
          REGLAS
        </PixelButton>
      </nav>
    </main>
  );
}
