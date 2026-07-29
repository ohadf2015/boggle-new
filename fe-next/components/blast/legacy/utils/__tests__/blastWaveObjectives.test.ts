/**
 * blastWaveObjectives - Tests for wave objective definitions and retrieval.
 */
import { getWaveObjectives } from '../blastWaveConfig';

describe('getWaveObjectives', () => {
  it('returns a word_length objective for wave 1', () => {
    const objectives = getWaveObjectives(1);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual({
      type: 'clear_percent',
      target: 90,
    });
    expect(objectives[1]).toEqual({
      type: 'word_length',
      target: 4,
      minWordLength: 3,
    });
  });

  it('returns word_length + score_target for wave 2', () => {
    const objectives = getWaveObjectives(2);
    expect(objectives).toHaveLength(3);
    expect(objectives[0]).toEqual({
      type: 'clear_percent',
      target: 90,
    });
    expect(objectives[1]).toEqual({
      type: 'word_length',
      target: 3,
      minWordLength: 4,
    });
    expect(objectives[2]).toEqual({
      type: 'score_target',
      target: 60,
    });
  });

  it('returns collect_type bomb + score_target for wave 3', () => {
    const objectives = getWaveObjectives(3);
    // Wave 3: may have target_word seeded (deterministic: (3*37)%100 = 11 < 25, so YES)
    // So we expect at least 3 base objectives, possibly 4 if target_word is added
    expect(objectives.length).toBeGreaterThanOrEqual(3);
    expect(objectives.find(o => o.type === 'collect_type')).toEqual({
      type: 'collect_type',
      tileType: 'bomb',
      target: 3,
    });
    expect(objectives.find(o => o.type === 'score_target')).toEqual({
      type: 'score_target',
      target: 100,
    });
  });

  it('returns collect_type lightning + word_length for wave 4', () => {
    const objectives = getWaveObjectives(4);
    expect(objectives).toHaveLength(3);
    expect(objectives[1]).toEqual({
      type: 'collect_type',
      tileType: 'lightning',
      target: 3,
    });
    expect(objectives[2]).toEqual({
      type: 'word_length',
      target: 2,
      minWordLength: 5,
    });
  });

  it('returns collect_type diamond + score_target for wave 5', () => {
    const objectives = getWaveObjectives(5);
    expect(objectives).toHaveLength(3);
    expect(objectives[1]).toEqual({
      type: 'collect_type',
      tileType: 'diamond',
      target: 2,
    });
    expect(objectives[2]).toEqual({
      type: 'score_target',
      target: 150,
    });
  });

  it('returns clear_all_type frozen + score_target for wave 6', () => {
    const objectives = getWaveObjectives(6);
    // Wave 6: may have target_word seeded (deterministic: (6*37)%100 = 22 < 25, so YES)
    // So we expect at least 3 base objectives, possibly 4 if target_word is added
    expect(objectives.length).toBeGreaterThanOrEqual(3);
    expect(objectives.find(o => o.type === 'clear_all_type')).toEqual({
      type: 'clear_all_type',
      tileType: 'frozen',
      target: 0,
    });
    expect(objectives.find(o => o.type === 'score_target')).toEqual({
      type: 'score_target',
      target: 200,
    });
  });

  it('returns collect_type prism + word_length for wave 7', () => {
    const objectives = getWaveObjectives(7);
    expect(objectives).toHaveLength(3);
    expect(objectives[1]).toEqual({
      type: 'collect_type',
      tileType: 'prism',
      target: 3,
    });
    expect(objectives[2]).toEqual({
      type: 'word_length',
      target: 3,
      minWordLength: 5,
    });
  });

  it('scales score_target linearly for wave 8+', () => {
    const w8 = getWaveObjectives(8);
    // baseScore = 150 + (8-7)*40 = 190
    expect(w8[1]).toEqual({
      type: 'score_target',
      target: 190,
    });

    const w10 = getWaveObjectives(10);
    // baseScore = 150 + (10-7)*40 = 270
    expect(w10[1]).toEqual({
      type: 'score_target',
      target: 270,
    });
  });

  it('rotates objective templates for wave 8+', () => {
    // Wave 8 = template 0 (bombs), wave 10 = template 2 (prism)
    const w8 = getWaveObjectives(8);
    expect(w8[2]).toEqual({ type: 'collect_type', tileType: 'bomb', target: 4 });
    const w10 = getWaveObjectives(10);
    expect(w10[2]).toEqual({ type: 'collect_type', tileType: 'prism', target: 3 });
  });

  it('clamps wave numbers below 1 to wave 1', () => {
    const objectives = getWaveObjectives(0);
    expect(objectives).toEqual(getWaveObjectives(1));
  });
});
