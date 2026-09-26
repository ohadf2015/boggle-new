import { describe, it, expect } from 'vitest';
import { levelStartFire, fightStartFire, combatFxFire } from '../relicEvents';

describe('levelStartFire', () => {
  it('given no relics, then nothing fires', () => {
    expect(levelStartFire([]).relics).toEqual([]);
  });

  it('given hourglass, then it names the seconds it added', () => {
    const fire = levelStartFire(['hourglass']);
    expect(fire.relics).toContain('hourglass');
    expect(fire.labels['hourglass']).toBe('+10s');
  });

  it('given heart-locket, then it names the heart it added', () => {
    expect(levelStartFire(['heart-locket']).labels['heart-locket']).toBe('+1');
  });

  it('given lens-of-insight, then it names the hints you hold', () => {
    expect(levelStartFire(['lens-of-insight']).labels['lens-of-insight']).toBe('3');
  });

  it('given magnet, then the level deal names its always-on boost once — not on every word', () => {
    const fire = levelStartFire(['magnet']);
    expect(fire.relics).toContain('magnet');
    expect(fire.labels['magnet']).toBe('+20%');
  });
});

describe('fightStartFire', () => {
  it('given iron-bookmark and a shield, then it fires', () => {
    expect(fightStartFire(['iron-bookmark'], 1).relics).toEqual(['iron-bookmark']);
  });

  it('given no iron-bookmark, then nothing fires', () => {
    expect(fightStartFire([], 1).relics).toEqual([]);
  });

  it('given no shield, then nothing fires', () => {
    expect(fightStartFire(['iron-bookmark'], 0).relics).toEqual([]);
  });
});

describe('combatFxFire', () => {
  it('given a revive, then phoenix-feather is named', () => {
    expect(combatFxFire(['phoenix-feather'], ['revive']).relics).toEqual(['phoenix-feather']);
  });

  it('given a freeze with frost-ward, then it shows the cut', () => {
    expect(combatFxFire(['frost-ward'], ['freeze']).labels['frost-ward']).toBe('−50%');
  });

  it('given a plain hit, then nothing fires', () => {
    expect(combatFxFire(['frost-ward', 'phoenix-feather'], ['hit']).relics).toEqual([]);
  });
});
