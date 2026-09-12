/**
 * Whose name goes on the duel card.
 *
 * Measured live on 2026-09-12 (S1 challenges S2 on the capture server): the
 * turn card read "YOUR MOVE VS OPPONENT" and the reveal said "OPPONENT",
 * because the only source wired up was the classroom roster — and a STUDENT
 * reading `classroom_memberships` with a `profiles(...)` embed gets zero rows
 * back with `error: null` (memory: own-row RLS, and the embed's FK points at
 * auth.users, not profiles). One source that can silently return nothing is
 * not a source (recurring-pitfalls Class 4).
 *
 * So the name is resolved from whatever actually arrived, in order of how
 * trustworthy it is at that moment, and the live socket name is remembered so a
 * reload does not lose it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveDuelOpponentName,
  rememberChallengerName,
  readChallengerName,
  rememberStudentName,
  readStudentName,
} from '../duelOpponentNames';

describe('resolveDuelOpponentName', () => {
  const duelId = 'duel-1';
  const challengerId = 'user-1';

  it('prefers the name the challenge event carried', () => {
    const name = resolveDuelOpponentName({
      duelId,
      challengerId,
      fromChallenge: { [duelId]: 'Ada' },
      fromPresence: { [challengerId]: 'Presence Ada' },
      fromRoster: { [challengerId]: 'Roster Ada' },
      fallback: 'Opponent',
    });
    expect(name).toBe('Ada');
  });

  it('falls back to the live lobby roster when no challenge event was seen', () => {
    const name = resolveDuelOpponentName({
      duelId,
      challengerId,
      fromPresence: { [challengerId]: 'Presence Ada' },
      fromRoster: { [challengerId]: 'Roster Ada' },
      fallback: 'Opponent',
    });
    expect(name).toBe('Presence Ada');
  });

  it('falls back to the classroom roster when nobody is online', () => {
    const name = resolveDuelOpponentName({
      duelId,
      challengerId,
      fromRoster: { [challengerId]: 'Roster Ada' },
      fallback: 'Opponent',
    });
    expect(name).toBe('Roster Ada');
  });

  it('never returns a raw uuid, an empty string or whitespace', () => {
    expect(
      resolveDuelOpponentName({
        duelId,
        challengerId,
        fromChallenge: { [duelId]: '   ' },
        fromPresence: { [challengerId]: '' },
        fromRoster: { [challengerId]: challengerId },
        fallback: 'Opponent',
      })
    ).toBe('Opponent');
  });

  it('reads a name remembered from an earlier session', () => {
    rememberChallengerName(duelId, 'Ada');
    const name = resolveDuelOpponentName({ duelId, challengerId, fallback: 'Opponent' });
    expect(name).toBe('Ada');
  });
});

describe('rememberChallengerName', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('survives a reload, which is when the socket event is long gone', () => {
    rememberChallengerName('duel-9', 'Grace');
    expect(readChallengerName('duel-9')).toBe('Grace');
  });

  it('refuses to store a blank name rather than caching "Opponent" forever', () => {
    rememberChallengerName('duel-10', '  ');
    expect(readChallengerName('duel-10')).toBeNull();
  });

  it('survives blocked storage without throwing', () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error('blocked');
    };
    expect(() => rememberChallengerName('duel-11', 'Grace')).not.toThrow();
    window.localStorage.setItem = original;
  });
});

/**
 * The duel SCREEN has no roster and no socket event — it has an opponent id and
 * `getProfile()`, which returns null rows with `error: null` for another
 * student (own-row RLS on `profiles`). That is why the reveal said "OPPONENT"
 * even for the student who typed the challenge themselves. So names are also
 * remembered against the user id, by whoever learns one first.
 */
describe('student names remembered by user id', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('gives the duel screen a name when the profile row is unreadable', () => {
    rememberStudentName('user-7', 'Grace');
    expect(readStudentName('user-7')).toBe('Grace');
  });

  it('is used by the resolver when no roster and no event is available', () => {
    rememberStudentName('user-8', 'Grace');
    expect(
      resolveDuelOpponentName({
        duelId: 'duel-x',
        challengerId: 'user-8',
        fallback: 'Opponent',
      })
    ).toBe('Grace');
  });

  it('ignores a blank name rather than caching an empty label', () => {
    rememberStudentName('user-9', '   ');
    expect(readStudentName('user-9')).toBeNull();
  });

  it('never stores the uuid it was meant to replace', () => {
    rememberStudentName('user-10', 'user-10');
    expect(readStudentName('user-10')).toBeNull();
  });
});
