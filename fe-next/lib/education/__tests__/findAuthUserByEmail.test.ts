import { describe, expect, it, vi, afterEach } from 'vitest';
import { findAuthUserByEmail } from '../findAuthUserByEmail';

describe('findAuthUserByEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exact-matches the filter result and keeps confirmation status', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      users: [
        { id: 'other', email: 'student@students.mpac.nsw.edu.au', email_confirmed_at: '2026-01-01' },
        { id: 'typo', email: 'student@student.mpac.nsw.edu.au', email_confirmed_at: null },
      ],
    }), { status: 200 }));

    const found = await findAuthUserByEmail('Student@student.mpac.nsw.edu.au', fetchImpl as unknown as typeof fetch);

    expect(found).toEqual({ user: { id: 'typo', emailConfirmedAt: null } });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('filter=student%40student.mpac.nsw.edu.au');
  });

  it('does not invent a user when the filter misses', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ users: [] }), { status: 200 }));
    expect(await findAuthUserByEmail('a@school.edu', fetchImpl as unknown as typeof fetch)).toEqual({ user: null });
  });
});
