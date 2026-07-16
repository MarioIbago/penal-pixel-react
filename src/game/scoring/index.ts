export {
  createInitialScoreState,
  scoreReducer,
  type ScoreAction,
  type ScoreState,
  type ShotOutcome,
} from './score';
export {
  BEST_STREAK_STORAGE_KEY,
  readBestStreak,
  writeBestStreak,
  type ScoreStorageReader,
  type ScoreStorageWriter,
} from './storage';
export { useScore, type UseScoreResult } from './useScore';
