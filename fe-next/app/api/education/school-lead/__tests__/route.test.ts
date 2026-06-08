import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  insertSpy: vi.fn(async () => ({ data: { id: 'lead-1' }, error: null })),
  sendEmailSpy: vi.fn(async () => ({ ok: true })),
  recentCount: 0,
}));
const { insertSpy, sendEmailSpy } = h;

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    // Rate-limit count goes through a SECURITY DEFINER rpc (RLS-safe), not a SELECT.
    rpc: vi.fn(async (_fn: string, _args: unknown) => ({ data: h.recentCount, error: null })),
    from: () => ({
      insert: h.insertSpy,
    }),
  }),
}));

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));

import { POST } from '../route';

const mkReq = (body: any): Request =>
  new Request('http://test/api/education/school-lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const valid = {
  email: 'principal@lincoln-high.edu',
  full_name: 'Dana Levi',
  role: 'school_admin',
  school_or_district: 'Lincoln High School',
  student_count: '500_2000',
  interests: ['district_admin_dashboard', 'pricing_info'],
  country: 'US',
  message: 'We have 6 ESL teachers who already use it.',
  locale: 'en',
};

describe('POST /api/education/school-lead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.recentCount = 0;
  });

  it('200 + inserts a qualified lead row', async () => {
    const res = await POST(mkReq(valid));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const row = insertSpy.mock.calls[0][0];
    expect(row.email).toBe(valid.email);
    expect(row.student_count).toBe('500_2000');
    expect(row.source).toBe('for-schools-page');
  });

  it('notifies the admin by email', async () => {
    await POST(mkReq(valid));
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('400 if school_or_district missing', async () => {
    const { school_or_district, ...bad } = valid;
    expect((await POST(mkReq(bad))).status).toBe(400);
  });

  it('400 if student_count bucket invalid', async () => {
    expect((await POST(mkReq({ ...valid, student_count: 'tons' }))).status).toBe(400);
  });

  it('400 if email malformed', async () => {
    expect((await POST(mkReq({ ...valid, email: 'x' }))).status).toBe(400);
  });

  it('429 when rate-limited (>=3 in 24h)', async () => {
    h.recentCount = 3;
    expect((await POST(mkReq(valid))).status).toBe(429);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
