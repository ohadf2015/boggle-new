// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { pushGrades } from '../googleClassroomPush';

const CLASSROOM = 'class-1';
const LESSON = 'lesson-1';

function table(rows: Array<Record<string, unknown>>, fail = false) {
  const filters: Array<(r: Record<string, unknown>) => boolean> = [];
  const res = () => (fail ? { data: null, error: { message: 'down' } } : { data: rows.filter((r) => filters.every((f) => f(r))), error: null });
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.or = vi.fn(() => q);
  q.eq = vi.fn((k: string, v: unknown) => (filters.push((r) => r[k] === v), q));
  q.in = vi.fn((k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), q));
  q.maybeSingle = vi.fn(async () => ({ data: (res().data ?? [])[0] ?? null, error: null }));
  q.then = (resolve: (v: unknown) => void) => resolve(res());
  return q;
}

function fakeAdmin(opts: { linksFail?: boolean } = {}) {
  const tables: Record<string, Array<Record<string, unknown>>> = {
    lesson_assignments: [{ id: 'a-1', lesson_id: LESSON, classroom_id: CLASSROOM }],
    classroom_memberships: [{ classroom_id: CLASSROOM, student_id: 'guest' }],
    student_lesson_progress: [{ student_id: 'guest', lesson_id: LESSON, completed_at: '2026-10-01', words_attempted: null }],
    profiles: [{ id: 'guest', display_name: 'Fox' }],
    external_identities: [{ user_id: 'guest', provider: 'google', external_id: 'g-1', email_hash: null }],
  };
  return {
    from: vi.fn((name: string) => table(tables[name] ?? [], name === 'external_identities' && opts.linksFail)),
    auth: { admin: { getUserById: vi.fn(async () => ({ data: { user: { email: null, is_anonymous: true } }, error: null })) } },
  } as never;
}

const patches: string[] = [];
const classroomApi = vi.fn(async (url: string, init?: RequestInit) => {
  const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
  if (init?.method === 'PATCH') {
    patches.push(url);
    return ok({});
  }
  if (url.includes('/studentSubmissions')) return ok({ studentSubmissions: [{ id: 'sub-1', userId: 'g-1', state: 'CREATED' }] });
  if (url.includes('/students')) return ok({ students: [{ userId: 'g-1', profile: { emailAddress: 'fox@school.org' } }] });
  if (url.includes('/courseWork/')) return ok({ id: 'cw', title: 'T', maxPoints: 10, associatedWithDeveloper: true });
  return new Response('{}', { status: 404 });
});

const input = (admin: never) => ({
  admin,
  token: 'ya29.t',
  classroomId: CLASSROOM,
  lessonOrAssignmentId: LESSON,
  courseId: 'c',
  courseWorkId: 'cw',
  returnGrades: false,
});

beforeEach(() => {
  patches.length = 0;
  vi.stubGlobal('fetch', classroomApi);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('pushGrades with linked identities', () => {
  it('grades a linked guest (no email) when identity linking is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const res = await pushGrades(input(fakeAdmin()));
    expect(res.updated).toBe(1);
    expect(res.unmatched).toEqual([]);
    expect(patches).toHaveLength(1);
  });

  it('keeps email-only matching while linking is off', async () => {
    const res = await pushGrades(input(fakeAdmin()));
    expect(res.updated).toBe(0);
    expect(res.unmatched).toEqual([{ studentId: 'guest', name: 'Fox', reason: 'no_email' }]);
  });

  it('falls back to email matching when the link table is unreadable', async () => {
    vi.stubEnv('NEXT_PUBLIC_EXTERNAL_IDENTITY_LINKING_ENABLED', 'true');
    const res = await pushGrades(input(fakeAdmin({ linksFail: true })));
    expect(res.unmatched).toEqual([{ studentId: 'guest', name: 'Fox', reason: 'no_email' }]);
  });
});
