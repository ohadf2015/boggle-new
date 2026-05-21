import { selectNextGameMode, ALL_GAME_MODES, GAME_MODE_WEIGHTS } from '../gameModeSelector';
import type { GameMode } from '@/shared/types/game';

describe('gameModeSelector', () => {
  describe('selectNextGameMode', () => {
    it('should return a valid game mode', () => {
      const result = selectNextGameMode([], ALL_GAME_MODES);
      expect(ALL_GAME_MODES).toContain(result);
    });

    it('should not return the same mode as the last one in history', () => {
      // Run many times to statistically verify no-repeat
      for (let i = 0; i < 100; i++) {
        const result = selectNextGameMode(['blast'], ALL_GAME_MODES);
        expect(result).not.toBe('blast');
      }
    });

    it('should not repeat the last mode from a longer history', () => {
      for (let i = 0; i < 100; i++) {
        const result = selectNextGameMode(['classic', 'blast', 'word-hunt'], ALL_GAME_MODES);
        expect(result).not.toBe('word-hunt');
      }
    });

    it('should return any mode when history is empty', () => {
      const results = new Set<GameMode>();
      for (let i = 0; i < 200; i++) {
        results.add(selectNextGameMode([], ALL_GAME_MODES));
      }
      // With 200 iterations and 4 modes, all should appear
      expect(results.size).toBe(4);
    });

    it('should only return modes from the enabled list', () => {
      const enabledModes: GameMode[] = ['classic', 'blast'];
      for (let i = 0; i < 100; i++) {
        const result = selectNextGameMode([], enabledModes);
        expect(enabledModes).toContain(result);
        expect(result).not.toBe('word-hunt');
      }
    });

    it('should return the only available mode if only one is enabled', () => {
      const result = selectNextGameMode([], ['blast']);
      expect(result).toBe('blast');
    });

    it('should return the only available mode even if it was last played', () => {
      // Edge case: only one mode enabled and it was the last played
      const result = selectNextGameMode(['blast'], ['blast']);
      expect(result).toBe('blast');
    });

    it('should handle no-repeat with only two modes enabled', () => {
      for (let i = 0; i < 100; i++) {
        const result = selectNextGameMode(['classic'], ['classic', 'blast']);
        expect(result).toBe('blast');
      }
    });

    it('should produce a weighted distribution (classic ~40%, blast ~30%, word-hunt ~30%)', () => {
      const counts: Record<GameMode, number> = { 'classic': 0, 'blast': 0, 'word-hunt': 0, 'wheel-rush': 0, 'word-tower': 0 };
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        // Use empty history to not filter any mode
        const result = selectNextGameMode([], ALL_GAME_MODES);
        counts[result]++;
      }

      // Allow 5% tolerance
      const classicRatio = counts['classic'] / iterations;
      const blastRatio = counts['blast'] / iterations;
      const wordHuntRatio = counts['word-hunt'] / iterations;

      expect(classicRatio).toBeGreaterThan(0.33);
      expect(classicRatio).toBeLessThan(0.50);
      expect(blastRatio).toBeGreaterThan(0.22);
      expect(blastRatio).toBeLessThan(0.38);
      expect(wordHuntRatio).toBeGreaterThan(0.22);
      expect(wordHuntRatio).toBeLessThan(0.38);
    });

    it('should recalculate weights when filtering out last mode', () => {
      const counts: Record<string, number> = { 'classic': 0, 'word-hunt': 0 };
      const iterations = 5000;

      for (let i = 0; i < iterations; i++) {
        const result = selectNextGameMode(['blast'], ALL_GAME_MODES);
        counts[result]++;
      }

      // Both should appear when blast is excluded
      expect(counts['classic']).toBeGreaterThan(0);
      expect(counts['word-hunt']).toBeGreaterThan(0);
    });
  });

  describe('constants', () => {
    it('should export ALL_GAME_MODES with 4 modes', () => {
      expect(ALL_GAME_MODES).toEqual(['classic', 'blast', 'word-hunt', 'wheel-rush']);
    });

    it('should export GAME_MODE_WEIGHTS that sum to 1 (approximately)', () => {
      const weights = Object.values(GAME_MODE_WEIGHTS) as number[];
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0);
    });
  });
});
