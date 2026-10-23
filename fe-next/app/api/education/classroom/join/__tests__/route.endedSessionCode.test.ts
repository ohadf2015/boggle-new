import { describe, it, expect, vi, beforeEach } from 'vitest';

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
vi.mock('../endedSessionCode', () => ({
  lookupEndedClassroomSession: vi.fn(async () => null),
  recordEndedCodeTry: vi.fn(async () => undefined),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { canAddStudent } from '@/lib/subscriptions';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';
import { lookupEndedClassroomSession, recordEndedCodeTry } from '../endedSessionCode';

const post = (joinCode: string) =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  }) as never;

const insert = vi.fn(async () => ({ error: null }));
const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const mockDb = (existingMember = false) => {
  mocked(createClient).mockResolvedValue({
    rpc: vi.fn(async () => ({ data: [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: existingMember ? { id: 'm1' } : null })) })),
        })),
      })),
      insert,
    })),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked(lookupEndedClassroomSession).mockResolvedValue(null);
  mocked(lookupLiveGameForClassroom).mockResolvedValue(null);
  mocked(canAddStudent).mockResolvedValue({ allowed: true, currentCount: 0, limit: 50 });
});

describe('POST /api/education/classroom/join with an ended session code', () => {
  it('given an ended session code of a class, then it returns a class-join verdict and enrols the student', async () => {
    mockDb();
    mocked(lookupEndedClassroomSession).mockResolvedValue({ classroomId: 'c1' });

    const res = await POST(post('OLD123'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ verdict: 'class-join', classroomId: 'c1', endedSessionCode: true });
    expect(body).not.toHaveProperty('gameCode');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ classroom_id: 'c1', student_id: 'student-1' }));
    expect(recordEndedCodeTry).toHaveBeenCalledWith('c1', 'student-1');
  });

  it('given the class has started a new game since, then it hands back the new room', async () => {
    mockDb(true);
    mocked(lookupEndedClassroomSession).mockResolvedValue({ classroomId: 'c1' });
    mocked(lookupLiveGameForClassroom).mockResolvedValue('NEW999');

    const body = await (await POST(post('OLD123'))).json();

    expect(body).toMatchObject({ verdict: 'class-join', classroomId: 'c1', endedSessionCode: true, gameCode: 'NEW999' });
    expect(recordEndedCodeTry).not.toHaveBeenCalled();
  });

  it('given the class is full, then the student cap still holds', async () => {
    mockDb();
    mocked(lookupEndedClassroomSession).mockResolvedValue({ classroomId: 'c1' });
    mocked(canAddStudent).mockResolvedValue({ allowed: false, currentCount: 50, limit: 50, reason: 'cap' });

    const res = await POST(post('OLD123'));

    expect(res.status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
  });

  it('given a code that was never a session, then it still 400s', async () => {
    mockDb();
    const res = await POST(post('ZZZZZZ'));
    expect(res.status).toBe(400);
  });
});
