/**
 * blastDifficulty - Tests for difficulty preset system.
 *
 * Verifies that difficulty levels produce valid configs with
 * increasing specialTileChance for harder levels.
 */

import {
  type BlastDifficulty,
  BLAST_DIFFICULTY_PRESETS,
  resolveBlastConfig,
} from '../types';

describe('BLAST_DIFFICULTY_PRESETS', () => {
  it('should define easy, medium, and hard presets', () => {
    expect(BLAST_DIFFICULTY_PRESETS.easy).toBeDefined();
    expect(BLAST_DIFFICULTY_PRESETS.medium).toBeDefined();
    expect(BLAST_DIFFICULTY_PRESETS.hard).toBeDefined();
  });

  it('should increase specialTileChance with difficulty', () => {
    const { easy, medium, hard } = BLAST_DIFFICULTY_PRESETS;
    expect(easy.specialTileChance).toBeLessThan(medium.specialTileChance);
    expect(medium.specialTileChance).toBeLessThan(hard.specialTileChance);
  });

  it('should have valid specialTileChance between 0 and 1', () => {
    for (const preset of Object.values(BLAST_DIFFICULTY_PRESETS)) {
      expect(preset.specialTileChance).toBeGreaterThanOrEqual(0);
      expect(preset.specialTileChance).toBeLessThanOrEqual(1);
    }
  });

  it('should use valid grid sizes for all difficulties', () => {
    for (const preset of Object.values(BLAST_DIFFICULTY_PRESETS)) {
      expect(preset.gridSize).toBeGreaterThanOrEqual(5);
      expect(preset.gridSize).toBeLessThanOrEqual(8);
    }
  });
});

describe('resolveBlastConfig', () => {
  it('should resolve medium difficulty by default', () => {
    const config = resolveBlastConfig('en');
    expect(config.specialTileChance).toBe(BLAST_DIFFICULTY_PRESETS.medium.specialTileChance);
    expect(config.gridSize).toBe(BLAST_DIFFICULTY_PRESETS.medium.gridSize);
    expect(config.language).toBe('en');
  });

  it('should resolve easy difficulty', () => {
    const config = resolveBlastConfig('en', 'easy');
    expect(config.specialTileChance).toBe(BLAST_DIFFICULTY_PRESETS.easy.specialTileChance);
  });

  it('should resolve hard difficulty', () => {
    const config = resolveBlastConfig('he', 'hard');
    expect(config.specialTileChance).toBe(BLAST_DIFFICULTY_PRESETS.hard.specialTileChance);
    expect(config.language).toBe('he');
  });

  it('should include difficulty field in returned config', () => {
    const config = resolveBlastConfig('en', 'hard');
    expect(config.difficulty).toBe('hard');
  });
});
