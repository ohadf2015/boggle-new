/**
 * Tests for combat status effects.
 * Boss: stun (from a parry) suppresses ability activation for a short window.
 * Player buffs: focusArmed (next word crits), wardArmed (next attack blocked).
 * Stun duration scales by phase — shorter in enrage so the fight stays tense.
 */

import {
  createCombatStatus,
  stunDurationForPhase,
  applyStun,
  isStunned,
  armFocus,
  consumeFocus,
  armWard,
  consumeWard,
} from '../statusEffects';

describe('createCombatStatus', () => {
  it('starts clean: not stunned, no buffs', () => {
    const s = createCombatStatus();
    expect(isStunned(s, 1000)).toBe(false);
    expect(s.focusArmed).toBe(false);
    expect(s.wardArmed).toBe(false);
  });
});

describe('stunDurationForPhase', () => {
  it('gives a shorter stun in enrage than phase1 (rising difficulty)', () => {
    expect(stunDurationForPhase('enraged')).toBeLessThan(stunDurationForPhase('phase1'));
  });
  it('is always positive', () => {
    for (const p of ['phase1', 'phase2', 'enraged'] as const) {
      expect(stunDurationForPhase(p)).toBeGreaterThan(0);
    }
  });
});

describe('stun', () => {
  it('marks the boss stunned for the duration window', () => {
    const s = applyStun(createCombatStatus(), 1000, 1500);
    expect(isStunned(s, 1000)).toBe(true);
    expect(isStunned(s, 2400)).toBe(true);
    expect(isStunned(s, 2500)).toBe(false); // exactly at expiry → cleared
    expect(isStunned(s, 3000)).toBe(false);
  });

  it('extends (does not shorten) an existing stun', () => {
    let s = applyStun(createCombatStatus(), 1000, 2000); // until 3000
    s = applyStun(s, 1500, 500); // would be until 2000 — shorter, must not override
    expect(isStunned(s, 2900)).toBe(true);
  });
});

describe('player buffs', () => {
  it('arms and consumes focus once', () => {
    let s = armFocus(createCombatStatus());
    expect(s.focusArmed).toBe(true);
    const { state, consumed } = consumeFocus(s);
    expect(consumed).toBe(true);
    expect(state.focusArmed).toBe(false);
    // second consume does nothing
    expect(consumeFocus(state).consumed).toBe(false);
  });

  it('arms and consumes ward once', () => {
    let s = armWard(createCombatStatus());
    expect(s.wardArmed).toBe(true);
    const { state, consumed } = consumeWard(s);
    expect(consumed).toBe(true);
    expect(state.wardArmed).toBe(false);
    expect(consumeWard(state).consumed).toBe(false);
  });

  it('buffs are independent of stun', () => {
    let s = applyStun(armFocus(createCombatStatus()), 0, 1000);
    expect(s.focusArmed).toBe(true);
    expect(isStunned(s, 0)).toBe(true);
  });
});
