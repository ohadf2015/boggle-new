import { describe, it, expect, vi } from 'vitest';
import { deriveGuestUsername, signInAsGuestStudent, waitForProfile } from '../guestStudent';

/**
 * These asserted an exact 1:1 slug, which is precisely the contract that caused
 * the outage: `profiles.username` is globally unique, so mapping a display name
 * onto it meant the second "Priya" ANYWHERE raised inside the
 * `handle_new_user` trigger and Supabase returned a 500. The username now
 * carries a random suffix; see guestUsernameUnique.test.ts. The slug part is
 * still asserted here, as a prefix.
 */
describe('deriveGuestUsername', () => {
  it('slugifies a display name (lowercase, underscores, alnum only)', () => {
    expect(deriveGuestUsername('Maya Kohn')).toMatch(/^maya_kohn-/);
    expect(deriveGuestUsername('  José-Luis!! ')).toMatch(/^jos_luis-/);
  });
  it('caps length and trims edge underscores', () => {
    expect(deriveGuestUsername('A'.repeat(40)).length).toBeLessThanOrEqual(32);
    expect(deriveGuestUsername('__hi__')).toMatch(/^hi-/);
  });
  it('returns empty string when no alphanumerics remain', () => {
    expect(deriveGuestUsername('!!! ??? ')).toBe('');
    expect(deriveGuestUsername('   ')).toBe('');
  });
});

function mockSupabase(signInImpl: () => Promise<unknown>, profileRows: Array<{ id: string } | null> = []) {
  let call = 0;
  return {
    auth: { signInAnonymously: vi.fn(signInImpl) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: profileRows[call++] ?? null, error: null })),
        })),
      })),
    })),
  };
}

describe('signInAsGuestStudent', () => {
  it('rejects an empty name without calling supabase', async () => {
    const sb = mockSupabase(async () => ({ data: { user: { id: 'x' } }, error: null }));
    const res = await signInAsGuestStudent(sb as never, '   ');
    expect(res.error).toBe('NAME_REQUIRED');
    expect(res.user).toBeNull();
    expect(sb.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it('signs in anonymously passing the name as full_name + a username slug', async () => {
    const sb = mockSupabase(async () => ({ data: { user: { id: 'anon-1' } }, error: null }));
    const res = await signInAsGuestStudent(sb as never, 'Maya Kohn');
    expect(res.error).toBeNull();
    expect(res.user).toEqual({ id: 'anon-1' });
    // The TYPED name goes to full_name (which the trigger writes to
    // display_name, and which every student-facing surface renders). The
    // username is an internal, globally unique handle, so it is matched as a
    // prefix — pinning it exactly is what made the second Priya a 500.
    const [arg] = (sb.auth.signInAnonymously as unknown as { mock: { calls: Array<[{ options: { data: Record<string, string> } }]> } }).mock.calls[0];
    expect(arg.options.data.full_name).toBe('Maya Kohn');
    expect(arg.options.data.username).toMatch(/^maya_kohn-[a-z0-9]+$/);
  });

  it('omits username (lets the DB default) when the name has no slug', async () => {
    const sb = mockSupabase(async () => ({ data: { user: { id: 'anon-2' } }, error: null }));
    await signInAsGuestStudent(sb as never, '★★★');
    expect(sb.auth.signInAnonymously).toHaveBeenCalledWith({
      options: { data: { full_name: '★★★' } },
    });
  });

  it('returns the supabase error message on failure', async () => {
    const sb = mockSupabase(async () => ({ data: { user: null }, error: { message: 'Anonymous sign-ins are disabled' } }));
    const res = await signInAsGuestStudent(sb as never, 'Maya');
    expect(res.user).toBeNull();
    expect(res.error).toBe('Anonymous sign-ins are disabled');
  });
});

describe('waitForProfile (race-safe: await the trigger-created profile row)', () => {
  it('returns true as soon as the profile row exists', async () => {
    const sb = mockSupabase(async () => ({}), [{ id: 'u1' }]);
    expect(await waitForProfile(sb as never, 'u1', { tries: 3, delayMs: 0 })).toBe(true);
  });

  it('retries until the row appears', async () => {
    const sb = mockSupabase(async () => ({}), [null, null, { id: 'u1' }]);
    expect(await waitForProfile(sb as never, 'u1', { tries: 5, delayMs: 0 })).toBe(true);
  });

  it('returns false after exhausting tries', async () => {
    const sb = mockSupabase(async () => ({}), [null, null, null]);
    expect(await waitForProfile(sb as never, 'u1', { tries: 3, delayMs: 0 })).toBe(false);
  });
});
