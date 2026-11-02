import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const captured = vi.hoisted(() => ({ events: [] as Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> }));
const state = vi.hoisted(() => ({ ended: null as null | { classroomId: string }, limited: false, user: null as null | { id: string }, flagged: false }));

vi.mock('@/backend/utils/educationTelemetry', () => ({
  captureEduServerEvents: (evs: typeof captured.events) => captured.events.push(...evs),
}));
vi.mock('@/backend/redis/rateLimit', () => ({
  RATE_LIMIT_KEYS: { api: (k: string) => `rl:api:${k}` },
  checkRateLimitRedis: vi.fn(async () => ({ limited: state.limited })),
}));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => state.user) }));
vi.mock('@/lib/education/eduTestAccount', () => ({ isAnyTestAccount: vi.fn(async () => state.flagged) }));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { teacher_id: 't1' } }) }) }) }),
  }),
}));
vi.mock('../../classroom/join/endedSessionCode', () => ({
  lookupEndedClassroomSession: vi.fn(async () => state.ended),
}));

import { POST } from '../route';

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/education/late-join-practice', { method: 'POST', body: JSON.stringify(body) }));

beforeEach(() => {
  captured.events.length = 0;
  state.ended = null;
  state.limited = false;
  state.user = null;
  state.flagged = false;
});

describe('POST /api/education/late-join-practice', () => {
  it('Given a guest on an ended class game, Then edu_late_join_practice_started carries the server-read classroom id and reason', async () => {
    state.ended = { classroomId: 'c1' };
    const res = await post({ gameCode: 'abc123', door: 'join_flow' });
    expect(res.status).toBe(204);
    expect(captured.events).toHaveLength(1);
    expect(captured.events[0]).toMatchObject({
      distinctId: 'anonymous-ABC123',
      event: 'edu_late_join_practice_started',
      properties: { game_code: 'ABC123', classroom_id: 'c1', reason: 'SESSION_ENDED', session_verified: true, door: 'join_flow', is_guest: true, is_test_account: false },
    });
  });

  it('Given a QA teacher class and a signed-in student, Then the event is tagged test traffic and keyed to the student', async () => {
    state.ended = { classroomId: 'c1' };
    state.user = { id: 'u1' };
    state.flagged = true;
    await post({ gameCode: 'ABC123' });
    expect(captured.events[0]).toMatchObject({ distinctId: 'u1', properties: { is_test_account: true, is_guest: false } });
  });

  it('Given the ended record already expired, Then the start still records with a null class and unverified flag', async () => {
    await post({ gameCode: 'ABC123' });
    expect(captured.events[0].properties).toMatchObject({ classroom_id: null, session_verified: false });
  });

  it('Given a malformed code or a rate-limited caller, Then nothing is recorded and the answer is still 204', async () => {
    expect((await post({ gameCode: 'nope' })).status).toBe(204);
    state.limited = true;
    expect((await post({ gameCode: 'ABC123' })).status).toBe(204);
    expect(captured.events).toHaveLength(0);
  });
});
