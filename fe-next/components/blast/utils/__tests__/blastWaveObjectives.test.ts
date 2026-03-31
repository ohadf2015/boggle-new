/**
 * blastWaveObjectives - Tests for wave objective definitions and retrieval.
 */
import { getWaveObjectives } from '../blastWaveConfig';

describe('getWaveObjectives', () => {
  it('returns a word_length objective for wave 1', () => {
    const objectives = getWaveObjectives(1);
    expect(objectives).toHaveLength(1);
    expect(objectives[0]).toEqual({
      type: 'word_length',
      target: 3,
      minWordLength: 3,
    });
  });

  it('returns word_length + score_target for wave 2', () => {
    const objectives = getWaveObjectives(2);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual({
      type: 'word_length',
      target: 2,
      minWordLength: 4,
    });
    expect(objectives[1]).toEqual({
      type: 'score_target',
      target: 50,
    });
  });

  it('returns collect_type bomb + score_target for wave 3', () => {
    const objectives = getWaveObjectives(3);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual({
      type: 'collect_type',
      tileType: 'bomb',
      target: 2,
    });
    expect(objectives[1]).toEqual({
      type: 'score_target',
      target: 80,
    });
  });

  it('returns collect_type lightning + word_length for wave 4', () => {
    const objectives = getWaveObjectives(4);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual({
      type: 'collect_type',
      tileType: 'lightning',
      target: 2,
    });
    expect(objectives[1]).toEqual({
      type: 'word_length',
      target: 1,
      minWordLength: 5,
    });
  });

  it('returns clear_all_type frozen + score_target for wave 5', () => {
    const objectives = getWaveObjectives(5);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual({
      type: 'clear_all_type',
      tileType: 'frozen',
      target: 0,
    });
    expect(objectives[1]).toEqual({
      type: 'score_target',
      target: 150,
    });
  });

  it('returns collect_type prism + word_length for wave 6', () => {
    const objectives = getWaveObjectives(6);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual({
      type: 'collect_type',
      tileType: 'prism',
      target: 2,
    });
    expect(objectives[1]).toEqual({
      type: 'word_length',
      target: 2,
      minWordLength: 5,
    });
  });

  it('scales score_target linearly for wave 7+', () => {
    const w7 = getWaveObjectives(7);
    // baseScore = 120 + (7-6)*40 = 160
    expect(w7[0]).toEqual({
      type: 'score_target',
      target: 160,
    });

    const w10 = getWaveObjectives(10);
    // baseScore = 120 + (10-6)*40 = 280
    expect(w10[0]).toEqual({
      type: 'score_target',
      target: 280,
    });
  });

  it('rotates objective templates for wave 7+', () => {
    // Wave 7 = template 0 (bombs), wave 9 = template 2 (prism)
    const w7 = getWaveObjectives(7);
    expect(w7[1]).toEqual({ type: 'collect_type', tileType: 'bomb', target: 3 });
    const w9 = getWaveObjectives(9);
    expect(w9[1]).toEqual({ type: 'collect_type', tileType: 'prism', target: 2 });
  });

  it('clamps wave numbers below 1 to wave 1', () => {
    const objectives = getWaveObjectives(0);
    expect(objectives).toEqual(getWaveObjectives(1));
  });
});
