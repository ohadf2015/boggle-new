import { getWaveObjectives, getWavePassPct } from '../blastWaveConfig';

describe('getWaveObjectives', () => {
  it('gives every wave one goal: clear the board to its pass bar', () => {
    for (let wave = 1; wave <= 40; wave++) {
      expect(getWaveObjectives(wave, 'en')).toEqual([{ type: 'clear_percent', target: getWavePassPct(wave) }]);
    }
  });

  it('clamps wave numbers below 1 to wave 1', () => {
    expect(getWaveObjectives(0)).toEqual(getWaveObjectives(1));
  });
});
