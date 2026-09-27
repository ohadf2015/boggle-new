import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  MASTERY_PRACTICE_KEY,
  consumeMasteryPracticeRound,
  writeMasteryPracticeRound,
} from './practiceStorage';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

describe('practiceStorage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('shouldRoundTripAPracticePayload', () => {
    // GIVEN
    const payload = {
      grid: [
        ['C', 'A'],
        ['T', 'S'],
      ],
      seedWords: ['cat', 'sat'],
    };

    // WHEN
    writeMasteryPracticeRound(payload);
    const read = consumeMasteryPracticeRound();

    // THEN
    expect(read).toEqual(payload);
    expect(sessionStorage.getItem(MASTERY_PRACTICE_KEY)).toBeNull();
  });

  it('shouldReturnNullWhenNothingStored', () => {
    // WHEN
    const read = consumeMasteryPracticeRound();

    // THEN
    expect(read).toBeNull();
  });

  it('shouldReturnNullAndClearWhenPayloadIsCorrupt', () => {
    // GIVEN
    sessionStorage.setItem(MASTERY_PRACTICE_KEY, '{not-json');

    // WHEN
    const read = consumeMasteryPracticeRound();

    // THEN
    expect(read).toBeNull();
    expect(sessionStorage.getItem(MASTERY_PRACTICE_KEY)).toBeNull();
  });
});
