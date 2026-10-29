import { describe, it, expect, vi, beforeEach } from 'vitest';

const { lookupLiveClassroomGame } = vi.hoisted(() => ({ lookupLiveClassroomGame: vi.fn() }));

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
}));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: async () => ({ allowed: true, currentCount: 0, limit: 50 }) }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { POST } from '../route';

const req = () =>
  new Request('http://t/api/education/guest-name', {
    method: 'POST',
    body: JSON.stringify({ name: 'Dana', joinCode: 'TZCOQ7' }),
  });

beforeEach(() => vi.clearAllMocks());

describe('POST /api/education/guest-name — locked live game', () => {
  it('answers 423 ROOM_LOCKED for a locked lobby, before any account exists', async () => {
    lookupLiveClassroomGame.mockResolvedValue({ classroomId: 'c-1', status: 'waiting', settings: { lobbyLocked: true } });

    const res = await POST(req());

    expect(res.status).toBe(423);
    expect(await res.json()).toMatchObject({ code: 'ROOM_LOCKED' });
  });

  it('does not refuse once the round is running', async () => {
    lookupLiveClassroomGame.mockResolvedValue({ classroomId: 'c-1', status: 'playing', settings: { lobbyLocked: true } });

    expect((await POST(req())).status).not.toBe(423);
  });
});
