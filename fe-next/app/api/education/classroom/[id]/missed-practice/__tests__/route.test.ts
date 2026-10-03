import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createRequestClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));
vi.mock('@/lib/supabase/wordMastery', () => ({ getClassMastery: vi.fn() }));

import { POST } from '../route';
import { createRequestClient } from '@/utils/supabase/server';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { getClassMastery } from '@/lib/supabase/wordMastery';
import { buildClassMastery } from '@/lib/education/wordMasteryTrend';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const TODAY = new Date().toISOString().slice(0, 10);

interface Opts {
  user?: { id: string } | null;
  owns?: boolean;
  duplicate?: boolean;
  lessonInsertError?: boolean;
}

function db(opts: Opts = {}) {
  const inserted = { lessons: [] as Record<string, unknown>[], assignments: [] as Record<string, unknown>[] };
  const deleted: string[][] = [];
  let lessonSeq = 0;
  const client = {
    auth: { getUser: vi.fn(async () => ({ data: { user: opts.user === undefined ? { id: 't' } : opts.user }, error: null })) },
    from: vi.fn((table: string) => {
      if (table === 'classrooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: opts.owns === false ? null : { id: CLASSROOM, name: '7A', language: 'en' },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'vocabulary_lessons') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  limit: async () => ({ data: opts.duplicate ? [{ id: 'old' }] : [], error: null }),
                }),
              }),
              limit: async () => ({
                data: [{ words: [{ word: 'bridge', definition: 'over water', canIntegrate: true }] }],
                error: null,
              }),
            }),
          }),
          insert: (rowIn: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                if (opts.lessonInsertError && lessonSeq === 1) return { data: null, error: { message: 'nope' } };
                inserted.lessons.push(rowIn);
                lessonSeq += 1;
                return { data: { id: `L${lessonSeq}` }, error: null };
              },
            }),
          }),
          delete: () => ({
            in: async (_col: string, ids: string[]) => {
              deleted.push(ids);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'lesson_assignments') {
        return {
          insert: async (rowIn: Record<string, unknown>) => {
            inserted.assignments.push(rowIn);
            return { error: null };
          },
        };
      }
      return {};
    }),
  };
  return { client, inserted, deleted };
}

const MASTERY = buildClassMastery([
  { studentId: 's1', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: ['bridge', 'castle', 'apple'], lessonWordsFound: ['apple'] } },
  { studentId: 's2', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: ['bridge', 'castle', 'apple'], lessonWordsFound: ['apple'] } },
]);

const NAMES = ['Review 1/3', 'Review 2/3', 'Review 3/3'];
const req = (body: unknown) =>
  new Request(`http://t/api/education/classroom/${CLASSROOM}/missed-practice`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
const ctx = { params: Promise.resolve({ id: CLASSROOM }) };
const pro = (has_pro: boolean) => ({ has_pro }) as never;

describe('POST /api/education/classroom/[id]/missed-practice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClassMastery).mockResolvedValue({ data: MASTERY, error: null });
    vi.mocked(checkTeacherSubscription).mockResolvedValue(pro(true));
  });

  it('401s a signed-out caller', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: db({ user: null }).client, token: null } as never);
    expect((await POST(req({ today: TODAY, names: NAMES }), ctx)).status).toBe(401);
  });

  it('403s a teacher who does not own the classroom', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: db({ owns: false }).client, token: null } as never);
    expect((await POST(req({ today: TODAY, names: NAMES }), ctx)).status).toBe(403);
  });

  it('402s a free teacher and writes nothing', async () => {
    const d = db();
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: d.client, token: null } as never);
    vi.mocked(checkTeacherSubscription).mockResolvedValue(pro(false));
    expect((await POST(req({ today: TODAY, names: NAMES }), ctx)).status).toBe(402);
    expect(d.inserted.lessons).toHaveLength(0);
  });

  it('400s a body without three round names or with an implausible day', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: db().client, token: null } as never);
    expect((await POST(req({ today: TODAY, names: ['x'] }), ctx)).status).toBe(400);
    expect((await POST(req({ today: '1999-01-01', names: NAMES }), ctx)).status).toBe(400);
  });

  it('assigns three spaced rounds (+1/+3/+7 days) of exactly the missed words', async () => {
    const d = db();
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: d.client, token: null } as never);
    const res = await POST(req({ today: TODAY, names: NAMES }), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.words).toEqual(['bridge', 'castle']);
    expect(body.rounds).toHaveLength(3);
    expect(d.inserted.lessons.map((l) => l.name)).toEqual(NAMES);
    expect(d.inserted.lessons[0]).toMatchObject({ teacher_id: 't', classroom_id: CLASSROOM, language: 'en', is_public: false });
    expect((d.inserted.lessons[0].words as { word: string; definition?: string }[])[0]).toMatchObject({
      word: 'bridge',
      definition: 'over water',
    });
    const dues = d.inserted.assignments.map((a) => a.due_date as string);
    const day = (n: number) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
    expect(dues).toEqual([day(1), day(3), day(7)]);
    expect(d.inserted.assignments.every((a) => a.classroom_id === CLASSROOM)).toBe(true);
  });

  it('assigns a requested missed word even when it ranks below the class top ten, but never a word nobody missed', async () => {
    const asked = Array.from({ length: 12 }, (_, i) => `word${i}`);
    vi.mocked(getClassMastery).mockResolvedValue({
      data: buildClassMastery([
        { studentId: 's1', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G1', lessonWordsAsked: [...asked, 'apple'], lessonWordsFound: ['apple'] } },
        { studentId: 's2', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G1', lessonWordsAsked: asked.slice(0, 11), lessonWordsFound: [] } },
        { studentId: 's1', startedAt: '2026-09-02T10:00:00Z', results: { gameCode: 'G2', lessonWordsAsked: ['zebra'], lessonWordsFound: [] } },
      ]),
      error: null,
    });
    const d = db();
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: d.client, token: null } as never);
    const res = await POST(req({ today: TODAY, names: NAMES, words: ['zebra', 'apple'] }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).words).toEqual(['zebra']);
  });

  it('422s when the class has no missed words to practise', async () => {
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: db().client, token: null } as never);
    vi.mocked(getClassMastery).mockResolvedValue({ data: buildClassMastery([]), error: null });
    expect((await POST(req({ today: TODAY, names: NAMES }), ctx)).status).toBe(422);
  });

  it('409s a double submit instead of assigning the set twice', async () => {
    const d = db({ duplicate: true });
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: d.client, token: null } as never);
    expect((await POST(req({ today: TODAY, names: NAMES }), ctx)).status).toBe(409);
    expect(d.inserted.lessons).toHaveLength(0);
  });

  it('rolls back the rounds it created when a later round fails', async () => {
    const d = db({ lessonInsertError: true });
    vi.mocked(createRequestClient).mockResolvedValue({ supabase: d.client, token: null } as never);
    expect((await POST(req({ today: TODAY, names: NAMES }), ctx)).status).toBe(500);
    expect(d.deleted).toEqual([['L1']]);
  });
});
