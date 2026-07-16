/**
 * # useScore.ts
 * 
 * Hook de React encargado de gestionar el estado del marcador (puntuación actual, racha, etc.).
 * Internamente usa `localStorage` (vía `readBestStreak` y `writeBestStreak`) para guardar el mejor puntaje (best streak).
 * 
 * Para la integración de Matemáticas:
 * Aquí (o en un hook similar) es donde se debe persistir el progreso de las operaciones
 * matemáticas (ej. cuántas acertadas, de qué nivel), guardándolas en localStorage, 
 * sin necesidad de conectarse a un backend ni Firebase.
 */
import { useCallback, useEffect, useReducer } from 'react';

import {
  createInitialScoreState,
  scoreReducer,
  type ScoreState,
  type ShotOutcome,
} from './score';
import { readBestStreak, writeBestStreak } from './storage';

export interface UseScoreResult extends ScoreState {
  recordOutcome(outcome: ShotOutcome): void;
  resetRun(): void;
}

export function useScore(): UseScoreResult {
  const [state, dispatch] = useReducer(
    scoreReducer,
    undefined,
    () => createInitialScoreState(readBestStreak()),
  );

  useEffect(() => {
    writeBestStreak(state.best);
  }, [state.best]);

  const recordOutcome = useCallback((outcome: ShotOutcome): void => {
    dispatch({ type: outcome });
  }, []);

  const resetRun = useCallback((): void => {
    dispatch({ type: 'RESET_RUN' });
  }, []);

  return {
    points: state.points,
    streak: state.streak,
    best: state.best,
    recordOutcome,
    resetRun,
  };
}
