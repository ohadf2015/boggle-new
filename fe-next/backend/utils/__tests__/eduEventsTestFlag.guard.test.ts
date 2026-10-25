import { describe, it, expect, vi } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => null }));

import * as round from '../educationRoundTelemetry';
import * as core from '../educationTelemetry';

const game = {
  gameCode: 'G1', classroomId: 'c1', teacherId: 't1', players: [], lessonIds: ['l1'],
  settings: { gameMode: 'classic' }, startedAt: '2026-10-01T10:00:00Z',
} as unknown as ClassroomGame;

const fixtures: Record<string, () => unknown> = {
  buildClassroomCreatedEvent: () => round.buildClassroomCreatedEvent({ teacherId: 't1', classroomId: 'c1', language: 'en', isTestAccount: false }),
  buildStudentJoinedEvent: () => round.buildStudentJoinedEvent({ studentId: 's1', classroomId: 'c1', isTestAccount: false }),
  buildParentReportViewedEvent: () => round.buildParentReportViewedEvent({ token: 'x', classroomId: 'c1', locale: 'en', isTestAccount: false }),
  buildJoinCodeCopyRecordedEvent: () => round.buildJoinCodeCopyRecordedEvent({ teacherId: 't1', isTestAccount: false }),
  buildFirstStudentJoinedEvent: () => round.buildFirstStudentJoinedEvent({ teacherId: 't1', classroomId: 'c1', isTestAccount: false }),
  buildLiveRoundStartedEvent: () => round.buildLiveRoundStartedEvent(game, { isTestAccount: false }),
  buildLiveRoundCompletedEvent: () => round.buildLiveRoundCompletedEvent({ game, durationSeconds: 1, playerCount: 2, isTestAccount: false }),
  buildLiveGameEndedEvent: () => round.buildLiveGameEndedEvent(game, { isTestAccount: false, now: new Date(), roundsRecorded: 1 }),
  buildStudentReturnedEvents: () => round.buildStudentReturnedEvents({
    classroomId: 'c1', now: new Date('2026-10-10T00:00:00Z'), gameMode: 'classic', surface: 'live',
    students: [{ userId: 's1', joinedAt: '2026-10-01T00:00:00Z', isTestAccount: false }],
  }),
  buildTeacherFirstLiveGameEvent: () => round.buildTeacherFirstLiveGameEvent({ teacherId: 't1', classroomId: 'c1', gameMode: 'classic', playerCount: 2, isTestAccount: false }),
  buildTeacherSecondLiveGameDayEvent: () => round.buildTeacherSecondLiveGameDayEvent({ teacherId: 't1', classroomId: 'c1', gameMode: 'classic', playerCount: 2, daysSinceFirst: 1, isTestAccount: false }),
  buildClassroomGameStartedEvent: () => core.buildClassroomGameStartedEvent(game, { isTestAccount: false }),
  buildClassroomGameCompletedEvents: () => core.buildClassroomGameCompletedEvents(game, [
    { userId: 's1', score: 1, xpEarned: 1, lessonWordsFoundCount: 1, lessonWordsAskedCount: 1, isTestAccount: false },
  ]),
  buildClassroomJoinRefusedEvent: () => core.buildClassroomJoinRefusedEvent({
    gameCode: 'G1', classroomId: 'c1', reason: 'X', door: 'join', actorId: null, isTestAccount: false,
  }),
};

const exported = [...Object.keys(round), ...Object.keys(core)].filter((k) => /^build[A-Z].*Events?$/.test(k));

describe('every edu server event builder carries an explicit is_test_account', () => {
  it('Given the exported builders, Then each has a fixture here (a new builder must be added)', () => {
    expect(exported.sort()).toEqual(Object.keys(fixtures).sort());
  });

  it.each(Object.keys(fixtures))('%s', (name) => {
    const out = fixtures[name]();
    const events = (Array.isArray(out) ? out : [out]) as Array<{ properties: Record<string, unknown> }>;
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) expect(typeof e.properties.is_test_account).toBe('boolean');
  });
});
