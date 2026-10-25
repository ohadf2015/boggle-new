import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/education/classroomGameLookup', () => ({ lookupLiveClassroomGame: vi.fn(async () => null) }));
vi.mock('@/lib/subscriptions', () => ({ canAddStudent: vi.fn() }));

import { POST } from '../route';
import { canAddStudent } from '@/lib/subscriptions';

const seat = canAddStudent as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  seat.mockResolvedValue({ allowed: true, currentCount: 3, limit: 50 });
  mockFrom.mockImplementation((table: string) => {
    if (table === 'classrooms') {
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'c-1' }, error: null }) }) }) };
    }
    if (table === 'classroom_memberships') {
      return { select: () => ({ eq: async () => ({ data: [], error: null }) }) };
    }
    return {};
  });
});

const post = (body: unknown, ip: string) =>
  POST(
    new Request('https://x.test/api/education/guest-name', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/education/guest-name — abuse', () => {
  it('tells a guest the class is full before any account exists', async () => {
    seat.mockResolvedValue({ allowed: false, currentCount: 50, limit: 50, reason: 'free tier' });
    const res = await post({ name: 'Dana', joinCode: 'ABC123' }, '192.0.2.1');
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ code: 'STUDENT_LIMIT_REACHED' });
  });

  it('serves a whole class on one IP, then throttles a prober', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 200; i++) {
      statuses.push((await post({ name: `Kid ${i}`, joinCode: 'ABC123' }, '192.0.2.50')).status);
    }
    expect(statuses.slice(0, 100).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
