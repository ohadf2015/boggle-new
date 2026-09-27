import { describe, expect, it } from 'vitest';
import { shareBiomeId, v2ShareCardPath } from '../shareCard';

describe('v2 share card URL', () => {
  it('given a v2 run, when the recap path is built, then it is a graphic PNG route with no emoji', () => {
    const path = v2ShareCardPath({
      heightM: 18.4,
      floors: 6,
      biome: 'downtown',
      topWord: 'tower',
      name: 'Dana',
    });
    expect(path.startsWith('/api/word-tower/share?')).toBe(true);
    expect(path).toContain('h=18');
    expect(path).toContain('f=6');
    expect(path).toContain('b=city');
    expect(path).toContain('w=tower');
    expect(path).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('maps every v2 sky onto a v1 card biome', () => {
    expect(shareBiomeId('sunset')).toBe('sky');
    expect(shareBiomeId('cosmos')).toBe('galaxy');
  });
});
