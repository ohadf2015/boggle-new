import { describe, it, expect, beforeEach } from 'vitest';
import { __resetRevealSessionForTests } from '@/lib/avatar/revealTrigger';
import { fixtureReveal, parseRevealLabKnobs } from '../revealLabFixtures';

beforeEach(() => __resetRevealSessionForTests());

describe('reveal lab knobs', () => {
  it('defaults: previous level = level - 1, member, full motion, open', () => {
    expect(parseRevealLabKnobs('', 6)).toEqual({ from: 5, guest: false, staticMotion: false, rarity: null, open: true, failEquip: false });
  });

  it('reads from / guest / motion / rarity / open / fail', () => {
    expect(parseRevealLabKnobs('?from=1&guest=1&motion=static&rarity=legendary&open=0&fail=1', 10)).toEqual({
      from: 1, guest: true, staticMotion: true, rarity: 'legendary', open: false, failEquip: true,
    });
  });

  it('clamps a bogus from and ignores an unknown rarity', () => {
    expect(parseRevealLabKnobs('?from=99&rarity=mythic', 6)).toMatchObject({ from: 5, rarity: null });
    expect(parseRevealLabKnobs('?from=-3', 6).from).toBe(1);
  });
});

describe('fixtureReveal', () => {
  it('uses the real ladder between from and level', () => {
    const r = fixtureReveal(6, parseRevealLabKnobs('?from=4', 6))!;
    expect(r.unlocks.map(u => u.partId)).toEqual(['cowboyHat', '#4B0082', 'heartEye']);
  });

  it('forces a rarity for captures (legendary is gold-only, never on the ladder)', () => {
    const r = fixtureReveal(2, parseRevealLabKnobs('?rarity=legendary', 2))!;
    expect(r.rarity).toBe('legendary');
    expect(r.unlocks.every(u => u.rarity === 'legendary')).toBe(true);
  });

  it('null when nothing unlocks', () => {
    expect(fixtureReveal(12, parseRevealLabKnobs('', 12))).toBeNull();
  });
});
