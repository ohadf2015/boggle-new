/**
 * Duplicate names are a CLASSROOM question, not a global one.
 *
 * The first version of this guarded the global `profiles.username` index, and
 * the critic caught what that means in practice: the first Priya in a brand-new
 * classroom was refused because another school's Priya existed. That is
 * indefensible — a student's own first name is not something another school can
 * use up.
 *
 * `deriveGuestUsername` now appends a random suffix, so internal usernames never
 * collide and the Supabase 500 is gone at its source (see
 * guestUsernameUnique.test.ts). What is left is the real local problem: two
 * Priyas in the SAME class cannot tell their own rows apart on the roster, the
 * standings, or a report. Worth one tap; scoped to the room.
 */
import { describe, it, expect } from 'vitest';
import { suggestAvailableGuestName } from '../guestNameCollision';

describe('suggestAvailableGuestName', () => {
  it('lets the first Priya in a new classroom keep her name', () => {
    // GIVEN an empty classroom — the case that was wrongly refused
    const result = suggestAvailableGuestName('Priya', new Set());

    expect(result).toEqual({ available: true, name: 'Priya' });
  });

  it('does not care what students at other schools are called', () => {
    // GIVEN this classroom's roster, which is the only thing we are told about.
    // A global name check is what produced the wrong refusal.
    const result = suggestAvailableGuestName('Priya', new Set(['Sam', 'Lee']));

    expect(result).toEqual({ available: true, name: 'Priya' });
  });

  it('suggests "Priya 2" for a second Priya in the SAME class', () => {
    const result = suggestAvailableGuestName('Priya', new Set(['Priya', 'Sam']));

    expect(result).toEqual({ available: false, name: 'Priya 2' });
  });

  it('treats a different capitalisation as the same person in the room', () => {
    // "priya" and "Priya" are indistinguishable on a projected leaderboard
    const result = suggestAvailableGuestName('priya', new Set(['Priya']));

    expect(result).toEqual({ available: false, name: 'priya 2' });
  });

  it('ignores incidental whitespace', () => {
    const result = suggestAvailableGuestName('Priya  K', new Set(['priya k']));

    expect(result.available).toBe(false);
  });

  it('keeps counting when the obvious suggestion is also taken', () => {
    const result = suggestAvailableGuestName('Priya', new Set(['Priya', 'Priya 2', 'Priya 3']));

    expect(result).toEqual({ available: false, name: 'Priya 4' });
  });

  it('never suggests a name that is itself taken', () => {
    const taken = new Set(['Priya', 'Priya 2']);
    const result = suggestAvailableGuestName('Priya', taken);

    const normalized = new Set(Array.from(taken, (n) => n.toLowerCase()));
    expect(normalized.has(result.name.toLowerCase())).toBe(false);
  });

  it('gives up gracefully rather than looping forever', () => {
    // GIVEN fifty Priyas, which is not a real class but must not hang
    const taken = new Set(['Priya']);
    for (let i = 2; i <= 60; i++) taken.add(`Priya ${i}`);

    const result = suggestAvailableGuestName('Priya', taken);

    expect(result.available).toBe(false);
    const normalized = new Set(Array.from(taken, (n) => n.toLowerCase()));
    expect(normalized.has(result.name.toLowerCase())).toBe(false);
  });

  it('does not choke on an empty name', () => {
    // The form guards this, but a helper that throws on '' turns a validation
    // message into a crash.
    expect(suggestAvailableGuestName('   ', new Set(['Priya']))).toEqual({
      available: true,
      name: '',
    });
  });
});
