import { describe, it, expect } from 'vitest';
import { checkCategoryBonus, getHiddenCategory } from '../categoryBonus';

describe('getHiddenCategory', () => {
  it('returns a valid category key', () => {
    const cat = getHiddenCategory('2026-06-28');
    expect(['animals', 'foods', 'places']).toContain(cat);
  });

  it('rotates across days deterministically', () => {
    const d1 = getHiddenCategory('2026-06-28'); // day=28, 28%3=1 → foods
    const d2 = getHiddenCategory('2026-06-29'); // day=29, 29%3=2 → places
    const d3 = getHiddenCategory('2026-06-30'); // day=30, 30%3=0 → animals
    expect(d1).toBe('foods');
    expect(d2).toBe('places');
    expect(d3).toBe('animals');
  });
});

describe('checkCategoryBonus', () => {
  it('returns hit=true and 2× multiplier when word is in active category', () => {
    // day=29 → places; みなと is a place
    const result = checkCategoryBonus('みなと', '2026-06-29');
    expect(result.hit).toBe(true);
    expect(result.category).toBe('places');
    expect(result.bonusMultiplier).toBe(2);
  });

  it('returns hit=false when word is not in active category', () => {
    // day=29 → places; ねこ is an animal, not a place
    const result = checkCategoryBonus('ねこ', '2026-06-29');
    expect(result.hit).toBe(false);
    expect(result.category).toBeNull();
    expect(result.bonusMultiplier).toBe(1);
  });

  it('returns hit=false for words not in any category', () => {
    const result = checkCategoryBonus('あいうえお', '2026-06-28');
    expect(result.hit).toBe(false);
    expect(result.bonusMultiplier).toBe(1);
  });

  it('only matches the active day category, not others', () => {
    // day=28 → foods; ねこ is animals (not foods) — miss
    const result = checkCategoryBonus('ねこ', '2026-06-28');
    expect(result.hit).toBe(false);
    // day=30 → animals; ねこ is animals — hit
    const hit = checkCategoryBonus('ねこ', '2026-06-30');
    expect(hit.hit).toBe(true);
    expect(hit.category).toBe('animals');
  });
});
