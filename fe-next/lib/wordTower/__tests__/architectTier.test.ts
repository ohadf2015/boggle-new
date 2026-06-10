import { describe, it, expect } from 'vitest';
import { getTowerArchitectTier } from '../architectTier';
import type { WordTowerFloor } from '../wordTowerManager';

function floor(word: string, meters = 5): WordTowerFloor {
  return { word, len: word.length, meters, placementMultiplier: 1 };
}

describe('getTowerArchitectTier', () => {
  it('returns null for fewer than 5 floors', () => {
    expect(getTowerArchitectTier([])).toBeNull();
    expect(getTowerArchitectTier([floor('cat'), floor('dog'), floor('rat')])).toBeNull();
  });

  it('returns Apprentice for short common words with no rare letters', () => {
    const floors = [floor('cat'), floor('dog'), floor('rat'), floor('hat'), floor('mat')];
    expect(getTowerArchitectTier(floors)).toBe('Apprentice');
  });

  it('returns Journeyman for mixed word lengths with some variety', () => {
    const floors = [
      floor('cat'), floor('dream'), floor('friend'), floor('hat'), floor('plant'),
      floor('river'), floor('stone'), floor('bloom'),
    ];
    const tier = getTowerArchitectTier(floors);
    expect(['Journeyman', 'Master']).toContain(tier);
  });

  it('returns Master for rare-letter heavy words', () => {
    const floors = [
      floor('quiz'), floor('jazzy'), floor('quartz'), floor('xbox'), floor('zeal'),
      floor('jinx'), floor('kiosk'), floor('whiz'),
    ];
    expect(getTowerArchitectTier(floors)).toBe('Master');
  });

  it('returns Master for wide variety (many unique lengths)', () => {
    const floors = [
      floor('ox'), floor('cat'), floor('bird'), floor('plant'), floor('bridge'),
      floor('flowers'), floor('climbing'), floor('beautiful'),
    ];
    expect(getTowerArchitectTier(floors)).toBe('Master');
  });

  it('is case-insensitive for scoring', () => {
    const lower = [floor('quiz'), floor('jazzy'), floor('quartz'), floor('xbox'), floor('zeal'), floor('jinx'), floor('kiosk'), floor('whiz')];
    const upper = lower.map(f => floor(f.word.toUpperCase()));
    expect(getTowerArchitectTier(lower)).toBe(getTowerArchitectTier(upper));
  });

  it('upgrades tier as more rare-letter floors are added', () => {
    const base = [floor('cat'), floor('dog'), floor('rat'), floor('hat'), floor('mat')];
    expect(getTowerArchitectTier(base)).toBe('Apprentice');
    const upgraded = [...base, floor('quiz'), floor('jazz'), floor('jinx')];
    const tier = getTowerArchitectTier(upgraded);
    expect(['Journeyman', 'Master']).toContain(tier);
  });
});
