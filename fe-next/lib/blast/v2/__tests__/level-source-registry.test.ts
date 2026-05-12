import { describe, it, expect } from 'vitest';
import { buildRegistry } from '../level-source-registry';

describe('level source registry', () => {
  it('returns registry with curated and generated sources', () => {
    const registry = buildRegistry();
    expect(registry).toHaveProperty('curated');
    expect(registry).toHaveProperty('generated');
  });

  it('curated source resolves onboarding level 1', async () => {
    const registry = buildRegistry();
    const level = await registry.curated.resolve(1, 'en', 'guest');
    expect(level).toBeDefined();
    expect(level.levelNumber).toBe(1);
    expect(level.locale).toBe('en');
    expect(level.words.length).toBeGreaterThan(0);
  });
});
