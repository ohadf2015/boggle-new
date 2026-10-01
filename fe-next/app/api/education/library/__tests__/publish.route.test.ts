import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({ json: async () => data, status: init?.status ?? 200 }),
  },
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const state: {
  user: { id: string } | null;
  profile: Record<string, unknown> | null;
  lesson: Record<string, unknown> | null;
  updates: Record<string, unknown>[];
} = { user: null, profile: null, lesson: null, updates: [] };

function table(name: string) {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.single = async () => ({ data: name === 'profiles' ? state.profile : state.lesson, error: null });
  b.update = (patch: Record<string, unknown>) => {
    state.updates.push(patch);
    const chain = { eq: () => chain, then: (ok: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(ok) };
    return chain;
  };
  return b;
}

vi.mock('@/utils/supabase/server', () => ({
  createRequestClient: async () => ({
    token: 'tok',
    supabase: {
      auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
      from: (name: string) => table(name),
    },
  }),
}));

import { POST } from '../publish/route';

const LESSON_ID = '11111111-1111-4111-8111-111111111111';
const req = (body: unknown) => ({ json: async () => body }) as unknown as Request;

describe('POST /api/education/library/publish', () => {
  beforeEach(() => {
    state.user = { id: 'teacher-1' };
    state.profile = { user_role: 'teacher', display_name: 'Ms Fisher' };
    state.lesson = { id: LESSON_ID, teacher_id: 'teacher-1', name: 'Fruits', description: null, words: [{ word: 'apple' }] };
    state.updates = [];
  });

  it('rejects a signed-out caller', async () => {
    state.user = null;
    expect((await POST(req({ lessonId: LESSON_ID, isPublic: true }))).status).toBe(401);
  });

  it('only lets teachers publish', async () => {
    state.profile = { user_role: 'student' };
    expect((await POST(req({ lessonId: LESSON_ID, isPublic: true }))).status).toBe(403);
    expect(state.updates).toEqual([]);
  });

  it("refuses someone else's list", async () => {
    state.lesson = { ...state.lesson!, teacher_id: 'other' };
    expect((await POST(req({ lessonId: LESSON_ID, isPublic: true }))).status).toBe(404);
  });

  it('blocks a list that fails moderation and never updates it', async () => {
    state.lesson = { ...state.lesson!, words: [{ word: 'apple' }, { word: 'puta' }] };
    const res = await POST(req({ lessonId: LESSON_ID, isPublic: true }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'MODERATION', issues: ['words'] });
    expect(state.updates).toEqual([]);
  });

  it('publishes a clean list with the author name snapshot', async () => {
    const res = await POST(req({ lessonId: LESSON_ID, isPublic: true }));
    expect(res.status).toBe(200);
    expect(state.updates[0]).toMatchObject({ is_public: true, author_name: 'Ms Fisher' });
  });

  it('unshares without moderation', async () => {
    state.lesson = { ...state.lesson!, words: [{ word: 'puta' }] };
    const res = await POST(req({ lessonId: LESSON_ID, isPublic: false }));
    expect(res.status).toBe(200);
    expect(state.updates[0]).toEqual({ is_public: false });
  });
});
