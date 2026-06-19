import { describe, it, expect } from 'vitest';
import { initWordTowerState } from '../wordTowerManager';
import { WORD_TOWER_WHEEL_SIZE, WORD_TOWER_WHEEL_MIN_VOWELS, WORD_TOWER_VOWELS } from '@/shared/constants/wordTowerConstants';

// The chain (and its cold-open anchor) was retired. The daily's "shared tower"
// premise now rests on the WHEEL being deterministic for a given day and always
// solvable enough (guaranteed vowels) — that is what these tests pin.
describe('daily wheel cold-open — shared, solvable start', () => {
  const vowels = new Set(WORD_TOWER_VOWELS.en.split(''));

  it('has no chain anchor any more (always empty)', () => {
    const s = initWordTowerState({ gameCode: 'daily-2026-07-04', playerId: 'daily', language: 'en', avoidWeakAnchor: true });
    expect(s.anchorLetter).toBe('');
  });

  it('opens every daily on a wheel with the guaranteed minimum of vowels', () => {
    for (let d = 1; d <= 31; d++) {
      const code = `daily-2026-07-${String(d).padStart(2, '0')}`;
      const s = initWordTowerState({ gameCode: code, playerId: 'daily', language: 'en', avoidWeakAnchor: true });
      expect(s.tray).toHaveLength(WORD_TOWER_WHEEL_SIZE);
      const vowelCount = s.tray.filter((c) => vowels.has(c)).length;
      expect(vowelCount).toBeGreaterThanOrEqual(WORD_TOWER_WHEEL_MIN_VOWELS);
    }
  });

  it('is deterministic for a given day (shared tower premise holds)', () => {
    const a = initWordTowerState({ gameCode: 'daily-2026-07-04', playerId: 'daily', language: 'en' });
    const b = initWordTowerState({ gameCode: 'daily-2026-07-04', playerId: 'daily', language: 'en' });
    expect(a.tray).toEqual(b.tray);
  });
});
