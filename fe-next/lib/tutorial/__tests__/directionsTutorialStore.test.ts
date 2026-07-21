import { describe, it, expect } from 'vitest';
import {
  DIRECTIONS_TUTORIAL_STORAGE_KEY,
  DIRECTIONS_TUTORIAL_VERSION,
  hasSeenDirectionsTutorial,
  markDirectionsTutorialSeen,
  type DirectionsTutorialStorage,
} from '../directionsTutorialStore';

function memoryStorage(seed: Record<string, string> = {}): DirectionsTutorialStorage {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
  };
}

describe('directionsTutorialStore', () => {
  it('has not been seen on a fresh device', () => {
    const s = memoryStorage();
    expect(hasSeenDirectionsTutorial(DIRECTIONS_TUTORIAL_VERSION, s)).toBe(false);
  });

  it('marks + reports seen at the current version', () => {
    const s = memoryStorage();
    markDirectionsTutorialSeen(DIRECTIONS_TUTORIAL_VERSION, s);
    expect(hasSeenDirectionsTutorial(DIRECTIONS_TUTORIAL_VERSION, s)).toBe(true);
  });

  it('re-shows when the requested version is newer than the stored one', () => {
    const s = memoryStorage({ [DIRECTIONS_TUTORIAL_STORAGE_KEY]: '1' });
    expect(hasSeenDirectionsTutorial(2, s)).toBe(false);
  });

  it('treats a non-numeric stored value as not-seen', () => {
    const s = memoryStorage({ [DIRECTIONS_TUTORIAL_STORAGE_KEY]: 'yes' });
    expect(hasSeenDirectionsTutorial(DIRECTIONS_TUTORIAL_VERSION, s)).toBe(false);
  });

  it('fails safe to seen (suppress) when storage throws', () => {
    const throwing: DirectionsTutorialStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(hasSeenDirectionsTutorial(DIRECTIONS_TUTORIAL_VERSION, throwing)).toBe(true);
    // markSeen must not throw even when storage is blocked.
    expect(() => markDirectionsTutorialSeen(DIRECTIONS_TUTORIAL_VERSION, throwing)).not.toThrow();
  });
});
