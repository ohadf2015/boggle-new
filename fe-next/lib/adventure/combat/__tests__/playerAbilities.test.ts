/**
 * Tests for the player ability kit (the RPG "moveset").
 * Abilities are charged by combos and cast for tactical effects:
 *  - smite: burst boss damage
 *  - ward:  block the next boss attack
 *  - focus: next valid word crits (2x)
 */

import {
  PLAYER_ABILITIES,
  createAbilityState,
  chargesFromCombo,
  canCast,
  castAbility,
  smiteDamage,
  type PlayerAbilityId,
} from '../playerAbilities';

describe('PLAYER_ABILITIES registry', () => {
  it('defines exactly the three abilities with required fields', () => {
    const ids = PLAYER_ABILITIES.map(a => a.id).sort();
    expect(ids).toEqual(['focus', 'smite', 'ward']);
    for (const a of PLAYER_ABILITIES) {
      expect(a.nameKey).toMatch(/^adventure\.boss\.combat\.ability\./);
      expect(a.descKey).toMatch(/^adventure\.boss\.combat\.ability\./);
      expect(a.icon).toBeTruthy();
      expect(a.chargeCost).toBeGreaterThan(0);
    }
  });
});

describe('chargesFromCombo', () => {
  it('grants no charge below the first threshold', () => {
    expect(chargesFromCombo(0)).toBe(0);
    expect(chargesFromCombo(2)).toBe(0);
  });

  it('grants more charges as combo climbs (non-linear, rewarding streaks)', () => {
    const c3 = chargesFromCombo(3);
    const c6 = chargesFromCombo(6);
    const c12 = chargesFromCombo(12);
    expect(c3).toBeGreaterThanOrEqual(1);
    expect(c6).toBeGreaterThan(c3);
    expect(c12).toBeGreaterThan(c6);
  });

  it('is monotonic non-decreasing in combo', () => {
    let prev = -1;
    for (let combo = 0; combo <= 30; combo++) {
      const c = chargesFromCombo(combo);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe('ability state + casting', () => {
  it('starts with zero charge and nothing castable', () => {
    const state = createAbilityState();
    expect(state.charge).toBe(0);
    for (const a of PLAYER_ABILITIES) {
      expect(canCast(state, a.id)).toBe(false);
    }
  });

  it('allows casting once enough charge accrues', () => {
    const state = { ...createAbilityState(), charge: 2 };
    expect(canCast(state, 'smite')).toBe(true);
  });

  it('spends charge on cast and returns the effect', () => {
    const state = { ...createAbilityState(), charge: 3 };
    const { state: next, effect } = castAbility(state, 'smite', { world: 5 });
    expect(next.charge).toBe(3 - PLAYER_ABILITIES.find(a => a.id === 'smite')!.chargeCost);
    expect(effect.kind).toBe('smite');
    expect(effect.damage).toBeGreaterThan(0);
  });

  it('refuses to cast without enough charge (no state change)', () => {
    const state = createAbilityState();
    const { state: next, effect } = castAbility(state, 'ward', { world: 1 });
    expect(next).toEqual(state);
    expect(effect).toBeNull();
  });

  it('ward produces a block effect, focus produces a crit-arm effect', () => {
    const ward = castAbility({ ...createAbilityState(), charge: 5 }, 'ward', { world: 1 });
    expect(ward.effect?.kind).toBe('ward');
    const focus = castAbility({ ...createAbilityState(), charge: 5 }, 'focus', { world: 1 });
    expect(focus.effect?.kind).toBe('focus');
  });

  it('caps stored charge so it cannot grow unbounded', () => {
    const state = { ...createAbilityState(), charge: 999 };
    const capped = castAbility(state, 'smite', { world: 1 });
    expect(capped.state.charge).toBeLessThanOrEqual(999);
  });
});

describe('smiteDamage', () => {
  it('scales with world', () => {
    expect(smiteDamage(10)).toBeGreaterThan(smiteDamage(1));
  });
  it('is always a positive integer', () => {
    for (const w of [1, 5, 10]) {
      const d = smiteDamage(w);
      expect(Number.isInteger(d)).toBe(true);
      expect(d).toBeGreaterThan(0);
    }
  });
});
