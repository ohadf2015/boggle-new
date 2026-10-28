/**
 * blastWaveObjectives - Tests for wave objective definitions and retrieval.
 */
import { getWaveObjectives, capWaveObjectives, MAX_WAVE_OBJECTIVES } from '../blastWaveConfig';
import type { BlastObjective } from '../../types';

describe('getWaveObjectives', () => {
  it('warm-up wave: clear the board and find 4 words of 3+ letters', () => {
    expect(getWaveObjectives(1)).toEqual([
      { type: 'clear_percent', target: 90 },
      { type: 'word_length', target: 4, minWordLength: 3 },
    ]);
  });

  it('themed waves add their own goal and a rising score target', () => {
    const w2 = getWaveObjectives(2);
    expect(w2[1]).toEqual({ type: 'collect_type', tileType: 'bomb', target: 2 });
    expect(w2[2]).toEqual({ type: 'score_target', target: 100 });
    const w8 = getWaveObjectives(8);
    expect(w8[1]).toEqual({ type: 'collect_type', tileType: 'gold', target: 4 });
    expect(w8[2]).toEqual({ type: 'score_target', target: 280 });
  });

  it('boss waves have one big score goal instead of a separate score target', () => {
    const boss = getWaveObjectives(10).filter(o => o.type === 'score_target');
    expect(boss).toEqual([{ type: 'score_target', target: 550 }]);
  });

  it('clamps wave numbers below 1 to wave 1', () => {
    expect(getWaveObjectives(0)).toEqual(getWaveObjectives(1));
  });
});

describe('objective cap', () => {
  it('never exceeds MAX_WAVE_OBJECTIVES for any wave', () => {
    for (let wave = 1; wave <= 40; wave++) {
      const objectives = getWaveObjectives(wave, 'en');
      expect(objectives.length).toBeLessThanOrEqual(MAX_WAVE_OBJECTIVES);
    }
  });

  it('always retains the clear_percent primary objective', () => {
    for (let wave = 1; wave <= 40; wave++) {
      const objectives = getWaveObjectives(wave, 'en');
      expect(objectives.some(o => o.type === 'clear_percent')).toBe(true);
    }
  });

  it('always retains all base (non-bonus) objectives — only bonuses get trimmed', () => {
    // Bonus objective types (the only ones the cap may drop).
    const BONUS_TYPES = new Set([
      'target_word', 'color_power',
    ]);
    // Waves 2+ define 3 base objectives (boss waves 2: their goal is the score).
    // The cap must never reduce that count, regardless of how many bonuses were seeded.
    for (let wave = 2; wave <= 40; wave++) {
      const full = getWaveObjectives(wave, 'en');
      const baseCount = full.filter(o => !BONUS_TYPES.has(o.type)).length;
      expect(baseCount).toBe(wave % 5 === 0 ? 2 : 3);
    }
  });

  it('capWaveObjectives trims bonus objectives from the end, keeping the front', () => {
    const objs: BlastObjective[] = [
      { type: 'clear_percent', target: 90 },
      { type: 'word_length', target: 3, minWordLength: 4 },
      { type: 'score_target', target: 60 },
      { type: 'target_word', target: 1, targetWord: 'HELLO' },
      { type: 'color_power', target: 1, colorTag: 'pink', minColorCount: 3 },
    ];
    const capped = capWaveObjectives(objs, 4);
    expect(capped).toHaveLength(4);
    expect(capped).toEqual(objs.slice(0, 4));
  });

  it('capWaveObjectives returns the input unchanged when already within the cap', () => {
    const objs: BlastObjective[] = [
      { type: 'clear_percent', target: 90 },
      { type: 'word_length', target: 4, minWordLength: 3 },
    ];
    expect(capWaveObjectives(objs, 4)).toEqual(objs);
  });
});
