import { describe, it, expect, vi } from 'vitest';
import { deriveGuestUsername, signInAsGuestStudent, waitForProfile } from '../guestStudent';

describe('deriveGuestUsername', () => {
  it('slugifies a display name (lowercase, underscores, alnum only)', () => {
    expect(deriveGuestUsername('Maya Kohn')).toBe('maya_kohn');
    expect(deriveGuestUsername('  José-Luis!! ')).toBe('jos_luis');
  });
  it('caps length and trims edge underscores', () => {
    expect(deriveGuestUsername('A'.repeat(40))).toHaveLength(20);
    expect(deriveGuestUsername('__hi__')).toBe('hi');
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
    expect(sb.auth.signInAnonymously).toHaveBeenCalledWith({
      options: { data: { full_name: 'Maya Kohn', username: 'maya_kohn' } },
    });
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
