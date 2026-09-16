import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The teacher posts ONE code in Google Classroom, and it is the permanent roster
 * code — the projector code is minted per game and changes every session.
 *
 * Joining by the GAME code has walked a student into the room since 2026-09-04.
 * The ROSTER code did not: the route returned `classroomId` with no `gameCode`,
 * and `useJoinFlow` reads exactly that field to choose between the game and the
 * student hub — so the student got a green "joined!" toast and a dashboard while
 * their class played on. Reported by a teacher on 2026-09-14: "they entered the
 * exact same class code as the students who successfully joined".
 *
 * Both codes must now end in the same place when the class is mid-game.
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
vi.mock('@/lib/education/liveGameForClassroom', () => ({
  lookupLiveGameForClassroom: vi.fn(async () => null),
}));

import { POST } from '../route';
import { createClient } from '@/utils/supabase/server';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';

const asMock = (fn: unknown) => fn as unknown as ReturnType<typeof vi.fn>;

const post = (joinCode: string) =>
  new Request('https://x.test/api/education/classroom/join', {
    method: 'POST',
    body: JSON.stringify({ joinCode }),
  }) as never;

/** `existingMember` drives the "already a member" short-circuit. */
const mockDb = (existingMember: boolean) => {
  asMock(createClient).mockResolvedValue({
    rpc: vi.fn(async () => ({ data: [{ id: 'c1', name: 'ELA (6th)' }], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: existingMember ? { id: 'm1' } : null })),
          })),
        })),
      })),
      insert: vi.fn(async () => ({ error: null })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  asMock(lookupLiveGameForClassroom).mockResolvedValue(null);
});

describe('roster code typed while the class is mid-game', () => {
  it('hands back the live game code so the student walks into the room', async () => {
    mockDb(false);
    asMock(lookupLiveGameForClassroom).mockResolvedValue('TZCOQ7');

    const body = await (await POST(post('9GA8WV'))).json();

    expect(body.classroomId).toBe('c1');
    expect(body.gameCode).toBe('TZCOQ7');
    expect(lookupLiveGameForClassroom).toHaveBeenCalledWith('c1');
  });

  /**
   * The common classroom case: the student is already on the roster from an
   * earlier session and re-types the code to get into today's game. This branch
   * returns EARLY, before the enrolment insert, so it needs the lookup too —
   * miss it and returning students are the ones left behind.
   */
  it('hands back the game code to a student who is already on the roster', async () => {
    mockDb(true);
    asMock(lookupLiveGameForClassroom).mockResolvedValue('TZCOQ7');

    const body = await (await POST(post('9GA8WV'))).json();

    expect(body.gameCode).toBe('TZCOQ7');
  });

  /** No live game: enrolling and landing on the hub is the correct outcome. */
  it('omits gameCode when the classroom is not playing', async () => {
    mockDb(false);

    const body = await (await POST(post('9GA8WV'))).json();

    expect(body.classroomId).toBe('c1');
    expect(body.gameCode).toBeUndefined();
  });

  /** Redis down must not cost the student their enrolment. */
  it('still joins the classroom when the live-game lookup fails', async () => {
    mockDb(false);
    asMock(lookupLiveGameForClassroom).mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await POST(post('9GA8WV'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.classroomId).toBe('c1');
    expect(body.gameCode).toBeUndefined();
  });
});
