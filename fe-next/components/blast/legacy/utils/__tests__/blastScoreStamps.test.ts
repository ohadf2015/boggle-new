import { describe, it, expect } from 'vitest';
import { buildScoreStamps } from '../blastScoreStamps';

const t = (_k: string, fb?: string) => fb ?? _k;

describe('buildScoreStamps gem multiplier', () => {
  it('shows the real multiplier of each gem on the path', () => {
    expect(buildScoreStamps(['diamond'], 'common', t, ['ruby'])?.[0].mult).toBe(4);
    expect(buildScoreStamps(['diamond', 'diamond'], 'common', t, ['amethyst', 'emerald'])?.[0].mult).toBe(6);
  });
  it('reads a gemless diamond as sapphire', () => {
    expect(buildScoreStamps(['diamond'], 'common', t)?.[0].mult).toBe(2);
  });
});
