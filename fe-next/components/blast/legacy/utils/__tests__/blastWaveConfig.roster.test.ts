import { describe, it, expect } from 'vitest';
import { getWaveConfig, getWaveDistribution, getWaveObjectives } from '../blastWaveConfig';
import { generateTileStates } from '../blastTileGeneration';

const ROSTER = ['bomb', 'diamond', 'gold'];

describe('blast wave roster — bomb, coin, diamond', () => {
  it('rolls only bombs and coins at every wave; diamonds are never random', () => {
    for (let wave = 1; wave <= 20; wave++) {
      const dist = getWaveDistribution(getWaveConfig(wave));
      expect(Object.keys(dist).sort()).toEqual(ROSTER);
      expect(dist.diamond).toBe(0);
      expect(dist.bomb).toBeGreaterThan(0);
      expect(dist.gold).toBeGreaterThan(0);
      expect(dist.bomb + dist.gold).toBeCloseTo(1);
    }
  });

  it('keeps the warm-up board mostly letters with about three bombs on 6x6', () => {
    let specials = 0;
    const boards = 200;
    for (let seed = 1; seed <= boards; seed++) {
      const cfg = getWaveConfig(1);
      specials += generateTileStates(6, cfg.specialTileChance, 1_700_000_000 + seed * 7919, getWaveDistribution(cfg))
        .flat().filter(t => t.type !== 'standard').length;
    }
    const perBoard = specials / boards;
    expect(perBoard).toBeGreaterThan(3.5);
    expect(perBoard).toBeLessThan(36 * 0.2);
  });

  it('spawns more specials in later waves', () => {
    expect(getWaveConfig(10).specialTileChance).toBeGreaterThan(getWaveConfig(1).specialTileChance);
  });

  it('only sets objectives on tiles that still exist', () => {
    for (let wave = 1; wave <= 20; wave++) {
      for (const obj of getWaveObjectives(wave, 'en')) {
        if (obj.tileType) expect(ROSTER).toContain(obj.tileType);
      }
    }
  });

  it('asks for diamonds in at least one wave', () => {
    const asksDiamonds = Array.from({ length: 20 }, (_, i) => getWaveObjectives(i + 1, 'en'))
      .some(objs => objs.some(o => o.tileType === 'diamond'));
    expect(asksDiamonds).toBe(true);
  });
});
