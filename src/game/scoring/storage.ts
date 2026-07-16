export const BEST_STREAK_STORAGE_KEY = 'penales-pixel:v1:best-streak';

export interface ScoreStorageReader {
  getItem(key: string): string | null;
}

export interface ScoreStorageWriter {
  setItem(key: string, value: string): void;
}

type ScoreStorage = ScoreStorageReader & ScoreStorageWriter;

/** Returns zero for unavailable storage, corrupt data, or invalid counters. */
export function readBestStreak(
  storage: ScoreStorageReader | null = getSessionStorage(),
): number {
  if (storage === null) {
    return 0;
  }

  try {
    return parseStoredCounter(storage.getItem(BEST_STREAK_STORAGE_KEY));
  } catch {
    return 0;
  }
}

/** Writes a sanitized integer and reports whether persistence succeeded. */
export function writeBestStreak(
  best: number,
  storage: ScoreStorageWriter | null = getSessionStorage(),
): boolean {
  if (storage === null) {
    return false;
  }

  try {
    storage.setItem(BEST_STREAK_STORAGE_KEY, String(normalizeCounter(best)));
    return true;
  } catch {
    return false;
  }
}

function getSessionStorage(): ScoreStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function parseStoredCounter(raw: string | null): number {
  if (raw === null || raw.trim() === '') {
    return 0;
  }

  return normalizeCounter(Number(raw));
}

function normalizeCounter(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}
