import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A student is handed six characters and a `/join/<code>` link. Two DIFFERENT systems mint
 * six-character codes into that one URL:
 *
 *   - `classrooms.join_code`  — DB trigger, permanent, enrolls you on a roster.
 *   - the live game's `gameCode` — client-generated in ClassroomGameLobby, lives 4h in Redis,
 *     and is what the projector's QR code and big on-screen code actually show.
 *
 * `/join/[code]` only ever tried the first one. A student reading the code off the board got
 * `400 Classroom not found` from both preview and join and had nowhere to go — observed in
 * production on 2026-09-04 (classroom "ELA (7th)": 5 students enrolled, 0 ever played).
 *
 * This route is the single place that answers "what KIND of code is this?" so every caller
 * routes on one answer instead of guessing.
 *
 * It never 400s on an unknown code: the page needs a branchable answer, not an error, so it
 * can still offer the student both doors.
 */

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/apiRateLimit', () => ({ checkApiRateLimit: vi.fn(() => ({ success: true })) }));
vi.mock('@/lib/education/classroomGameLookup', () => ({
  lookupLiveClassroomGame: vi.fn(async () => null),
}));

import { GET } from '../route';
import { createClient } from '@/utils/supabase/server';
import { lookupLiveClassroomGame } from '@/lib/education/classroomGameLookup';
import { checkApiRateLimit } from '@/lib/apiRateLimit';

const req = (code: string) =>
  new Request(`https://x.test/api/education/join-code/resolve?code=${code}`) as never;

const withClassroom = (row: unknown) => {
  (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    rpc: vi.fn(async () => ({ data: row ? [row] : [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: { name: 'ELA (7th)' }, error: null })),
        })),
      })),
    })),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  (lookupLiveClassroomGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (checkApiRateLimit as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ success: true });
});

describe('GET /api/education/join-code/resolve', () => {
  it('resolves a classroom join code to kind=classroom', async () => {
    withClassroom({ id: 'c1', name: 'ELA (7th)', language: 'en' });
    const res = await GET(req('Q3UQ2J'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      kind: 'classroom',
      id: 'c1',
      name: 'ELA (7th)',
      language: 'en',
    });
  });

  it('resolves a LIVE GAME code to kind=game — the code on the projector', async () => {
    withClassroom(null);
    (lookupLiveClassroomGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      classroomId: 'c1',
      lessonIds: ['l1'],
      teacherName: 'Ms. G',
    });

    const res = await GET(req('TZCOQ7'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      kind: 'game',
      gameCode: 'TZCOQ7',
      classroomId: 'c1',
    });
  });

  it('prefers the classroom when a code somehow matches both', async () => {
    withClassroom({ id: 'c1', name: 'ELA (7th)', language: 'en' });
    (lookupLiveClassroomGame as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      classroomId: 'c9', lessonIds: [], teacherName: 'X',
    });
    const res = await GET(req('Q3UQ2J'));
    await expect(res.json()).resolves.toMatchObject({ kind: 'classroom', id: 'c1' });
  });

  it('answers kind=unknown with 200, never an error status', async () => {
    withClassroom(null);
    const res = await GET(req('ZZZZZZ'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ kind: 'unknown' });
  });

  it('answers kind=unknown when Redis is down rather than failing the page', async () => {
    withClassroom(null);
    (lookupLiveClassroomGame as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Redis client not available')
    );
    const res = await GET(req('TZCOQ7'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ kind: 'unknown' });
  });

  /**
   * `kind: 'unknown'` is OVERLOADED, and a caller that hard-stops on it will
   * eventually refuse a perfectly good code. It is the answer for a genuine
   * miss, for a tripped rate limit, and for a roster RPC that errored or threw —
   * four situations, one word, and only the first of them means "wrong code".
   *
   * The guest join path now pre-validates the code so a typo costs one fast
   * request instead of an anonymous auth user plus a three-second spinner. That
   * only stays safe while it can tell a CONFIDENT unknown from a degraded one:
   * hard-stopping during a Supabase hiccup would tell a whole school their
   * classroom code was wrong (recurring pitfall class 4 — fail open, say
   * nothing, look identical to the real answer).
   *
   * So an unknown that came out of a broken lookup says so. Redis-down is the
   * deliberate exception: `lookupLiveClassroomGame` swallows its own failures,
   * and a student holding a GAME code cannot join with Redis down regardless.
   */
  it('flags an unknown produced by a broken classroom lookup as degraded', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'connection reset' } })),
    });
    const res = await GET(req('Q3UQ2J'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ kind: 'unknown', degraded: true });
  });

  it('flags an unknown as degraded when the classroom lookup throws', async () => {
    (createClient as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    const res = await GET(req('Q3UQ2J'));
    await expect(res.json()).resolves.toEqual({ kind: 'unknown', degraded: true });
  });

  it('flags a rate-limited answer as degraded — it never even looked', async () => {
    (checkApiRateLimit as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ success: false });
    const res = await GET(req('Q3UQ2J'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ kind: 'unknown', degraded: true });
  });

  it('leaves a CONFIDENT unknown unflagged, so a typo can be called a typo', async () => {
    withClassroom(null);
    const res = await GET(req('ZZZZZZ'));
    await expect(res.json()).resolves.toEqual({ kind: 'unknown' });
  });

  it('rejects a malformed code without touching either backend', async () => {
    withClassroom(null);
    const res = await GET(req('AB'));
    expect(res.status).toBe(400);
    expect(lookupLiveClassroomGame).not.toHaveBeenCalled();
  });

  it('is case- and whitespace-insensitive, like every code a student retypes', async () => {
    withClassroom({ id: 'c1', name: 'ELA (7th)', language: 'en' });
    const res = await GET(req('%20q3uq2j%20'));
    await expect(res.json()).resolves.toMatchObject({ kind: 'classroom' });
  });
});
