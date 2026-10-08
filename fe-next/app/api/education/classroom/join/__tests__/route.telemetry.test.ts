import { describe, it, expect, vi, beforeEach } from 'vitest';

const captured: Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> = [];

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({
    capture: (arg: { distinctId: string; event: string; properties: Record<string, unknown> }) => {
      captured.push(arg);
    },
  }),
}));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/getAuthedUser', () => ({
  getAuthedUser: vi.fn(async () => ({ id: 'student-1' })),
}));
vi.mock('@/lib/subscriptions', () => ({
  canAddStudent: vi.fn(async () => ({ allowed: true, currentCount: 0, limit: 50 })),
}));
vi.mock('@/lib/education/classroomGameLookup', () => ({
  lookupLiveClassroomGame: vi.fn(async () => null),
}));
vi.mock('@/lib/education/liveGameForClassroom', () => ({
  lookupLiveGameForClassroom: vi.fn(async () => null),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';

const post = (joinCode: string) =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  }) as never;

/** `alreadyMember` decides whether the membership lookup finds an existing row. */
const mockDb = (alreadyMember: boolean) => {
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    rpc: vi.fn(async () => ({ data: [{ id: 'c1', name: 'ELA', language: 'en' }], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: alreadyMember ? { id: 'm1' } : null, error: null })),
          })),
          maybeSingle: vi.fn(async () => ({ data: { id: 'c1', name: 'ELA' }, error: null })),
        })),
      })),
      insert: vi.fn(async () => ({ error: null })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  });
};

const joined = () => captured.filter((c) => c.event === 'edu_student_joined');

describe('POST /api/education/classroom/join — edu_student_joined', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    captured.length = 0;
  });

  it('Given a new member, When joined, Then exactly one event fires for that student', async () => {
    mockDb(false);

    const res = await POST(post('ABC123'));

    expect(res.status).toBe(200);
    expect(joined()).toHaveLength(1);
    expect(joined()[0].distinctId).toBe('student-1');
    expect(joined()[0].properties).toMatchObject({ classroom_id: 'c1', is_test_account: false });
  });

  it('Given an existing member re-joins, When joined, Then no new join event fires', async () => {
    mockDb(true);

    const res = await POST(post('ABC123'));

    expect(res.status).toBe(200);
    expect(joined()).toHaveLength(0);
  });
});
