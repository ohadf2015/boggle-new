/**
 * Membership lookups must distinguish "no" from "could not ask" (RED first).
 *
 * `isClassroomTeacher` returned plain `false` for three different situations:
 * no service-role client, a database error, and a genuine mismatch. The socket
 * handler turned all three into "You are not the teacher of this classroom" —
 * so a server misconfiguration accused the teacher of not owning her own
 * class, in front of it, with no way to tell the difference.
 *
 * The same collapse sits in `isClassroomStudent` and `getClassroomRole`, so a
 * student hits the mirror image: "you are not a member of this classroom".
 */
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';

vi.mock('../client', () => ({ getSupabase: vi.fn() }));

import { getSupabase } from '../client';
import {
  resolveClassroomTeacher,
  resolveClassroomStudent,
  resolveClassroomRole,
  isClassroomTeacher,
  isClassroomStudent,
  getClassroomRole,
} from '../classroomMembership';

/** A client whose single-row lookup resolves to whatever is passed. */
function clientReturning(result: { data: unknown; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve(result) }),
        }),
      }),
    }),
  };
}

const HIT = { data: { id: 'row-1' }, error: null };
const MISS = { data: null, error: null };
const BROKEN = { data: null, error: { message: 'connection reset' } };

beforeEach(() => vi.clearAllMocks());

describe('resolveClassroomTeacher', () => {
  it('says yes for the owning teacher', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(HIT));
    expect(await resolveClassroomTeacher('u1', 'c1')).toBe('yes');
  });

  it('says no for someone who is genuinely not the teacher', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(MISS));
    expect(await resolveClassroomTeacher('u1', 'c1')).toBe('no');
  });

  it('says unavailable when the server has no service-role client', async () => {
    (getSupabase as Mock).mockReturnValue(null);
    expect(await resolveClassroomTeacher('u1', 'c1')).toBe('unavailable');
  });

  it('says unavailable when the lookup itself failed', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(BROKEN));
    expect(await resolveClassroomTeacher('u1', 'c1')).toBe('unavailable');
  });
});

describe('resolveClassroomStudent', () => {
  it('distinguishes all three states', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(HIT));
    expect(await resolveClassroomStudent('u1', 'c1')).toBe('yes');
    (getSupabase as Mock).mockReturnValue(clientReturning(MISS));
    expect(await resolveClassroomStudent('u1', 'c1')).toBe('no');
    (getSupabase as Mock).mockReturnValue(clientReturning(BROKEN));
    expect(await resolveClassroomStudent('u1', 'c1')).toBe('unavailable');
    (getSupabase as Mock).mockReturnValue(null);
    expect(await resolveClassroomStudent('u1', 'c1')).toBe('unavailable');
  });
});

describe('resolveClassroomRole', () => {
  it('returns the role when the user belongs', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(HIT));
    expect(await resolveClassroomRole('u1', 'c1')).toEqual({ status: 'ok', role: 'teacher' });
  });

  it('returns a null role for a real stranger', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(MISS));
    expect(await resolveClassroomRole('u1', 'c1')).toEqual({ status: 'ok', role: null });
  });

  it('reports unavailable rather than inventing a stranger', async () => {
    // The dangerous case: a broken lookup must never read as "not a member",
    // or a whole class is told it does not belong to its own classroom.
    (getSupabase as Mock).mockReturnValue(clientReturning(BROKEN));
    expect(await resolveClassroomRole('u1', 'c1')).toEqual({ status: 'unavailable', role: null });
  });
});

describe('the boolean helpers still behave for existing callers', () => {
  it('isClassroomTeacher is true only on a real hit', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(HIT));
    expect(await isClassroomTeacher('u1', 'c1')).toBe(true);
    (getSupabase as Mock).mockReturnValue(clientReturning(MISS));
    expect(await isClassroomTeacher('u1', 'c1')).toBe(false);
    // Fail CLOSED — an unavailable lookup must not grant access.
    (getSupabase as Mock).mockReturnValue(clientReturning(BROKEN));
    expect(await isClassroomTeacher('u1', 'c1')).toBe(false);
  });

  it('isClassroomStudent fails closed too', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(BROKEN));
    expect(await isClassroomStudent('u1', 'c1')).toBe(false);
  });

  it('getClassroomRole still returns null when the lookup is unavailable', async () => {
    (getSupabase as Mock).mockReturnValue(clientReturning(BROKEN));
    expect(await getClassroomRole('u1', 'c1')).toBeNull();
  });
});
