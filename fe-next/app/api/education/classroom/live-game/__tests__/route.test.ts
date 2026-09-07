/**
 * What is this classroom room actually playing?
 *
 * The student's multiplayer lobby could not answer that. `lessonGameData` — the
 * mode, the lesson, the settings — lives in the TEACHER's own sessionStorage, so
 * a student's classroom banner rendered every tile from defaults: mode "Classic"
 * and classic settings, in the middle of a Vocab Quiz. Recurring pitfall class 1:
 * one value, two sources, and the student's copy never existed.
 *
 * The room's own record in Redis already holds the truth. This route is the one
 * read path a student (guest included — the QR arrives logged out) can use.
 *
 * It is an unauthenticated lookup keyed on a six-character code, so it is rate
 * limited like the sibling `preview` route, and it returns nothing a student in
 * the room cannot already see on the projector: no teacher id, no roster, no
 * vocabulary list.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const lookupLiveClassroomGame = vi.fn();
vi.mock('@/lib/education/classroomGameLookup', () => ({
  lookupLiveClassroomGame: (code: string) => lookupLiveClassroomGame(code),
}));

const maybeSingle = vi.fn();
const createAdminClient = vi.fn();
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => createAdminClient(),
}));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), log: vi.fn(), warn: vi.fn() } }));

import { GET } from '../route';

const req = (code: string, ip = '203.0.113.44') =>
  new NextRequest(`https://example.com/api/education/classroom/live-game?code=${code}`, {
    headers: { 'x-forwarded-for': ip },
  });

const liveQuiz = {
  classroomId: 'c1',
  lessonIds: ['l1'],
  lessonNames: ['Week 3 Vocabulary'],
  teacherName: 'Ms. G',
  settings: {
    gameMode: 'vocab-quiz',
    vocabQuizQuestionCount: 8,
    vocabQuizSeconds: 25,
    allowLateJoin: true,
    timerMinutes: 5,
    boardSize: 'medium',
  },
};

describe('GET /api/education/classroom/live-game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupLiveClassroomGame.mockResolvedValue(liveQuiz);
    maybeSingle.mockResolvedValue({ data: { name: 'ELA Period 3' }, error: null });
    createAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle }) }),
      }),
    });
  });

  it('tells a student the mode and settings their teacher actually chose', async () => {
    const res = await GET(req('TZCOQ7'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      gameCode: 'TZCOQ7',
      gameMode: 'vocab-quiz',
      lessonNames: ['Week 3 Vocabulary'],
      settings: {
        vocabQuizQuestionCount: 8,
        vocabQuizSeconds: 25,
        allowLateJoin: true,
      },
    });
  });

  it('names the classroom, so the lobby stops saying "Classroom Session"', async () => {
    const res = await GET(req('TZCOQ8'));
    await expect(res.json()).resolves.toMatchObject({ classroomName: 'ELA Period 3' });
  });

  it('still answers when the classroom name cannot be resolved', async () => {
    // A missing service-role key must cost the heading its name, never the
    // student their mode and settings. Silent-degrade, not silent-fail.
    createAdminClient.mockReturnValue(null);
    const res = await GET(req('TZCOQ9'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      classroomName: null,
      gameMode: 'vocab-quiz',
    });
  });

  it('never leaks the roster, the vocabulary or the teacher id', async () => {
    lookupLiveClassroomGame.mockResolvedValue({
      ...liveQuiz,
      teacherId: 'secret-uuid',
      vocabularyWords: ['luminous', 'gravity'],
      players: [{ userId: 'u1', username: 'Maya' }],
    });
    const body = await (await GET(req('TZCOQ1'))).json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('secret-uuid');
    expect(serialized).not.toContain('luminous');
    expect(serialized).not.toContain('Maya');
  });

  it('404s a code with no live game', async () => {
    lookupLiveClassroomGame.mockResolvedValue(null);
    const res = await GET(req('ZZZZZZ'));
    expect(res.status).toBe(404);
  });

  it('rejects a malformed code without touching Redis', async () => {
    const res = await GET(req('nope'));
    expect(res.status).toBe(400);
    expect(lookupLiveClassroomGame).not.toHaveBeenCalled();
  });

  it('stops a caller walking the code space', async () => {
    let sawRateLimit = false;
    for (let i = 0; i < 300; i++) {
      const res = await GET(req(`BBB${String(i).padStart(3, '0')}`, '198.51.100.77'));
      if (res.status === 429) { sawRateLimit = true; break; }
    }
    expect(sawRateLimit).toBe(true);
  });
});
