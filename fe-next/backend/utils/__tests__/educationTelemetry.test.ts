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

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const arg = mockCapture.mock.calls[0][0];
    expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST);
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

    expect(mockCapture).toHaveBeenCalledTimes(evs.length);
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
