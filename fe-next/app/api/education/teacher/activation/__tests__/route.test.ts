import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
const updateEq = vi.fn();
const from = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: (...a: unknown[]) => from(...a),
  }),
}));

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (arg: (typeof captured)[number]) => captured.push(arg) }),
}));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => null }));

import { GET, PATCH } from '../route';

const patchReq = (body: unknown) =>
  new Request('http://local/api/education/teacher/activation', { method: 'PATCH', body: JSON.stringify(body) }) as never;

function profileChain(data: unknown, error: unknown = null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => maybeSingle.mockResolvedValue({ data, error })(),
      }),
    }),
    update: () => ({
      eq: (...a: unknown[]) => updateEq(...a),
    }),
  };
}

describe('GET/PATCH /api/education/teacher/activation', () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
    updateEq.mockReset();
    from.mockReset();
    updateEq.mockResolvedValue({ error: null });
    captured.length = 0;
  });

  it('Given a teacher copies the invite for the first time, When saved, Then one server copy event fires', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(profileChain({ teacher_activation_invite_copied_at: null }));
    await PATCH(patchReq({ inviteCopied: true }));
    const copies = captured.filter((c) => c.event === 'edu_join_code_copy_recorded');
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ distinctId: 'u1', properties: { is_test_account: false } });
  });

  it('Given the invite was already copied, or the write fails, When saved again, Then no copy event fires', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(profileChain({ teacher_activation_invite_copied_at: '2026-10-05T00:00:00Z' }));
    await PATCH(patchReq({ inviteCopied: true }));
    from.mockReturnValue(profileChain({ teacher_activation_invite_copied_at: null }));
    updateEq.mockResolvedValue({ error: { message: 'nope' } });
    await PATCH(patchReq({ inviteCopied: true }));
    expect(captured.filter((c) => c.event === 'edu_join_code_copy_recorded')).toHaveLength(0);
  });

  it('rejects anonymous readers', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns persisted flags for a signed-in teacher', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(
      profileChain({
        teacher_activation_invite_copied_at: '2026-10-05T00:00:00Z',
        teacher_activation_live_started_at: null,
        teacher_activation_checklist_dismissed_at: null,
      }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      inviteCopied: true,
      liveStarted: false,
      dismissed: false,
    });
  });

  it('refuses a patch that tries to turn a flag off', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const res = await PATCH(
      new Request('http://local/api/education/teacher/activation', {
        method: 'PATCH',
        body: JSON.stringify({ dismissed: false }),
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it('persists dismiss without clearing a prior copy', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(
      profileChain({
        teacher_activation_invite_copied_at: '2026-10-05T00:00:00Z',
        teacher_activation_live_started_at: null,
        teacher_activation_checklist_dismissed_at: null,
      }),
    );
    const res = await PATCH(
      new Request('http://local/api/education/teacher/activation', {
        method: 'PATCH',
        body: JSON.stringify({ dismissed: true }),
      }) as never,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      inviteCopied: true,
      dismissed: true,
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'u1');
  });

  it('keeps the first copy time when the teacher copies the link again', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(
      profileChain({
        teacher_activation_invite_copied_at: '2026-10-05T00:00:00Z',
        teacher_activation_live_started_at: null,
        teacher_activation_checklist_dismissed_at: null,
      }),
    );
    const res = await PATCH(
      new Request('http://local/api/education/teacher/activation', {
        method: 'PATCH',
        body: JSON.stringify({ inviteCopied: true }),
      }) as never,
    );
    expect(await res.json()).toMatchObject({ ok: true, inviteCopied: true });
    expect(updateEq).not.toHaveBeenCalled();
  });

  it('persists room-opened from the client', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(profileChain({ teacher_activation_room_opened_at: null }));
    const res = await PATCH(patchReq({ roomOpened: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, roomOpened: true });
    expect(updateEq).toHaveBeenCalledWith('id', 'u1');
  });

  it('refuses a client that tries to self-stamp live-started (server-authoritative)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(profileChain({ teacher_activation_live_started_at: null }));
    const res = await PATCH(patchReq({ liveStarted: true }));
    expect(res.status).toBe(400);
    expect(updateEq).not.toHaveBeenCalled();
  });
});
