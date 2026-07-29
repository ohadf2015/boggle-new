import { buildAdventureShareData, formatShareText } from '../adventureShare';
import type { LevelCompletion } from '@/types/adventure';

describe('adventureShare', () => {
  const completions: LevelCompletion[] = [
    { world: 1, level: 1, stars: 3, bestScore: 500, bestWords: 20, completedAt: '2026-01-01' },
    { world: 1, level: 7, stars: 2, bestScore: 800, bestWords: 30, completedAt: '2026-01-02' },
    { world: 2, level: 1, stars: 3, bestScore: 600, bestWords: 25, completedAt: '2026-01-03' },
  ];

  describe('buildAdventureShareData', () => {
    it('should count worlds completed (all 7 levels done)', () => {
      const data = buildAdventureShareData(completions, 0, []);
      // World 1 has 2 levels done (not all 7), so 0 worlds completed
      expect(data.worldsCompleted).toBe(0);
    });

    it('should sum total stars', () => {
      const data = buildAdventureShareData(completions, 0, []);
      expect(data.totalStars).toBe(8); // 3 + 2 + 3
    });

    it('should count bosses defeated (level 7 completions)', () => {
      const data = buildAdventureShareData(completions, 0, []);
      expect(data.bossesDefeated).toBe(1);
    });

    it('should include best streak', () => {
      const data = buildAdventureShareData(completions, 5, []);
      expect(data.bestStreak).toBe(5);
    });
  });

  describe('formatShareText', () => {
    it('should produce a non-empty string', () => {
      const data = buildAdventureShareData(completions, 3, []);
      const text = formatShareText(data);
      expect(text.length).toBeGreaterThan(0);
    });

    it('should include star count', () => {
      const data = buildAdventureShareData(completions, 0, []);
      const text = formatShareText(data);
      expect(text).toContain('8');
    });
  });
});
