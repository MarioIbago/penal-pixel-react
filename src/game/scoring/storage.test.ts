import { describe, expect, it } from 'vitest';

import {
  BEST_STREAK_STORAGE_KEY,
  readBestStreak,
  writeBestStreak,
  type ScoreStorageReader,
  type ScoreStorageWriter,
} from './storage';

class MemoryStorage implements ScoreStorageReader, ScoreStorageWriter {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('best-streak session storage', () => {
  it('round-trips the best with the versioned key', () => {
    const storage = new MemoryStorage();

    expect(writeBestStreak(11, storage)).toBe(true);
    expect(storage.getItem(BEST_STREAK_STORAGE_KEY)).toBe('11');
    expect(readBestStreak(storage)).toBe(11);
  });

  it.each([
    [null, 0],
    ['', 0],
    ['not-a-number', 0],
    ['Infinity', 0],
    ['-2', 0],
    ['4.8', 4],
  ])('reads %s safely as %s', (stored, expected) => {
    const storage: ScoreStorageReader = {
      getItem: () => stored,
    };

    expect(readBestStreak(storage)).toBe(expected);
  });

  it('sanitizes invalid values before writing', () => {
    const storage = new MemoryStorage();

    writeBestStreak(Number.NaN, storage);
    expect(storage.getItem(BEST_STREAK_STORAGE_KEY)).toBe('0');

    writeBestStreak(8.9, storage);
    expect(storage.getItem(BEST_STREAK_STORAGE_KEY)).toBe('8');
  });

  it('returns safe fallbacks when browser storage is unavailable', () => {
    expect(readBestStreak(null)).toBe(0);
    expect(writeBestStreak(5, null)).toBe(false);
  });

  it('swallows storage access failures', () => {
    const brokenReader: ScoreStorageReader = {
      getItem: () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    };
    const brokenWriter: ScoreStorageWriter = {
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    };

    expect(readBestStreak(brokenReader)).toBe(0);
    expect(writeBestStreak(4, brokenWriter)).toBe(false);
  });
});
