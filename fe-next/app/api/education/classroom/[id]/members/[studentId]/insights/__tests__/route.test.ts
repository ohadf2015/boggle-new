import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
const trial = vi.hoisted(() => ({ live: false }));
vi.mock('@/lib/education/accessTrialServer', () => ({
  teacherHasProAccess: vi.fn(async (_u: string, s: { has_pro: boolean }) => s.has_pro || trial.live),
}));

import { GET } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { loadParentReportData } from '@/lib/education/parentReportData';
import { fakeSupabase, ok, fail, type TableResponder } from '@/lib/education/__tests__/fakeSupabase';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';

const PROGRESS = [
  {
    total_xp: 120,
    words_mastered: ['tree'],
    words_attempted: {
      tree: { correct: 3, attempts: 3, lastAttemptAt: '2026-10-19T00:00:00Z' },
      sun: { correct: 0, attempts: 4 },
    },
    completed_at: '2026-10-10T00:00:00Z',
    current_streak: 2,
    longest_streak: 4,
  },
];
const SESSIONS = [
  { completed_at: new Date(Date.now() - 86400000).toISOString(), words_attempted: 10, words_correct: 7, time_spent_seconds: 0, duration_seconds: 240 },
  { completed_at: new Date(Date.now() - 9 * 86400000).toISOString(), words_attempted: 10, words_correct: 3, time_spent_seconds: 0, duration_seconds: 120 },
];

function admin(overrides: Partial<Record<string, TableResponder>> = {}) {
  return fakeSupabase({
    classroom_memberships: ok({ id: 'm-1' }),
    public_profiles: ok({ display_name: 'Ana', username: null }),
    classrooms: ok({ name: '5B', teacher_id: 'teacher-1' }),
    student_lesson_progress: ok(PROGRESS),
    practice_sessions: ok(SESSIONS),
    ...overrides,
  });
}

function userClient(opts: { user?: { id: string } | null; owns?: boolean } = {}) {
  const { user = { id: 'teacher-1' }, owns = true } = opts;
  const { client } = fakeSupabase({ classrooms: ok(owns ? { id: CLASSROOM } : null) });
  return { ...client, auth: { getUser: async () => ({ data: { user }, error: null }) } };
}

const call = (id = CLASSROOM, studentId = STUDENT) =>
  GET(new Request('http://x'), { params: Promise.resolve({ id, studentId }) });

describe('GET /api/education/classroom/[id]/members/[studentId]/insights', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockResolvedValue(userClient() as never);
    vi.mocked(createAdminClient).mockReturnValue(admin().client as never);
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
    trial.live = false;
  });

  it('400 on bad ids', async () => {
    expect((await call('nope')).status).toBe(400);
  });

  it('401 when signed out', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: null }) as never);
    expect((await call()).status).toBe(401);
  });

  it('403 when the caller does not own the classroom', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ owns: false }) as never);
    expect((await call()).status).toBe(403);
  });

  it('403 when the student is not on the roster', async () => {
    vi.mocked(createAdminClient).mockReturnValue(admin({ classroom_memberships: ok(null) }).client as never);
    expect((await call()).status).toBe(403);
  });

  it('402 without Teacher Pro', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    expect((await call()).status).toBe(402);
  });

  it('200 for a teacher on a live access trial, same as paid Pro', async () => {
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    trial.live = true;
    expect((await call()).status).toBe(200);
  });

  it('500 (not an empty report) when a progress read fails', async () => {
    vi.mocked(createAdminClient).mockReturnValue(admin({ practice_sessions: fail('boom') }).client as never);
    expect((await call()).status).toBe(500);
  });

  it('PARITY: the teacher view gets exactly the insights the parent page renders for the same rows', async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    const parent = await loadParentReportData(admin().client, STUDENT, CLASSROOM);
    if (parent.status !== 'ok') throw new Error('expected ok');
    expect(body.insights).toEqual(parent.data.insights);
    expect(body.insights.wordsToPractice[0].word).toBe('sun');
    expect(body.insights.recentWins[0].word).toBe('tree');
  });
});
