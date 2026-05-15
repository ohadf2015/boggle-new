import { describe, it, expect } from 'vitest';
import { buildRegistry, getLevelSourceForLevel } from '../level-source-registry';

describe('level source registry', () => {
  it('returns registry with curated, generated, and chain sources', () => {
    const registry = buildRegistry();
    expect(registry).toHaveProperty('curated');
    expect(registry).toHaveProperty('generated');
    expect(registry).toHaveProperty('chain');
  });

  it('curated source resolves level 3', async () => {
    const registry = buildRegistry();
    const level = await registry.curated.resolve(3, 'en', 'guest');
    expect(level).toBeDefined();
    expect(level.levelNumber).toBe(3);
    expect(level.locale).toBe('en');
    expect(level.words.length).toBeGreaterThan(0);
  });

  it('getLevelSourceForLevel returns chain for en level 1-30', () => {
    const registry = buildRegistry();
    expect(getLevelSourceForLevel(1, 'en', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(15, 'en', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(30, 'en', registry)).toBe(registry.chain);
  });

  it('getLevelSourceForLevel returns chain for he level 1-30', () => {
    const registry = buildRegistry();
    expect(getLevelSourceForLevel(1, 'he', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(15, 'he', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(30, 'he', registry)).toBe(registry.chain);
  });

  it('getLevelSourceForLevel returns generated for en level 31+', () => {
    const registry = buildRegistry();
    expect(getLevelSourceForLevel(31, 'en', registry)).toBe(registry.generated);
  });

  it('getLevelSourceForLevel returns curated for sv level 1 (non-chain locale)', () => {
    const registry = buildRegistry();
    expect(getLevelSourceForLevel(1, 'sv', registry)).toBe(registry.curated);
  });
});
