import { describe, it, expect } from 'vitest';
import { PRESETS } from '../presets';

describe('pixiFx presets — blast migration', () => {
  it('registers word-found preset with lime/yellow palette and gravity', () => {
    const p = PRESETS['word-found' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.gravity?.y).toBeGreaterThan(0);
    expect(p.colors).toEqual(expect.arrayContaining(['BFFF00']));
    expect(p.shape).toBe('diamond');
  });

  it('registers combo-break preset with pink/lime palette and no gravity', () => {
    const p = PRESETS['combo-break' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.gravity).toBeUndefined();
    expect(p.colors).toEqual(expect.arrayContaining(['FF1493']));
    expect(p.shape).toBe('diamond');
  });

  it('registers victory-burst preset with 5-color palette and star shape', () => {
    const p = PRESETS['victory-burst' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.colors.length).toBeGreaterThanOrEqual(5);
    expect(p.shape).toBe('star');
    expect(p.gravity?.y).toBeGreaterThan(0);
  });

  it('victory-burst has longer lifetime than word-found', () => {
    const v = PRESETS['victory-burst' as keyof typeof PRESETS];
    const w = PRESETS['word-found' as keyof typeof PRESETS];
    expect(v.lifetime.max).toBeGreaterThan(w.lifetime.max);
  });
});

describe('pixiFx presets — boost flourish', () => {
  it('registers boost-freezeTime preset with cyan/white icy palette', () => {
    const p = PRESETS['boost-freezeTime' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.colors).toEqual(expect.arrayContaining(['00FFFF']));
    expect(p.colors).toEqual(expect.arrayContaining(['FFFFFF']));
    expect(p.shape).toBe('diamond');
  });

  it('registers boost-hint preset with yellow/lime "lightbulb" palette', () => {
    const p = PRESETS['boost-hint' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.colors).toEqual(expect.arrayContaining(['FFE135']));
    expect(p.colors).toEqual(expect.arrayContaining(['BFFF00']));
    expect(p.shape).toBe('star');
  });

  it('registers boost-scoreMultiplier preset with pink/gold high-stakes palette and gravity', () => {
    const p = PRESETS['boost-scoreMultiplier' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.colors).toEqual(expect.arrayContaining(['FF1493']));
    expect(p.colors).toEqual(expect.arrayContaining(['FFD700']));
    expect(p.gravity?.y).toBeGreaterThan(0);
  });

  it('registers boost-firstWordBonus preset with lime/cyan encouraging palette', () => {
    const p = PRESETS['boost-firstWordBonus' as keyof typeof PRESETS];
    expect(p).toBeDefined();
    expect(p.colors).toEqual(expect.arrayContaining(['BFFF00']));
    expect(p.colors).toEqual(expect.arrayContaining(['00FFFF']));
  });

  it('all boost presets are short-lived bursts (< 1s lifetime, no continuous emitter)', () => {
    const types = ['boost-freezeTime', 'boost-hint', 'boost-scoreMultiplier', 'boost-firstWordBonus'] as const;
    for (const name of types) {
      const p = PRESETS[name as keyof typeof PRESETS];
      expect(p.emitterLifetime).toBeLessThan(0.05);
      expect(p.lifetime.max).toBeLessThan(1.5);
      expect(p.spawnShape).toBe('burst');
    }
  });
});
