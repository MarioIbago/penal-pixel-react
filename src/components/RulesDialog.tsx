import { useEffect, useRef, type PointerEvent } from 'react';
import { PixelButton } from './PixelButton';

export interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RulesDialog({ open, onClose }: RulesDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (event: PointerEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="rules-backdrop" onPointerDown={handleBackdropClick}>
      <section
        className="rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        aria-describedby="rules-description"
      >
        <h2 className="rules-dialog__title" id="rules-title">
          Reglas
        </h2>

        <ul className="rules-dialog__list" id="rules-description">
          <li>Haz clic o toca para apuntar y disparar.</li>
          <li>Cada gol suma +1 y aumenta tu racha.</li>
          <li>Atajada, poste o fuera: la racha vuelve a cero.</li>
        </ul>

        <PixelButton
          ref={closeButtonRef}
          variant="secondary"
          fullWidth
          onClick={onClose}
        >
          Cerrar
        </PixelButton>
      </section>
    </div>
  );
}
