export type ShotOutcome = 'GOAL' | 'SAVE' | 'POST' | 'OUT';

export interface ScoreState {
  readonly points: number;
  readonly streak: number;
  readonly best: number;
}

export type ScoreAction =
  | { readonly type: ShotOutcome }
  | { readonly type: 'RESET_RUN' };

export function createInitialScoreState(best = 0): ScoreState {
  return {
    points: 0,
    streak: 0,
    best: normalizeCounter(best),
  };
}

/** Pure reducer: only a goal changes points, streak, and potentially best. */
export function scoreReducer(
  state: ScoreState,
  action: ScoreAction,
): ScoreState {
  switch (action.type) {
    case 'GOAL': {
      const streak = state.streak + 1;

      return {
        points: state.points + 1,
        streak,
        best: Math.max(state.best, streak),
      };
    }

    case 'SAVE':
    case 'POST':
    case 'OUT':
      if (state.streak === 0) {
        return state;
      }

      return { ...state, streak: 0 };

    case 'RESET_RUN':
      if (state.points === 0 && state.streak === 0) {
        return state;
      }

      return { points: 0, streak: 0, best: state.best };

    default:
      return state;
  }
}

function normalizeCounter(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}
