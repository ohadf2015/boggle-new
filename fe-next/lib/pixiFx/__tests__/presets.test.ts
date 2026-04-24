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
