/**
 * Tests for soloDaily — daily date boundary, deterministic seed/modifier,
 * and once-per-day idempotent coin award (mirrors coinManager.awardDailyCoins).
 * Node env: stub window/localStorage via vi.stubGlobal.
 */

import { beforeEach, afterEach, vi } from 'vitest';
import {
  getSoloDateISO,
  soloSeed,
  seededRandom,
  pickDailyModifier,
  awardSoloDaily,
  isSoloDailyClaimed,
} from './soloDaily';

function makeLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    _store: store,
  };
}

describe('soloDaily', () => {
  describe('getSoloDateISO', () => {
    it('returns a UTC YYYY-MM-DD string', () => {
      const d = new Date(Date.UTC(2026, 5, 16, 23, 59, 0));
      expect(getSoloDateISO(d)).toBe('2026-06-16');
    });
    it('uses the UTC day boundary, not local', () => {
      // 00:30 UTC on the 16th is still the 16th regardless of local tz
      const d = new Date(Date.UTC(2026, 5, 16, 0, 30, 0));
      expect(getSoloDateISO(d)).toBe('2026-06-16');
    });
  });

  describe('soloSeed', () => {
    it('is deterministic for the same mode + date', () => {
      expect(soloSeed('shiritori', '2026-06-16')).toBe(soloSeed('shiritori', '2026-06-16'));
    });
    it('differs across modes', () => {
      expect(soloSeed('shiritori', '2026-06-16')).not.toBe(soloSeed('sealed-bid', '2026-06-16'));
    });
    it('differs across dates', () => {
      expect(soloSeed('shiritori', '2026-06-16')).not.toBe(soloSeed('shiritori', '2026-06-17'));
    });
    it('returns a finite non-negative 32-bit integer', () => {
      const s = soloSeed('word-alchemy', '2026-06-16');
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
    });
  });

  describe('seededRandom', () => {
    it('produces the same sequence for the same seed', () => {
      const a = seededRandom(123);
      const b = seededRandom(123);
      expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    });
    it('produces values in [0, 1)', () => {
      const r = seededRandom(999);
      for (let i = 0; i < 50; i++) {
        const v = r();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    });
  });

  describe('pickDailyModifier', () => {
    it('returns a modifier with i18n keys', () => {
      const m = pickDailyModifier('shiritori', '2026-06-16');
      expect(m.id).toBeTruthy();
      expect(m.labelKey).toMatch(/^solo\.modifier\./);
      expect(m.descKey).toMatch(/^solo\.modifier\./);
    });
    it('is deterministic per day', () => {
      expect(pickDailyModifier('sealed-bid', '2026-06-16').id).toBe(
        pickDailyModifier('sealed-bid', '2026-06-16').id,
      );
    });
    it('rotates across days for a mode', () => {
      const ids = new Set<string>();
      for (let day = 1; day <= 20; day++) {
        ids.add(pickDailyModifier('sealed-bid', `2026-06-${String(day).padStart(2, '0')}`).id);
      }
      expect(ids.size).toBeGreaterThan(1);
    });
  });

  describe('awardSoloDaily (idempotent once-per-day)', () => {
    let ls: ReturnType<typeof makeLocalStorageMock>;
    beforeEach(() => {
      ls = makeLocalStorageMock();
      // An EMPTY window is not a realistic stub: production code guards on
      // `typeof window === 'undefined'`, so an object that exists but has no dispatchEvent slips past
      // the guard and blows up inside (incrementGamesPlayed fires a GAMES_PLAYED event after every
      // award). A real browser window always has these — give the stub the same shape.
      vi.stubGlobal('window', {
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as Window);
      vi.stubGlobal('localStorage', ls);
      vi.stubGlobal('sessionStorage', ls);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('awards coins on first completion of the day', () => {
      const res = awardSoloDaily('sealed-bid', '2026-06-16', 'en', 80, true);
      expect(res).not.toBeNull();
      expect(res!.awarded).toBeGreaterThan(0);
    });

    it('does NOT re-award on a replay the same day (practice)', () => {
      const first = awardSoloDaily('sealed-bid', '2026-06-16', 'en', 80, true);
      const second = awardSoloDaily('sealed-bid', '2026-06-16', 'en', 200, true);
      expect(first).not.toBeNull();
      expect(second).toBeNull();
    });

    it('awards again on a NEW day', () => {
      const day1 = awardSoloDaily('sealed-bid', '2026-06-16', 'en', 80, true);
      const day2 = awardSoloDaily('sealed-bid', '2026-06-17', 'en', 80, true);
      expect(day1).not.toBeNull();
      expect(day2).not.toBeNull();
    });

    it('keys are per-mode and per-language (independent claims)', () => {
      awardSoloDaily('sealed-bid', '2026-06-16', 'en', 80, true);
      const otherMode = awardSoloDaily('shiritori', '2026-06-16', 'en', 80, true);
      const otherLang = awardSoloDaily('sealed-bid', '2026-06-16', 'he', 80, true);
      expect(otherMode).not.toBeNull();
      expect(otherLang).not.toBeNull();
    });

    it('isSoloDailyClaimed reflects award state', () => {
      expect(isSoloDailyClaimed('word-alchemy', '2026-06-16', 'en')).toBe(false);
      awardSoloDaily('word-alchemy', '2026-06-16', 'en', 50, true);
      expect(isSoloDailyClaimed('word-alchemy', '2026-06-16', 'en')).toBe(true);
    });

    it('returns null (no award) for a zero-reward result', () => {
      const res = awardSoloDaily('sealed-bid', '2026-06-16', 'en', 0, false);
      expect(res).toBeNull();
    });
  });
});
