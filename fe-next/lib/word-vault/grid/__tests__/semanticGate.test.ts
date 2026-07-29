import { describe, it, expect } from 'vitest';
import { gateAccepts, gateBonusFor, getSemanticClass } from '../semanticGate';

describe('semanticGate', () => {
  it('name-male accepts אש (the protagonist symbol-name in r1.1 context)', () => {
    expect(gateAccepts('name-male', 'אש')).toBe(true);
  });

  it('name-male rejects an unrelated word like בית', () => {
    expect(gateAccepts('name-male', 'בית')).toBe(false);
  });

  it('returns rare-bonus rarity when word is in rareBonusList', () => {
    const cls = getSemanticClass('name-male');
    expect(cls.rareBonusList ?? []).toContain('להבה');
    expect(gateBonusFor('name-male', 'להבה')).toBe(2);
  });

  it('returns 1 for plain accept-list hit', () => {
    expect(gateBonusFor('name-male', 'אש')).toBe(1);
  });

  it('returns 0 for non-accepted word', () => {
    expect(gateBonusFor('name-male', 'בית')).toBe(0);
  });
});
