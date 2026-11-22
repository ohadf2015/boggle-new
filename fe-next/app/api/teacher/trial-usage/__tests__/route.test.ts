import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/education/pro/trialUsage', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/pro/trialUsage')>()),
  readTrialUsage: vi.fn(),
}));

import { GET } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { readTrialUsage } from '@/lib/education/pro/trialUsage';
import logger from '@/utils/logger';

const admin = { from: vi.fn() };
function signedIn(user: { id: string } | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
  } as never);
}
const since = new Date(Date.now() - 5 * 86_400_000).toISOString();
const req = (q: string) => new Request(`http://localhost/api/teacher/trial-usage${q}`);

describe('GET /api/teacher/trial-usage', () => {
  beforeEach(() => {
    vi.mocked(readTrialUsage).mockReset();
    vi.mocked(createAdminClient).mockReturnValue(admin as never);
  });

  it('Given no session, When requested, Then 401', async () => {
    signedIn(null);
    expect((await GET(req(`?since=${since}`))).status).toBe(401);
    expect(readTrialUsage).not.toHaveBeenCalled();
  });

  it('Given a bad since, When requested, Then 400', async () => {
    signedIn({ id: 't1' });
    expect((await GET(req('?since=nope'))).status).toBe(400);
  });

  it('Given a teacher, When requested, Then it reads only their own usage and returns the counts', async () => {
    signedIn({ id: 't1' });
    vi.mocked(readTrialUsage).mockResolvedValue({ games: 7, students: 42, practice: 90 });
    const res = await GET(req(`?since=${encodeURIComponent(since)}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, usage: { games: 7, students: 42, practice: 90 } });
    expect(vi.mocked(readTrialUsage).mock.calls[0][1]).toBe('t1');
    expect(res.headers.get('Cache-Control')).toContain('private');
  });

  it('Given a read failure, When requested, Then 500 and it is logged', async () => {
    signedIn({ id: 't1' });
    vi.mocked(readTrialUsage).mockRejectedValue(new Error('db down'));
    const res = await GET(req(`?since=${encodeURIComponent(since)}`));
    expect(res.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
