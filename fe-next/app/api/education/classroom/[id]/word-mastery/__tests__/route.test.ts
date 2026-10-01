import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createRequestClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/supabase/wordMastery', () => ({ getClassMastery: vi.fn() }));

import { GET } from '../route';
import { createRequestClient } from '@/utils/supabase/server';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import { buildClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';

function userClient(opts: { user: { id: string } | null; owns: boolean }) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: opts.user }, error: null })) },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.owns ? { id: CLASSROOM } : null, error: null }),
          }),
        }),
      }),
    })),
  };
}

const row = (s: string, asked: string[], found: string[]): MasterySessionRow => ({
  studentId: s,
  startedAt: '2026-09-01T10:00:00Z',
  results: { gameCode: 'G1', lessonWordsAsked: asked, lessonWordsFound: found },
});
const WORDS = ['a1', 'a2', 'a3', 'a4', 'a5'];
const MASTERY = buildClassMastery([row('s1', WORDS, []), row('s2', WORDS, ['a1'])]);

const ctx = (id = CLASSROOM) => ({ params: Promise.resolve({ id }) });
const req = () => new Request(`http://t/api/education/classroom/${CLASSROOM}/word-mastery`);
const pro = (has_pro: boolean) => ({ has_pro }) as never;

describe('GET /api/education/classroom/[id]/word-mastery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClassMastery).mockResolvedValue({ data: MASTERY, error: null });
  });

  it('401s a signed-out caller', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: userClient({ user: null, owns: false }), token: null } as never);
    expect((await GET(req(), ctx())).status).toBe(401);
  });

  it('400s a malformed classroom id', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: userClient({ user: { id: 't' }, owns: true }), token: null } as never);
    expect((await GET(req(), ctx('nope'))).status).toBe(400);
  });

  it('403s a teacher who does not own the classroom, before reading any evidence', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: userClient({ user: { id: 't' }, owns: false }), token: null } as never);
    expect((await GET(req(), ctx())).status).toBe(403);
    expect(getClassMastery).not.toHaveBeenCalled();
  });

  it('402s a free teacher with a real but limited preview — never the per-student grid', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: userClient({ user: { id: 't' }, owns: true }), token: null } as never);
    vi.mocked(checkTeacherSubscription).mockResolvedValue(pro(false));
    const res = await GET(req(), ctx());
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.locked).toBe(true);
    expect(body.preview.hardestWords).toHaveLength(3);
    expect(body.preview.hiddenWords).toBe(2);
    expect(body.report).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('s1');
  });

  it('gives a Pro teacher the full report', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: userClient({ user: { id: 't' }, owns: true }), token: null } as never);
    vi.mocked(checkTeacherSubscription).mockResolvedValue(pro(true));
    const body = await (await GET(req(), ctx())).json();
    expect(body.locked).toBe(false);
    expect(body.report.hardestWords).toHaveLength(5);
    expect(body.report.heatmap.cells.s1.a1).toEqual({ attempts: 1, correct: 0 });
  });

  it('500s, loudly, when the evidence read fails', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: userClient({ user: { id: 't' }, owns: true }), token: null } as never);
    vi.mocked(checkTeacherSubscription).mockResolvedValue(pro(true));
    vi.mocked(getClassMastery).mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect((await GET(req(), ctx())).status).toBe(500);
  });
});
