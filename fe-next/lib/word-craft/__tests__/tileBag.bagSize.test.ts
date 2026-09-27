import { describe, expect, it } from 'vitest';
import { createBag } from '../tileBag';

describe('createBag with bagSize option', () => {
  it('full bag is 100 tiles for EN by default', () => {
    const bag = createBag({ seed: 1, locale: 'en' });
    expect(bag.tiles.length).toBe(100);
  });

  it('honors bagSize: 78 for phone', () => {
    const bag = createBag({ seed: 1, locale: 'en', bagSize: 78 });
    expect(bag.tiles.length).toBe(78);
  });

  it('still works for HE locale with bagSize override', () => {
    const bag = createBag({ seed: 1, locale: 'he', bagSize: 78 });
    expect(bag.tiles.length).toBe(78);
  });

  it('deterministic shuffle per seed regardless of bagSize', () => {
    const a = createBag({ seed: 42, locale: 'en', bagSize: 78 });
    const b = createBag({ seed: 42, locale: 'en', bagSize: 78 });
    expect(a.tiles.map((t) => t.letter)).toEqual(b.tiles.map((t) => t.letter));
  });
});
