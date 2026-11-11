import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuthedUser = vi.fn();
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: (...a: unknown[]) => getAuthedUser(...a) }));
const logError = vi.fn();
vi.mock('@/utils/logger', () => ({ default: { error: (...a: unknown[]) => logError(...a), warn: vi.fn(), info: vi.fn(), log: vi.fn() } }));

const db = {
  classroom: { data: { id: 'c1', teacher_id: 't1' }, error: null } as { data: unknown; error: unknown },
  writeError: null as unknown,
  plan: { data: null, error: null } as { data: unknown; error: unknown },
  planFilters: [] as Array<[string, string, unknown]>,
  upserts: [] as Array<{ values: Record<string, unknown>; opts: unknown }>,
  deletes: [] as Array<Array<[string, unknown]>>,
};

function client() {
  return {
    from: (table: string) => {
      if (table === 'classrooms') {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => db.classroom };
        return q;
      }
      if (table !== 'teacher_lesson_plans') throw new Error(`unexpected table ${table}`);
      return {
        select: () => {
          const q = {
            eq: (c: string, v: unknown) => (db.planFilters.push(['eq', c, v]), q),
            is: (c: string, v: unknown) => (db.planFilters.push(['is', c, v]), q),
            gt: (c: string, v: unknown) => (db.planFilters.push(['gt', c, v]), q),
            maybeSingle: async () => db.plan,
          };
          return q;
        },
        upsert: async (values: Record<string, unknown>, opts: unknown) => {
          db.upserts.push({ values, opts });
          return { error: db.writeError };
        },
        delete: () => {
          const filters: Array<[string, unknown]> = [];
          db.deletes.push(filters);
          const q = {
            eq: (col: string, val: unknown) => {
              filters.push([col, val]);
              return q;
            },
            then: (resolve: (v: unknown) => unknown) => resolve({ error: db.writeError }),
          };
          return q;
        },
      };
    },
  };
}
vi.mock('@/utils/supabase/server', () => ({ createClient: async () => client() }));

import { DELETE, GET, POST } from '../route';

const NOW = new Date('2026-11-11T19:00:00Z');
const CLASS = '11111111-1111-4111-8111-111111111111';
const TOMORROW = '2026-11-12T07:00:00.000Z';

const req = (method: string, body: unknown) =>
  new Request('http://x/api/education/lesson-plan', {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const post = (body: unknown) => POST(req('POST', body) as never);

describe('POST /api/education/lesson-plan', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    getAuthedUser.mockResolvedValue({ id: 't1' });
    db.classroom = { data: { id: CLASS, teacher_id: 't1' }, error: null };
    db.writeError = null;
    db.upserts = [];
    db.deletes = [];
    logError.mockClear();
  });

  it('Given no session, When posting, Then 401 and nothing is written', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await post({ classroomId: CLASS, lessonAt: TOMORROW })).status).toBe(401);
    expect(db.upserts).toHaveLength(0);
  });

  it('Given a malformed body, When posting, Then 400', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await post({ classroomId: 'x', lessonAt: TOMORROW })).status).toBe(400);
    expect((await post({ classroomId: CLASS, lessonAt: 'tomorrow' })).status).toBe(400);
  });

  it('Given an unknown class, When posting, Then 404', async () => {
    db.classroom = { data: null, error: null };
    expect((await post({ classroomId: CLASS, lessonAt: TOMORROW })).status).toBe(404);
    expect(db.upserts).toHaveLength(0);
  });

  it("Given another teacher's class, When posting, Then 403", async () => {
    db.classroom = { data: { id: CLASS, teacher_id: 'someone-else' }, error: null };
    expect((await post({ classroomId: CLASS, lessonAt: TOMORROW })).status).toBe(403);
    expect(db.upserts).toHaveLength(0);
  });

  it('Given the class lookup fails, When posting, Then 500, logged, not a 404', async () => {
    db.classroom = { data: null, error: { message: 'boom' } };
    expect((await post({ classroomId: CLASS, lessonAt: TOMORROW })).status).toBe(500);
    expect(logError).toHaveBeenCalled();
  });

  it('Given a lesson 10 minutes away, When posting, Then 400 too_soon', async () => {
    const res = await post({ classroomId: CLASS, lessonAt: new Date(NOW.getTime() + 10 * 60_000).toISOString() });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'too_soon' });
  });

  it('Given a lesson 90 days away, When posting, Then 400 too_far', async () => {
    const res = await post({ classroomId: CLASS, lessonAt: new Date(NOW.getTime() + 90 * 86_400_000).toISOString() });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'too_far' });
  });

  it('Given a valid plan, When posting, Then upserts on the class with reminded_at cleared and returns the time', async () => {
    const res = await post({ classroomId: CLASS, lessonAt: '2026-11-12T09:00:00+02:00', timezone: 'Asia/Jerusalem', locale: 'he' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lessonAt: TOMORROW });
    expect(db.upserts).toEqual([
      {
        values: { teacher_id: 't1', classroom_id: CLASS, lesson_at: TOMORROW, timezone: 'Asia/Jerusalem', locale: 'he', reminded_at: null },
        opts: { onConflict: 'classroom_id' },
      },
    ]);
  });

  it('Given an unknown locale and no timezone, When posting, Then stores nulls', async () => {
    await post({ classroomId: CLASS, lessonAt: TOMORROW, locale: 'xx' });
    expect(db.upserts[0].values).toMatchObject({ timezone: null, locale: null });
  });

  it('Given the write fails, When posting, Then 500 and logged, never ok', async () => {
    db.writeError = { message: 'rls' };
    const res = await post({ classroomId: CLASS, lessonAt: TOMORROW });
    expect(res.status).toBe(500);
    expect(await res.json()).not.toHaveProperty('ok', true);
    expect(logError).toHaveBeenCalled();
  });
});

