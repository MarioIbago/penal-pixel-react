import { describe, expect, it } from 'vitest';

import {
  createInitialScoreState,
  scoreReducer,
  type ScoreState,
  type ShotOutcome,
} from './score';

describe('createInitialScoreState', () => {
  it('starts a fresh run and restores a valid session best', () => {
    expect(createInitialScoreState(7)).toEqual({
      points: 0,
      streak: 0,
      best: 7,
    });
  });

  it.each([
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [-3, 0],
    [3.9, 3],
  ])('sanitizes an initial best of %s to %s', (input, expected) => {
    expect(createInitialScoreState(input).best).toBe(expected);
  });
});

describe('scoreReducer', () => {
  it('adds one point and extends the streak for a goal', () => {
    const state: ScoreState = { points: 4, streak: 2, best: 5 };

    expect(scoreReducer(state, { type: 'GOAL' })).toEqual({
      points: 5,
      streak: 3,
      best: 5,
    });
  });

  it('raises the best when the current streak passes it', () => {
    const state: ScoreState = { points: 8, streak: 4, best: 4 };

    expect(scoreReducer(state, { type: 'GOAL' })).toEqual({
      points: 9,
      streak: 5,
      best: 5,
    });
  });

  it.each<ShotOutcome>(['SAVE', 'POST', 'OUT'])(
    '%s resets the streak without lowering points or best',
    (outcome) => {
      const state: ScoreState = { points: 12, streak: 4, best: 8 };

      expect(scoreReducer(state, { type: outcome })).toEqual({
        points: 12,
        streak: 0,
        best: 8,
      });
    },
  );

  it('does not mutate the previous state', () => {
    const state: ScoreState = Object.freeze({
      points: 3,
      streak: 2,
      best: 2,
    });

    scoreReducer(state, { type: 'GOAL' });

    expect(state).toEqual({ points: 3, streak: 2, best: 2 });
  });

  it('keeps the same state when a miss arrives with no active streak', () => {
    const state: ScoreState = { points: 6, streak: 0, best: 3 };

    expect(scoreReducer(state, { type: 'SAVE' })).toBe(state);
  });

  it('resets the run while preserving the session best', () => {
    const state: ScoreState = { points: 9, streak: 3, best: 6 };

    expect(scoreReducer(state, { type: 'RESET_RUN' })).toEqual({
      points: 0,
      streak: 0,
      best: 6,
    });
  });

  it('supports consecutive outcomes as one deterministic run', () => {
    const outcomes: ShotOutcome[] = [
      'GOAL',
      'GOAL',
      'SAVE',
      'GOAL',
      'POST',
      'OUT',
      'GOAL',
      'GOAL',
      'GOAL',
    ];

    const finalState = outcomes.reduce(
      (state, outcome) => scoreReducer(state, { type: outcome }),
      createInitialScoreState(),
    );

    expect(finalState).toEqual({ points: 6, streak: 3, best: 3 });
  });
});
