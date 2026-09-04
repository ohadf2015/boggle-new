import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The code a student actually reads is the one on the projector — the live game's `gameCode`,
 * not the classroom's permanent `join_code`. Both are six characters and both are handed out
 * through `/[locale]/join/[code]`, and this route only ever understood the second one, so the
 * common case answered `400 Classroom not found`.
 *
 * Joining by game code must do BOTH things a student needs: put them on the roster (so the
 * teacher sees them and their scores persist) and tell them which room to walk into.
 */

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

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';

const post = (joinCode: string) =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  }) as never;

const insert = vi.fn(async () => ({ error: null }));

/** `classroomRow` is what the join-code RPC resolves to — null means "no such classroom". */
const mockDb = (classroomRow: unknown) => {
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    rpc: vi.fn(async () => ({ data: classroomRow ? [classroomRow] : [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })),
          maybeSingle: vi.fn(async () => ({ data: { id: 'c1', name: 'ELA (7th)' }, error: null })),
        })),
      })),
      insert,
      upsert: vi.fn(async () => ({ error: null })),
    })),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  (lookupLiveClassroomGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
});

describe('POST /api/education/classroom/join — live game codes', () => {
  it('enrols the student when the code is a LIVE GAME code, not a roster code', async () => {
    mockDb(null);
    (lookupLiveClassroomGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G',
    });

    const res = await POST(post('TZCOQ7'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.classroomId).toBe('c1');
    // The room to walk into — without this the student is on the roster but still not playing.
    expect(body.gameCode).toBe('TZCOQ7');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ classroom_id: 'c1', student_id: 'student-1' })
    );
  });

  it('still 400s a code that is neither a classroom nor a live game', async () => {
    mockDb(null);
    const res = await POST(post('ZZZZZZ'));
    expect(res.status).toBe(400);
  });

  it('does not consult the game store when the code is a real classroom code', async () => {
    mockDb({ id: 'c1', name: 'ELA (7th)', language: 'en' });
    const res = await POST(post('Q3UQ2J'));
    expect(res.status).toBe(200);
    expect(lookupLiveClassroomGame).not.toHaveBeenCalled();
    await expect(res.json()).resolves.not.toHaveProperty('gameCode');
  });
});
