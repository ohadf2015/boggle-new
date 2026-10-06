/**
 * Education server telemetry — regression guards.
 *
 * The `$host` assertions are the important ones. Production evidence
 * (2026-09-15): 2,419 `mp_player_dropped` and 4 `email_subscribed` events, all
 * server-emitted, carry `$host = NULL`. Every dashboard in this project filters
 * `properties.$host = 'www.lexiclash.live'` because PostHog is shared by ~12
 * apps — so the entire backend telemetry channel is invisible to every query
 * that has ever been run against it, and pollutes the other apps' taxonomy.
 *
 * These tests fail if an education server event is ever emitted without a host,
 * which is the exact shape of the silent failure this module exists to avoid.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const mockCapture = vi.fn();
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: mockCapture }),
}));

import {
  buildClassroomGameStartedEvent,
  buildClassroomGameCompletedEvents,
  captureEduServerEvents,
  buildClassroomJoinRefusedEvent,
  EDU_ANALYTICS_HOST,
} from '../educationTelemetry';

function makeGame(over: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'ABC123',
    classroomId: 'cls-1',
    teacherId: 'teacher-1',
    teacherName: 'T',
    lessonIds: ['lesson-1', 'lesson-2'],
    lessonNames: ['L1', 'L2'],
    vocabularyWords: ['cat', 'dog'],
    settings: { gameMode: 'word-hunt' },
    players: [
      { userId: 'stu-1', username: 'A', socketId: 's1' },
      { userId: 'stu-2', username: 'B', socketId: 's2' },
    ],
    createdAt: new Date().toISOString(),
    status: 'playing',
    ...over,
  } as ClassroomGame;
}

beforeEach(() => {
  mockCapture.mockClear();
});

describe('buildClassroomGameStartedEvent', () => {
  it('Given a classroom game, When built, Then it carries classroom_id, game_mode and player_count', () => {
    const ev = buildClassroomGameStartedEvent(makeGame(), { isTestAccount: false });

    expect(ev).not.toBeNull();
    expect(ev!.event).toBe('edu_classroom_game_started');
    expect(ev!.distinctId).toBe('teacher-1');
    expect(ev!.properties.classroom_id).toBe('cls-1');
    expect(ev!.properties.game_mode).toBe('word-hunt');
    expect(ev!.properties.player_count).toBe(2);
    expect(ev!.properties.lesson_count).toBe(2);
    expect(ev!.properties.game_code).toBe('ABC123');
  });

  it('Given settings with no gameMode, When built, Then game_mode falls back to classic rather than undefined', () => {
    const ev = buildClassroomGameStartedEvent(makeGame({ settings: {} }), {
      isTestAccount: false,
    });
    expect(ev!.properties.game_mode).toBe('classic');
  });

  it('Given a game with no classroomId, When built, Then it returns null instead of an untagged event', () => {
    expect(
      buildClassroomGameStartedEvent(makeGame({ classroomId: '' }), { isTestAccount: false })
    ).toBeNull();
  });
});

describe('buildClassroomGameCompletedEvents', () => {
  it('Given two players, When built, Then one event per player keyed on the student id', () => {
    const evs = buildClassroomGameCompletedEvents(makeGame(), [
      { userId: 'stu-1', score: 30, xpEarned: 12, lessonWordsFoundCount: 2, lessonWordsAskedCount: 4 },
      { userId: 'stu-2', score: 10, xpEarned: 4, lessonWordsFoundCount: 1, lessonWordsAskedCount: 4 },
    ]);

    expect(evs).toHaveLength(2);
    expect(evs.map((e) => e.distinctId)).toEqual(['stu-1', 'stu-2']);
    expect(evs[0].event).toBe('edu_classroom_game_completed');
    expect(evs[0].properties.classroom_id).toBe('cls-1');
    expect(evs[0].properties.game_mode).toBe('word-hunt');
    expect(evs[0].properties.xp_earned).toBe(12);
    expect(evs[0].properties.score).toBe(30);
  });

  it('Given lesson words asked and found, When built, Then lesson_accuracy is the ratio', () => {
    const evs = buildClassroomGameCompletedEvents(makeGame(), [
      { userId: 'stu-1', score: 0, xpEarned: 0, lessonWordsFoundCount: 1, lessonWordsAskedCount: 4 },
    ]);
    expect(evs[0].properties.lesson_accuracy).toBeCloseTo(0.25);
  });

  it('Given zero lesson words asked, When built, Then lesson_accuracy is null and never NaN', () => {
    const evs = buildClassroomGameCompletedEvents(makeGame(), [
      { userId: 'stu-1', score: 0, xpEarned: 0, lessonWordsFoundCount: 0, lessonWordsAskedCount: 0 },
    ]);
    expect(evs[0].properties.lesson_accuracy).toBeNull();
  });

  it('Given no players, When built, Then it returns an empty array', () => {
    expect(buildClassroomGameCompletedEvents(makeGame(), [])).toEqual([]);
  });
});

describe('captureEduServerEvents — $host', () => {
  it('Given any education server event, When captured, Then $host is set so dashboard filters can see it', () => {
    captureEduServerEvents([
      { distinctId: 'stu-1', event: 'edu_classroom_game_completed', properties: { a: 1 } },
    ]);

    // Two calls: the bare canonical event plus its growth:* twin. BOTH must
    // carry $host or the twin falls into the $host=NULL hole it was built to
    // climb out of.
    expect(mockCapture).toHaveBeenCalledTimes(2);
    for (const call of mockCapture.mock.calls) {
      expect(call[0].properties.$host).toBe(EDU_ANALYTICS_HOST);
    }
    expect(EDU_ANALYTICS_HOST).toBeTruthy();
  });

  it('Given every built education event, When captured, Then none is missing $host', () => {
    const evs = [
      buildClassroomGameStartedEvent(makeGame(), { isTestAccount: false })!,
      ...buildClassroomGameCompletedEvents(makeGame(), [
        { userId: 'stu-1', score: 1, xpEarned: 1, lessonWordsFoundCount: 1, lessonWordsAskedCount: 1 },
      ]),
    ];
    captureEduServerEvents(evs);

    // Both built event names are on the twin allowlist → 2 captures per event.
    expect(mockCapture).toHaveBeenCalledTimes(evs.length * 2);
    for (const call of mockCapture.mock.calls) {
      expect(call[0].properties.$host).toBe(EDU_ANALYTICS_HOST);
    }
  });

  it('Given a test-account flag, When captured, Then is_test_account rides the event so funnels can exclude it', () => {
    const ev = buildClassroomGameStartedEvent(makeGame(), { isTestAccount: true })!;
    captureEduServerEvents([ev]);
    expect(mockCapture.mock.calls[0][0].properties.is_test_account).toBe(true);
  });

  it('Given a capture that throws, When captured, Then it never propagates into gameplay', () => {
    mockCapture.mockImplementationOnce(() => {
      throw new Error('posthog down');
    });
    expect(() =>
      captureEduServerEvents([{ distinctId: 'x', event: 'edu_classroom_game_started', properties: {} }])
    ).not.toThrow();
  });

  it('Given an empty list, When captured, Then PostHog is not called at all', () => {
    captureEduServerEvents([]);
    expect(mockCapture).not.toHaveBeenCalled();
  });
});

describe('captureEduServerEvents — Growth Radar twins (t_44f87dd2)', () => {
  it('Given a classroom game started, When captured, Then a growth: twin rides with the same distinctId and props', () => {
    const ev = buildClassroomGameStartedEvent(makeGame(), { isTestAccount: false })!;
    captureEduServerEvents([ev]);

    expect(mockCapture).toHaveBeenCalledTimes(2);
    const [bare, twin] = mockCapture.mock.calls.map((c) => c[0]);
    expect(bare.event).toBe('edu_classroom_game_started');
    expect(twin.event).toBe('growth:edu_classroom_game_started');
    expect(twin.distinctId).toBe(bare.distinctId);
    // Identical props (mod nothing) — Growth Radar must see the same funnel row.
    expect({ ...twin.properties }).toEqual({ ...bare.properties });
  });

  it('Given classroom game completions, When captured, Then every per-student event gets a growth: twin', () => {
    const evs = buildClassroomGameCompletedEvents(makeGame(), [
      { userId: 'stu-1', score: 30, xpEarned: 12, lessonWordsFoundCount: 2, lessonWordsAskedCount: 4 },
      { userId: 'stu-2', score: 10, xpEarned: 4, lessonWordsFoundCount: 1, lessonWordsAskedCount: 4 },
    ]);
    captureEduServerEvents(evs);

    expect(mockCapture).toHaveBeenCalledTimes(4);
    const byName = mockCapture.mock.calls.map((c) => [c[0].event, c[0].distinctId]);
    expect(byName).toEqual([
      ['edu_classroom_game_completed', 'stu-1'],
      ['growth:edu_classroom_game_completed', 'stu-1'],
      ['edu_classroom_game_completed', 'stu-2'],
      ['growth:edu_classroom_game_completed', 'stu-2'],
    ]);
  });

  it('Given a NON-allowlisted event, When captured, Then no twin is emitted (no double-counting)', () => {
    captureEduServerEvents([
      buildClassroomJoinRefusedEvent({
        gameCode: 'ABC123',
        classroomId: 'class-1',
        reason: 'GAME_NOT_FOUND',
        door: 'join',
        actorId: 'student-9',
      })!,
    ]);
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture.mock.calls[0][0].event).toBe('edu_classroom_join_refused');
  });

  it('Given the bare capture throws, When captured, Then the twin still fires and neither throws', () => {
    mockCapture.mockImplementationOnce(() => {
      throw new Error('posthog down');
    });
    expect(() =>
      captureEduServerEvents([{ distinctId: 'x', event: 'edu_classroom_game_started', properties: {} }])
    ).not.toThrow();
    expect(mockCapture).toHaveBeenCalledTimes(2);
    expect(mockCapture.mock.calls[1][0].event).toBe('growth:edu_classroom_game_started');
  });
});

describe('buildClassroomJoinRefusedEvent', () => {
  it('records which gate refused the student, and on which code', () => {
    const event = buildClassroomJoinRefusedEvent({
      gameCode: 'ABC123',
      classroomId: 'class-1',
      reason: 'GAME_NOT_FOUND',
      door: 'join',
      actorId: 'student-9',
    })!;

    expect(event.event).toBe('edu_classroom_join_refused');
    expect(event.distinctId).toBe('student-9');
    expect(event.properties).toMatchObject({
      game_code: 'ABC123',
      classroom_id: 'class-1',
      reason: 'GAME_NOT_FOUND',
      door: 'join',
    });
  });

  it('still reports an anonymous student rather than dropping the refusal', () => {
    // Guest students have no auth id at all. Dropping their refusal is how the
    // 2026-09-14 session left no trace of the children who never got in.
    const event = buildClassroomJoinRefusedEvent({
      gameCode: 'ABC123',
      classroomId: null,
      reason: 'NOT_A_MEMBER',
      door: 'classroomBanner',
      actorId: null,
    })!;
    expect(event.distinctId).toBe('anonymous-ABC123');
    expect(event.properties.classroom_id).toBeNull();
  });

  it('carries a host so the event is visible to every dashboard', () => {
    mockCapture.mockClear();
    captureEduServerEvents([
      buildClassroomJoinRefusedEvent({
        gameCode: 'ABC123',
        classroomId: 'class-1',
        reason: 'SESSION_ENDED',
        door: 'join',
        actorId: 'student-9',
      })!,
    ]);
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture.mock.calls[0][0].properties.$host).toBe(EDU_ANALYTICS_HOST);
  });
});
