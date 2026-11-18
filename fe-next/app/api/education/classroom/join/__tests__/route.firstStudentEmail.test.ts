import { describe, it, expect, vi, beforeEach } from 'vitest';

const notify = vi.fn(async (..._a: unknown[]) => 'sent');
vi.mock('@/lib/education/firstStudentEmail', () => ({ notifyFirstStudent: (...a: unknown[]) => notify(...a) }));
vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => ({ capture: vi.fn() }) }));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }) }));
vi.mock('@/lib/auth/getAuthedUser', () => ({ getAuthedUser: vi.fn(async () => ({ id: 'student-1' })) }));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 50 })) }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame: vi.fn(async () => null) }));
const liveLookup = vi.fn(async (..._a: unknown[]): Promise<string | null> => null);
vi.mock('@/lib/education/liveGameForClassroom', () => ({ lookupLiveGameForClassroom: (...a: unknown[]) => liveLookup(...a) }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const post = (body: Record<string, unknown> = {}) =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode: 'ABC123', ...body }),
  }) as never;

const mockDb = (alreadyMember: boolean) => {
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    rpc: vi.fn(async () => ({ data: [{ id: 'c1', name: 'ELA', teacher_id: 't1' }], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: alreadyMember ? { id: 'm1' } : null, error: null })) })),
        })),
      })),
    })),
  });
};

describe('POST /api/education/classroom/join, first student email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveLookup.mockResolvedValue(null);
  });

  it('Given a new student joins, When the join succeeds, Then the first-student email is attempted for that class and student', async () => {
    mockDb(false);

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][1]).toEqual({ classroomId: 'c1', studentId: 'student-1', isRehearsal: false, liveGameCode: null });
  });

  it('Given the class has a live game, When a student joins, Then the live game code is handed to the notifier', async () => {
    mockDb(false);
    liveLookup.mockResolvedValue('LIVE42');

    await POST(post());

    expect(notify.mock.calls[0][1]).toMatchObject({ liveGameCode: 'LIVE42' });
  });

  it('Given a student who is already a member, When they re-join, Then no email is attempted', async () => {
    mockDb(true);

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(notify).not.toHaveBeenCalled();
  });

  it('Given the notifier rejects, When a student joins, Then the join still succeeds', async () => {
    mockDb(false);
    notify.mockRejectedValueOnce(new Error('boom'));

    const res = await POST(post());

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ message: 'Successfully joined classroom' });
  });
});
