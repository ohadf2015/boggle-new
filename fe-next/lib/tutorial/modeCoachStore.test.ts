import { describe, it, expect } from 'vitest';
import { coachStorageKey, hasSeenCoach, markCoachSeen, type CoachStorage } from './modeCoachStore';

/** In-memory storage that mimics the slice of localStorage we use. */
function fakeStorage(initial: Record<string, string> = {}): CoachStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k, v) => void map.set(k, v),
    dump: () => Object.fromEntries(map),
  };
}

describe('modeCoachStore', () => {
  it('namespaces the key per mode', () => {
    expect(coachStorageKey('classic')).toBe('lc_coach_classic');
    expect(coachStorageKey('wordHunt')).toBe('lc_coach_wordHunt');
  });

  it('reports unseen for a fresh device', () => {
    const s = fakeStorage();
    expect(hasSeenCoach('classic', 1, s)).toBe(false);
  });

  it('reports seen once marked at the current version', () => {
    const s = fakeStorage();
    markCoachSeen('classic', 1, s);
    expect(hasSeenCoach('classic', 1, s)).toBe(true);
  });

  it('re-shows when the content version is bumped above the stored one', () => {
    const s = fakeStorage();
    markCoachSeen('classic', 1, s);
    // content updated → version 2 → should show again
    expect(hasSeenCoach('classic', 2, s)).toBe(false);
  });

  it('keeps treating a higher stored version as seen for an older requested version', () => {
    const s = fakeStorage();
    markCoachSeen('classic', 3, s);
    expect(hasSeenCoach('classic', 2, s)).toBe(true);
  });

  it('isolates modes from each other', () => {
    const s = fakeStorage();
    markCoachSeen('classic', 1, s);
    expect(hasSeenCoach('blast', 1, s)).toBe(false);
  });

  it('treats a corrupt stored value as unseen rather than throwing', () => {
    const s = fakeStorage({ lc_coach_classic: 'not-a-number' });
    expect(hasSeenCoach('classic', 1, s)).toBe(false);
  });

  it('never throws when storage access fails (private mode)', () => {
    const throwing: CoachStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    // Fail safe: pretend "seen" so we never spam a user whose storage is blocked.
    expect(hasSeenCoach('classic', 1, throwing)).toBe(true);
    expect(() => markCoachSeen('classic', 1, throwing)).not.toThrow();
  });
});
