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

import { GET, PATCH } from '../route';

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
});
