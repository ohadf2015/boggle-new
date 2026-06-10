import { describe, it, expect } from 'vitest';
import { initWordTowerState } from '../wordTowerManager';

describe('daily anchor cold-open — no Q/Z/X strand', () => {
  it('avoidWeakAnchor never opens the daily on a low-yield English letter', () => {
    for (let d = 1; d <= 31; d++) {
      const code = `daily-2026-07-${String(d).padStart(2, '0')}`;
      const s = initWordTowerState({ gameCode: code, playerId: 'daily', language: 'en', avoidWeakAnchor: true });
      expect(s.anchorLetter.length).toBe(1);
      expect('QZX').not.toContain(s.anchorLetter);
    }
  });

  it('is still deterministic for a given day (shared tower premise holds)', () => {
    const a = initWordTowerState({ gameCode: 'daily-2026-07-04', playerId: 'daily', language: 'en', avoidWeakAnchor: true });
    const b = initWordTowerState({ gameCode: 'daily-2026-07-04', playerId: 'daily', language: 'en', avoidWeakAnchor: true });
    expect(a.anchorLetter).toBe(b.anchorLetter);
  });

  it('without the flag, behaviour is unchanged (endless mode untouched)', () => {
    const a = initWordTowerState({ gameCode: 'solo', playerId: 'solo', language: 'en' });
    const b = initWordTowerState({ gameCode: 'solo', playerId: 'solo', language: 'en' });
    expect(a.anchorLetter).toBe(b.anchorLetter);
    expect(a.anchorLetter.length).toBe(1);
  });
});
