import { describe, it, expect } from 'vitest';
import { biomeBlendAt } from './biomeBlend';

describe('biomeBlendAt', () => {
  it('blends from city toward sky at the ground', () => {
    expect(biomeBlendAt(0)).toEqual({ fromId: 'city', toId: 'sky', t: 0 });
  });

  it('reports half progress mid-band', () => {
    expect(biomeBlendAt(25)).toEqual({ fromId: 'city', toId: 'sky', t: 0.5 });
  });

  it('starts the next band exactly at a threshold', () => {
    expect(biomeBlendAt(50)).toEqual({ fromId: 'sky', toId: 'stratosphere', t: 0 });
  });

  it('interpolates within a higher band', () => {
    expect(biomeBlendAt(100)).toEqual({ fromId: 'sky', toId: 'stratosphere', t: 0.5 });
    expect(biomeBlendAt(300)).toEqual({ fromId: 'orbit', toId: 'nebula', t: 0 });
  });

  it('holds at the top biome with no next', () => {
    expect(biomeBlendAt(800)).toEqual({ fromId: 'galaxy', toId: 'galaxy', t: 0 });
    expect(biomeBlendAt(5000)).toEqual({ fromId: 'galaxy', toId: 'galaxy', t: 0 });
  });
});
