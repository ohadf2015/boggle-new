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

  it('getLevelSourceForLevel returns chain for sv/es level 1-30 (curated packs shipped)', () => {
    // sv + es now ship generated-and-verified chain packs, so they get the same
    // hand-tuned onboarding routing as en/he.
    const registry = buildRegistry();
    expect(getLevelSourceForLevel(1, 'sv', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(30, 'sv', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(1, 'es', registry)).toBe(registry.chain);
    expect(getLevelSourceForLevel(30, 'es', registry)).toBe(registry.chain);
  });

  it('getLevelSourceForLevel returns generated for sv/es level 31+ and ja from level 1', () => {
    // Past the curated range sv/es fall through to the generator; ja has no
    // pack dir so it routes to the generator from level 1.
    const registry = buildRegistry();
    expect(getLevelSourceForLevel(31, 'sv', registry)).toBe(registry.generated);
    expect(getLevelSourceForLevel(31, 'es', registry)).toBe(registry.generated);
    expect(getLevelSourceForLevel(1, 'ja', registry)).toBe(registry.generated);
  });
});
