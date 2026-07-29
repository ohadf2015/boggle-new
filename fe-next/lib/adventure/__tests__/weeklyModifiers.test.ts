import {
  MODIFIER_POOL,
  getWeeklyModifiers,
  applyModifiers,
  type WeeklyModifier,
} from '../weeklyModifiers';

describe('weeklyModifiers', () => {
  describe('MODIFIER_POOL', () => {
    it('should have at least 8 modifiers', () => {
      expect(MODIFIER_POOL.length).toBeGreaterThanOrEqual(8);
    });

    it('should have unique IDs', () => {
      const ids = MODIFIER_POOL.map(m => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getWeeklyModifiers', () => {
    it('should return exactly 3 modifiers', () => {
      const mods = getWeeklyModifiers(2026, 11);
      expect(mods).toHaveLength(3);
    });

    it('should return same modifiers for same week', () => {
      const a = getWeeklyModifiers(2026, 11);
      const b = getWeeklyModifiers(2026, 11);
      expect(a.map(m => m.id)).toEqual(b.map(m => m.id));
    });

    it('should return different modifiers for different weeks', () => {
      const a = getWeeklyModifiers(2026, 11);
      const b = getWeeklyModifiers(2026, 12);
      expect(a.map(m => m.id).join(',')).not.toBe(b.map(m => m.id).join(','));
    });

    it('should return 3 distinct modifiers', () => {
      const mods = getWeeklyModifiers(2026, 11);
      const ids = mods.map(m => m.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('applyModifiers', () => {
    it('should modify timer based on active modifiers', () => {
      const halfTimeMod: WeeklyModifier = {
        id: 'test-half-time',
        nameKey: 'test',
        descriptionKey: 'test',
        icon: '⏱️',
        effects: { timerMultiplier: 0.5 },
      };
      const result = applyModifiers({ timerSeconds: 120, scoreMultiplier: 1.0, minWordLength: 3 }, [halfTimeMod]);
      expect(result.timerSeconds).toBe(60);
    });

    it('should stack score multipliers', () => {
      const mod: WeeklyModifier = {
        id: 'test-double-score',
        nameKey: 'test',
        descriptionKey: 'test',
        icon: '💰',
        effects: { scoreMultiplier: 2.0 },
      };
      const result = applyModifiers({ timerSeconds: 120, scoreMultiplier: 1.0, minWordLength: 3 }, [mod]);
      expect(result.scoreMultiplier).toBe(2.0);
    });

    it('should apply minWordLength override', () => {
      const mod: WeeklyModifier = {
        id: 'test-long-words',
        nameKey: 'test',
        descriptionKey: 'test',
        icon: '📏',
        effects: { minWordLength: 4 },
      };
      const result = applyModifiers({ timerSeconds: 120, scoreMultiplier: 1.0, minWordLength: 3 }, [mod]);
      expect(result.minWordLength).toBe(4);
    });

    it('should return unchanged values when no relevant effects', () => {
      const result = applyModifiers({ timerSeconds: 120, scoreMultiplier: 1.0, minWordLength: 3 }, []);
      expect(result.timerSeconds).toBe(120);
      expect(result.scoreMultiplier).toBe(1.0);
    });

    it('should enforce minimum timer floor of 45 seconds', () => {
      const blitz: WeeklyModifier = {
        id: 'test-blitz',
        nameKey: 'test',
        descriptionKey: 'test',
        icon: '💥',
        effects: { timerMultiplier: 0.2 },
      };
      // 120 * 0.2 = 24, but floor is 45
      const result = applyModifiers({ timerSeconds: 120, scoreMultiplier: 1.0, minWordLength: 3 }, [blitz]);
      expect(result.timerSeconds).toBe(45);
    });

    it('should not apply floor when timerSeconds is 0 (used for non-timer configs)', () => {
      const mod: WeeklyModifier = {
        id: 'test',
        nameKey: 'test',
        descriptionKey: 'test',
        icon: '⚡',
        effects: { timerMultiplier: 0.5 },
      };
      const result = applyModifiers({ timerSeconds: 0, scoreMultiplier: 1.0, minWordLength: 3 }, [mod]);
      expect(result.timerSeconds).toBe(0);
    });
  });

  describe('getWeeklyModifiers — timer stacking prevention', () => {
    it('should never select two timer-reducing modifiers', () => {
      // Test across 100 weeks to ensure no stacking ever occurs
      for (let week = 1; week <= 100; week++) {
        const mods = getWeeklyModifiers(2026, week);
        const timerReducers = mods.filter(m => (m.effects.timerMultiplier ?? 1) < 1);
        expect(timerReducers.length).toBeLessThanOrEqual(1);
      }
    });

    it('should still return 3 modifiers when stacking is prevented', () => {
      // Across many weeks, we should always get 3 modifiers
      for (let week = 1; week <= 50; week++) {
        const mods = getWeeklyModifiers(2026, week);
        expect(mods.length).toBe(3);
      }
    });
  });
});
