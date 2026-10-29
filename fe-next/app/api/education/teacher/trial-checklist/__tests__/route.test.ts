import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const maybeSingle = vi.fn();
const updateEq = vi.fn();
const updateFn = vi.fn();
const from = vi.fn();

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: (...a: unknown[]) => getUser(...a) },
    from: (...a: unknown[]) => from(...a),
  }),
}));

import { GET, PATCH } from '../route';

const patchReq = (body: unknown) =>
  new Request('http://local/api/education/teacher/trial-checklist', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as never;

function profileChain(data: unknown, error: unknown = null) {
  return {
    select: () => ({
      eq: () => ({
        maybeSingle: () => maybeSingle.mockResolvedValue({ data, error })(),
      }),
    }),
    update: (payload: unknown) => {
      updateFn(payload);
      return {
        eq: (...a: unknown[]) => updateEq(...a),
      };
    },
  };
}

describe('GET/PATCH /api/education/teacher/trial-checklist', () => {
  beforeEach(() => {
    getUser.mockReset();
    maybeSingle.mockReset();
    updateEq.mockReset();
    updateFn.mockReset();
    from.mockReset();
    updateEq.mockResolvedValue({ error: null });
  });

  it('returns 401 when unauthorized on GET and PATCH', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const getRes = await GET();
    expect(getRes.status).toBe(401);

    const patchRes = await PATCH(patchReq({ dismissed: true }));
    expect(patchRes.status).toBe(401);
  });

  it('returns 200 with empty progress and unavailable: true when select errors (never 500)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(profileChain(null, { message: 'column does not exist' }));

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      dismissed: false,
      completed: false,
      unavailable: true,
    });
  });

  it('persists PATCH { dismissed: true } without touching completed', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(
      profileChain({
        teacher_trial_checklist_dismissed_at: null,
        teacher_trial_checklist_completed_at: null,
      }),
    );

    const res = await PATCH(patchReq({ dismissed: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      dismissed: true,
      completed: false,
    });
    expect(updateEq).toHaveBeenCalledWith('id', 'u1');
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        teacher_trial_checklist_dismissed_at: expect.any(String),
      }),
    );
  });

  it('rejects PATCH with false values (flags only turn on)', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const resDismissFalse = await PATCH(patchReq({ dismissed: false }));
    expect(resDismissFalse.status).toBe(400);

    const resCompletedFalse = await PATCH(patchReq({ completed: false }));
    expect(resCompletedFalse.status).toBe(400);
    expect(updateEq).not.toHaveBeenCalled();
  });

  it('stamps teacher_trial_checklist_completed_at once and does not overwrite when already set', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    from.mockReturnValue(
      profileChain({
        teacher_trial_checklist_dismissed_at: null,
        teacher_trial_checklist_completed_at: null,
      }),
    );

    const first = await PATCH(patchReq({ completed: true }));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      ok: true,
      dismissed: false,
      completed: true,
    });
    expect(updateEq).toHaveBeenCalledTimes(1);

    updateEq.mockClear();
    updateFn.mockClear();
    from.mockReturnValue(
      profileChain({
        teacher_trial_checklist_dismissed_at: null,
        teacher_trial_checklist_completed_at: '2026-10-27T18:00:00Z',
      }),
    );

    const second = await PATCH(patchReq({ completed: true }));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      ok: true,
      dismissed: false,
      completed: true,
    });
    expect(updateEq).not.toHaveBeenCalled();
  });
});