describe('DELETE /api/education/lesson-plan', () => {
  beforeEach(() => {
    getAuthedUser.mockResolvedValue({ id: 't1' });
    db.writeError = null;
    db.deletes = [];
  });

  it('Given no session, When deleting, Then 401', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await DELETE(req('DELETE', { classroomId: CLASS }) as never)).status).toBe(401);
    expect(db.deletes).toHaveLength(0);
  });

  it("Given the teacher's class, When deleting, Then removes only their plan for it", async () => {
    const res = await DELETE(req('DELETE', { classroomId: CLASS }) as never);
    expect(res.status).toBe(200);
    expect(db.deletes[0]).toEqual(expect.arrayContaining([['classroom_id', CLASS], ['teacher_id', 't1']]));
  });

  it('Given the delete fails, When deleting, Then 500', async () => {
    db.writeError = { message: 'boom' };
    expect((await DELETE(req('DELETE', { classroomId: CLASS }) as never)).status).toBe(500);
  });
});

describe('GET /api/education/lesson-plan', () => {
  const get = (query: string) => GET(new Request(`http://x/api/education/lesson-plan?${query}`) as never);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    getAuthedUser.mockResolvedValue({ id: 't1' });
    db.classroom = { data: { id: CLASS, teacher_id: 't1' }, error: null };
    db.plan = { data: null, error: null };
    db.planFilters = [];
    logError.mockClear();
  });

  it('Given no session, When asked, Then 401', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect((await get(`classroomId=${CLASS}`)).status).toBe(401);
  });

  it('Given a bad class id, When asked, Then 400', async () => {
    expect((await get('classroomId=nope')).status).toBe(400);
  });

  it("Given another teacher's class, When asked, Then 403", async () => {
    db.classroom = { data: { id: CLASS, teacher_id: 'other' }, error: null };
    expect((await get(`classroomId=${CLASS}`)).status).toBe(403);
  });

  it('Given an unknown class, When asked, Then 404', async () => {
    db.classroom = { data: null, error: null };
    expect((await get(`classroomId=${CLASS}`)).status).toBe(404);
  });

  it('Given an upcoming plan not yet reminded, When asked, Then returns its time and only asked for future unreminded rows', async () => {
    db.plan = { data: { lesson_at: '2026-11-12T07:00:00+00:00' }, error: null };
    const res = await get(`classroomId=${CLASS}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lessonAt: TOMORROW });
    expect(db.planFilters).toEqual(
      expect.arrayContaining([
        ['eq', 'classroom_id', CLASS],
        ['is', 'reminded_at', null],
        ['gt', 'lesson_at', NOW.toISOString()],
      ]),
    );
  });

  it('Given no plan, When asked, Then lessonAt is null', async () => {
    expect(await (await get(`classroomId=${CLASS}`)).json()).toEqual({ ok: true, lessonAt: null });
  });

  it('Given the plan read fails, When asked, Then 500 and logged', async () => {
    db.plan = { data: null, error: { message: 'boom' } };
    expect((await get(`classroomId=${CLASS}`)).status).toBe(500);
    expect(logError).toHaveBeenCalled();
  });
});
