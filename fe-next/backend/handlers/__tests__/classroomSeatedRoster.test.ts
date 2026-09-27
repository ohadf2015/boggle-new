/**
 * Who the SERVER saw take a seat — the anti-fabrication set, built from both
 * rosters instead of the one that is usually empty.
 */
import { describe, it, expect } from 'vitest';

import { seatedAuthUserIds } from '../classroomSeatedRoster';

const ADA = '00000000-0000-4000-8000-00000000ada0';
const GUEST = '00000000-0000-4000-8000-000000000gu0'.replace('g', 'a');
const TEACHER = '00000000-0000-4000-8000-000000000tea'.replace(/[te]/g, 'b');

describe('seatedAuthUserIds', () => {
  it('GIVEN an empty classroom roster and a live room of guests THEN the guests count as seated', () => {
    const ids = seatedAuthUserIds([], {
      Maya: { authUserId: GUEST, isBot: false },
    });

    expect(ids.has(GUEST)).toBe(true);
  });

  it('GIVEN both rosters THEN it is their union, not either one alone', () => {
    const ids = seatedAuthUserIds([{ userId: ADA }], {
      Maya: { authUserId: GUEST },
    });

    expect([...ids].sort()).toEqual([ADA, GUEST].sort());
  });

  it('GIVEN a bot in the live room THEN it is not seated (bots must never earn XP)', () => {
    const ids = seatedAuthUserIds([], {
      'Bot Ada': { authUserId: ADA, isBot: true },
    });

    expect(ids.has(ADA)).toBe(false);
  });

  it('GIVEN a live user the server never verified THEN nothing is added for them', () => {
    const ids = seatedAuthUserIds([], {
      Anon: { authUserId: null },
      Other: {},
      Missing: undefined,
    });

    expect(ids.size).toBe(0);
  });

  it('GIVEN no live room at all THEN it falls back to the classroom roster alone', () => {
    const ids = seatedAuthUserIds([{ userId: ADA }], undefined);

    expect([...ids]).toEqual([ADA]);
  });

  it('GIVEN the same student in both rosters THEN they appear once', () => {
    const ids = seatedAuthUserIds([{ userId: ADA }], { Ada: { authUserId: ADA } });

    expect(ids.size).toBe(1);
  });

  it('GIVEN nothing at all THEN it is empty, never permissive', () => {
    expect(seatedAuthUserIds(undefined, undefined).size).toBe(0);
    expect(seatedAuthUserIds([{ userId: null }], {}).size).toBe(0);
  });

  it('keeps the teacher out of it — hosting is not playing', () => {
    const ids = seatedAuthUserIds([{ userId: ADA }], { Ms_K: { authUserId: TEACHER } }, TEACHER);

    expect(ids.has(TEACHER)).toBe(false);
    expect(ids.has(ADA)).toBe(true);
  });
});
