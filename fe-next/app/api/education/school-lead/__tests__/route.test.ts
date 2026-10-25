import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  insertSpy: vi.fn(async () => ({ data: { id: 'lead-1' }, error: null })),
  sendEmailSpy: vi.fn(async () => ({ ok: true })),
  rateLimited: false as boolean,
  rpcError: null as null | { message: string },
}));
const { insertSpy, sendEmailSpy } = h;

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    rpc: vi.fn(async () => {
      throw new Error('anon has no EXECUTE on school_lead_rate_limited; the limiter must use the service role');
    }),
    from: () => ({
      insert: h.insertSpy,
    }),
  }),
}));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: vi.fn(async (_fn: string, _args: unknown) => ({ data: h.rpcError ? null : h.rateLimited, error: h.rpcError })),
  }),
}));

vi.mock('@/lib/email/send', () => ({ sendEmail: h.sendEmailSpy }));

import { POST } from '../route';
import { SCHOOL_LEAD_NOTIFY_TO } from '@/lib/education/schoolLeadNotify';

let ipSeq = 0;
const mkReq = (body: any, ip = `198.18.0.${++ipSeq}`): Request =>
  new Request('http://test/api/education/school-lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
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
    h.rateLimited = false;
    h.rpcError = null;
    h.sendEmailSpy.mockResolvedValue({ ok: true });
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

  it('persists classroom-plan source for a historical lead source (not a checkout)', async () => {
    const res = await POST(mkReq({ ...valid, source: 'classroom-plan' }));
    expect(res.status).toBe(200);
    expect(insertSpy.mock.calls[0][0].source).toBe('classroom-plan');
  });

  it('notifies ohadf2015@gmail.com with name/school/role/locale and reply-to the lead', async () => {
    await POST(mkReq(valid));
    expect(sendEmailSpy).toHaveBeenCalledTimes(1);
    const args = sendEmailSpy.mock.calls[0][0];
    expect(args.to).toBe(SCHOOL_LEAD_NOTIFY_TO);
    expect(args.to).toBe('ohadf2015@gmail.com');
    expect(args.replyTo).toBe(valid.email);
    expect(args.subject).toMatch(/Lincoln High School/);
    expect(args.html).toContain('Dana Levi');
    expect(args.html).toContain(valid.email);
    expect(args.html).toContain('school_admin');
    expect(args.html).toContain('en');
    expect(args.html).toMatch(/Timestamp:/);
  });

  it('still 200 when Resend returns { ok:false } — row is source of truth', async () => {
    h.sendEmailSpy.mockResolvedValueOnce({ ok: false, error: 'resend down' });
    const res = await POST(mkReq(valid));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
  });

  it('still 200 when sendEmail throws — mail failure never 500s the form', async () => {
    h.sendEmailSpy.mockRejectedValueOnce(new Error('network'));
    const res = await POST(mkReq(valid));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(insertSpy).toHaveBeenCalledTimes(1);
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
    h.rateLimited = true;
    expect((await POST(mkReq(valid))).status).toBe(429);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('fails closed when the per-email limiter cannot answer', async () => {
    h.rpcError = { message: 'rpc boom' };
    const res = await POST(mkReq(valid));
    expect(res.status).toBe(503);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('limits one IP rotating emails', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await POST(mkReq({ ...valid, email: `p${i}@school${i}.edu` }, '198.19.0.1'))).status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('does not echo database errors to the caller', async () => {
    insertSpy.mockResolvedValueOnce({ data: null, error: { message: 'duplicate key value violates unique constraint "school_leads_pkey"' } } as never);
    const res = await POST(mkReq(valid));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/school_leads|constraint/);
  });
});
