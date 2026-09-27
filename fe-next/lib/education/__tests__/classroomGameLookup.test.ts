import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const get = vi.fn();
/**
 * Indirected through a mutable factory so a test can make the CLIENT itself fail without
 * `get` ever recording a rejected promise — vitest reports a rejection stored in
 * `mock.results` as unhandled even when the code under test catches it.
 */
let redisFactory: () => { get: typeof get } = () => ({ get });
vi.mock('@/backend/cache/redisCache', () => ({ getCacheClient: () => redisFactory() }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import {
  lookupLiveClassroomGame,
  classroomGameKey,
  CLASSROOM_GAME_KEY_PREFIX,
} from '../classroomGameLookup';

beforeEach(() => {
  get.mockReset();
  redisFactory = () => ({ get });
});

describe('lookupLiveClassroomGame', () => {
  it('reads the game the socket server wrote', async () => {
    get.mockResolvedValue(JSON.stringify({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G',
    }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toEqual({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G',
      lessonNames: [], settings: {},
    });
    expect(get).toHaveBeenCalledWith('classroom_game:TZCOQ7');
  });

  /**
   * The student's lobby has no other source for what game it is about to play:
   * `lessonGameData` lives in the TEACHER's sessionStorage, so a student's
   * classroom banner fell back to Classic + classic settings for a Vocab Quiz.
   * The Redis record the teacher's create wrote already holds the truth, so it
   * must survive this read rather than being trimmed to three fields.
   */
  it('carries the lesson names and the teacher-chosen settings', async () => {
    get.mockResolvedValue(JSON.stringify({
      classroomId: 'c1',
      lessonIds: ['l1'],
      lessonNames: ['Week 3 Vocabulary'],
      teacherName: 'Ms. G',
      settings: {
        gameMode: 'vocab-quiz',
        vocabQuizQuestionCount: 8,
        vocabQuizSeconds: 25,
        allowLateJoin: true,
      },
    }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toMatchObject({
      lessonNames: ['Week 3 Vocabulary'],
      settings: {
        gameMode: 'vocab-quiz',
        vocabQuizQuestionCount: 8,
        vocabQuizSeconds: 25,
      },
    });
  });

  /**
   * THE ENDED-GAME DEAD END.
   *
   * The record keeps a FRESH four-hour TTL after the teacher is done, so the
   * code stays fully readable long after the room is gone. This lookup is what
   * `/api/education/classroom/join`, `/api/education/join-code/resolve` and
   * `/api/education/classroom/live-game` all resolve a projector code through,
   * and it only ever asked "is there a blob with a classroomId?".
   *
   * So a student typing the code still on the whiteboard after the bell was
   * ENROLLED (200, `gameCode` in the body) and routed into
   * `/multiplayer?room=<code>&classroom=true` — a room the independent
   * `gameStateManager` lifecycle had already torn down. Dead room, or a
   * permanent spinner.
   *
   * Kahoot's bar: an ended game's PIN is simply not recognised. One gate here
   * closes all three routes at once.
   */
  it.each([
    ['the terminal status', { status: 'ended' }],
    ['the endedAt stamp alone', { status: 'finished', endedAt: '2026-09-10T09:14:00.000Z' }],
  ])('returns null once the teacher has ended the game — %s', async (_label, marker) => {
    get.mockResolvedValue(JSON.stringify({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G', ...marker,
    }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toBeNull();
  });

  /**
   * THE BETWEEN-ROUND LATECOMER — the gap the first version of this gate
   * opened. `status: 'finished'` is written the instant a round's timer
   * expires (`gameScores.ts:405`), and the teacher presses "next round"
   * seconds to minutes later while the class reads the results screen. Refusing
   * the code there told a student their classroom's live game did not exist.
   * Kahoot's PIN survives between questions; it dies when the host ends the
   * game, which is `endedAt` and nothing else.
   */
  it('still resolves between two rounds, while the teacher has not restarted', async () => {
    get.mockResolvedValue(JSON.stringify({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G', status: 'finished',
    }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toMatchObject({ classroomId: 'c1' });
  });

  it.each(['waiting', 'playing'] as const)('still resolves a %s game', async (status) => {
    get.mockResolvedValue(JSON.stringify({
      classroomId: 'c1', lessonIds: ['l1'], teacherName: 'Ms. G', status,
    }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toMatchObject({ classroomId: 'c1' });
  });

  /**
   * A record written before the session marker existed, or one whose write
   * raced, must stay JOINABLE. Failing closed on a missing field would lock a whole class
   * out of a live round — strictly worse than the bug being fixed.
   */
  it('treats a record with no status as joinable', async () => {
    get.mockResolvedValue(JSON.stringify({ classroomId: 'c1', lessonIds: [], teacherName: '' }));
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toMatchObject({ classroomId: 'c1' });
  });

  it('returns null when there is no such game', async () => {
    get.mockResolvedValue(null);
    await expect(lookupLiveClassroomGame('ZZZZZZ')).resolves.toBeNull();
  });

  it('returns null instead of throwing when Redis fails', async () => {
    redisFactory = () => { throw new Error('ECONNREFUSED'); };
    const result = await lookupLiveClassroomGame('TZCOQ7');
    expect(result).toBeNull();
  });

  it('returns null on malformed JSON rather than crashing the route', async () => {
    get.mockResolvedValue('{not json');
    await expect(lookupLiveClassroomGame('TZCOQ7')).resolves.toBeNull();
  });

  /**
   * The key is written by `backend/modules/classroomGameManager.ts` and read here. Two
   * definitions of one key is a drift risk, so pin it: if the writer's key format changes,
   * this fails instead of the lookup silently returning null forever.
   */
  /**
   * The session rule is stated twice — here, and in
   * `backend/modules/classroomGameSessionState.ts` for the socket server —
   * because webpack cannot resolve that module's sibling Node-ESM `.js`
   * specifiers. Two statements of one rule is a drift risk, so pin it: if the
   * socket half ever starts treating a plain `'finished'` round as dead again,
   * this fails instead of a whole class quietly losing its code mid-lesson.
   */
  it('states the same session rule as the socket server', () => {
    const src = readFileSync(
      join(process.cwd(), 'backend/modules/classroomGameSessionState.ts'),
      'utf8'
    );
    expect(src).toContain("game.status === 'ended' || Boolean(game.endedAt)");
    expect(src).not.toContain("=== 'finished'");
  });

  it('uses the same Redis key as the socket server that writes it', () => {
    const src = readFileSync(
      join(process.cwd(), 'backend/modules/classroomGameManager.ts'),
      'utf8'
    );
    expect(src).toContain(`\`${CLASSROOM_GAME_KEY_PREFIX}\${gameCode}\``);
    expect(classroomGameKey('ABC123')).toBe('classroom_game:ABC123');
  });
});
