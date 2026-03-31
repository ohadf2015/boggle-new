/**
 * blastWaveObjectives - Tests for wave objective definitions and retrieval.
 */
import { getWaveObjectives } from '../blastWaveConfig';
import type { BlastObjective } from '../../types';

describe('getWaveObjectives', () => {
  it('returns a score_target objective for wave 1', () => {
    const objectives = getWaveObjectives(1);
    expect(objectives).toHaveLength(1);
    expect(objectives[0]).toEqual<BlastObjective>({
      type: 'score_target',
      target: 20,
    });
  });

  it('returns a collect_type gem objective for wave 2', () => {
    const objectives = getWaveObjectives(2);
    expect(objectives).toHaveLength(1);
    expect(objectives[0]).toEqual<BlastObjective>({
      type: 'collect_type',
      tileType: 'gem',
      target: 3,
    });
  });

  it('returns clear_all_type ice + score_target for wave 3', () => {
    const objectives = getWaveObjectives(3);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual<BlastObjective>({
      type: 'clear_all_type',
      tileType: 'ice',
      target: 0,
    });
    expect(objectives[1]).toEqual<BlastObjective>({
      type: 'score_target',
      target: 40,
    });
  });

  it('returns collect_type bomb + word_length for wave 4', () => {
    const objectives = getWaveObjectives(4);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual<BlastObjective>({
      type: 'collect_type',
      tileType: 'bomb',
      target: 4,
    });
    expect(objectives[1]).toEqual<BlastObjective>({
      type: 'word_length',
      target: 2,
      minWordLength: 5,
    });
  });

  it('returns clear_all_type frozen + collect_type lightning for wave 5', () => {
    const objectives = getWaveObjectives(5);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual<BlastObjective>({
      type: 'clear_all_type',
      tileType: 'frozen',
      target: 0,
    });
    expect(objectives[1]).toEqual<BlastObjective>({
      type: 'collect_type',
      tileType: 'lightning',
      target: 3,
    });
  });

  it('returns score_target + collect_type prism for wave 6', () => {
    const objectives = getWaveObjectives(6);
    expect(objectives).toHaveLength(2);
    expect(objectives[0]).toEqual<BlastObjective>({
      type: 'score_target',
      target: 120,
    });
    expect(objectives[1]).toEqual<BlastObjective>({
      type: 'collect_type',
      tileType: 'prism',
      target: 2,
    });
  });

  it('scales score_target linearly for wave 7+', () => {
    const w7 = getWaveObjectives(7);
    expect(w7[0]).toEqual<BlastObjective>({
      type: 'score_target',
      target: 160,
    });

    const w10 = getWaveObjectives(10);
    expect(w10[0]).toEqual<BlastObjective>({
      type: 'score_target',
      target: 280,
    });
  });

  it('rotates objective templates for wave 7+', () => {
    // Wave 7 = template 0 (bombs), wave 8 = template 1 (word_length), wave 9 = template 2 (prism)
    const w7 = getWaveObjectives(7);
    expect(w7[1]).toEqual<BlastObjective>({ type: 'collect_type', tileType: 'bomb', target: 3 });
    const w9 = getWaveObjectives(9);
    expect(w9[1]).toEqual<BlastObjective>({ type: 'collect_type', tileType: 'prism', target: 2 });
  });

  it('clamps wave numbers below 1 to wave 1', () => {
    const objectives = getWaveObjectives(0);
    expect(objectives).toEqual(getWaveObjectives(1));
  });
});
