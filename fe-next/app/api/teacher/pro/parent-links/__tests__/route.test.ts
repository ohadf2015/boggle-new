import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/subscriptions', () => ({ checkTeacherSubscription: vi.fn() }));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkTeacherSubscription } from '@/lib/subscriptions';
import { verifyParentReportToken } from '@/lib/education/parentReportToken';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const S1 = '22222222-2222-4222-8222-222222222222';
const S2 = '33333333-3333-4333-8333-333333333333';

function userClient(opts: { user: { id: string } | null; owned: { id: string; name: string } | null }) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: opts.user }, error: null })) },
    from: vi.fn(() => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.owned, error: null }) }) }) }),
    })),
  };
}

function adminClient(opts: { members: string[]; profiles: Array<{ id: string; display_name: string | null; username: string | null }> }) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'classroom_memberships') {
        return {
          select: () => ({
            eq: () => ({ order: async () => ({ data: opts.members.map((student_id) => ({ student_id })), error: null }) }),
          }),
        };
      }
      return { select: () => ({ in: async () => ({ data: opts.profiles, error: null }) }) };
    }),
  };
}

function req(body: unknown) {
  return new Request('http://localhost/api/teacher/pro/parent-links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/teacher/pro/parent-links', () => {
  const OLD = process.env.PARENT_REPORT_SECRET;
  beforeEach(() => {
    process.env.PARENT_REPORT_SECRET = 'test-secret-that-is-long-enough-1234567890';
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: true } as never);
  });
  afterEach(() => {
    process.env.PARENT_REPORT_SECRET = OLD;
    vi.clearAllMocks();
  });

  it('400s on a bad classroom id', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: { id: 't' }, owned: null }) as never);
    const res = await POST(req({ classroomId: 'nope' }));
    expect(res.status).toBe(400);
  });

  it('401s when signed out', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: null, owned: null }) as never);
    const res = await POST(req({ classroomId: CLASSROOM }));
    expect(res.status).toBe(401);
  });

  it('403s for a classroom the caller does not own', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: { id: 't' }, owned: null }) as never);
    const res = await POST(req({ classroomId: CLASSROOM }));
    expect(res.status).toBe(403);
  });

  it('402s for a free teacher, before minting anything', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: { id: 't' }, owned: { id: CLASSROOM, name: '4B' } }) as never);
    vi.mocked(createAdminClient).mockReturnValue(adminClient({ members: [S1], profiles: [] }) as never);
    vi.mocked(checkTeacherSubscription).mockResolvedValue({ has_pro: false } as never);
    const res = await POST(req({ classroomId: CLASSROOM }));
    expect(res.status).toBe(402);
  });

  it('mints one verifiable link per student, named from display_name then username', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: { id: 't' }, owned: { id: CLASSROOM, name: '4B' } }) as never);
    vi.mocked(createAdminClient).mockReturnValue(
      adminClient({
        members: [S1, S2],
        profiles: [
          { id: S1, display_name: 'Maya', username: 'Player_1' },
          { id: S2, display_name: null, username: 'leo' },
        ],
      }) as never,
    );
    const res = await POST(req({ classroomId: CLASSROOM }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.classroomName).toBe('4B');
    expect(body.links.map((l: { name: string }) => l.name)).toEqual(['Maya', 'leo']);
    for (const link of body.links) {
      const token = link.path.replace('/report/', '');
      const payload = verifyParentReportToken(token);
      expect(payload?.classroomId).toBe(CLASSROOM);
      expect(payload?.studentId).toBe(link.studentId);
    }
  });

  it('returns an empty list for a class with no students', async () => {
    vi.mocked(createClient).mockResolvedValue(userClient({ user: { id: 't' }, owned: { id: CLASSROOM, name: '4B' } }) as never);
    vi.mocked(createAdminClient).mockReturnValue(adminClient({ members: [], profiles: [] }) as never);
    const res = await POST(req({ classroomId: CLASSROOM }));
    expect((await res.json()).links).toEqual([]);
  });

  it('fails closed with 500 when the signing secret is missing', async () => {
    delete process.env.PARENT_REPORT_SECRET;
    vi.mocked(createClient).mockResolvedValue(userClient({ user: { id: 't' }, owned: { id: CLASSROOM, name: '4B' } }) as never);
    vi.mocked(createAdminClient).mockReturnValue(adminClient({ members: [S1], profiles: [] }) as never);
    const res = await POST(req({ classroomId: CLASSROOM }));
    expect(res.status).toBe(500);
  });
});
