import { describe, it, expect } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';
import {
  buildClassroomCreatedEvent,
  buildStudentJoinedEvent,
  buildLiveRoundStartedEvent,
  buildLiveRoundCompletedEvent,
  buildStudentReturnedEvents,
  buildTeacherFirstLiveGameEvent,
  isQaEmail,
} from '../educationRoundTelemetry';

const DAY = 86_400_000;
const NOW = new Date('2026-10-07T12:00:00Z');

function makeGame(overrides: Partial<ClassroomGame> = {}): ClassroomGame {
  return {
    gameCode: 'ABC123',
    teacherId: 'teacher-1',
    classroomId: 'class-1',
    players: [{ userId: 's1' }, { userId: 's2' }],
    lessonIds: ['l1', 'l2'],
    settings: { gameMode: 'wordcraft' },
    startedAt: new Date(NOW.getTime() - 90_000).toISOString(),
    ...overrides,
  } as unknown as ClassroomGame;
}

describe('educationRoundTelemetry builders', () => {
  it('Given a QA email, When checked, Then it is a test account', () => {
    expect(isQaEmail('gauntlet@lexiclash.test')).toBe(true);
    expect(isQaEmail('Teacher@LexiClash.test')).toBe(true);
    expect(isQaEmail('real@gmail.com')).toBe(false);
    expect(isQaEmail(undefined)).toBe(false);
  });

  it('Given a new classroom, When the event is built, Then it is keyed on the teacher with the classroom id', () => {
    const ev = buildClassroomCreatedEvent({
      teacherId: 't1', classroomId: 'c1', language: 'en', isTestAccount: false,
    });
    expect(ev.event).toBe('edu_classroom_created');
    expect(ev.distinctId).toBe('t1');
    expect(ev.properties).toMatchObject({ classroom_id: 'c1', language: 'en', is_test_account: false });
  });

  it('Given a student joins, When the event is built, Then it is keyed on the student', () => {
    const ev = buildStudentJoinedEvent({ studentId: 's9', classroomId: 'c1', isTestAccount: true });
    expect(ev.event).toBe('edu_student_joined');
    expect(ev.distinctId).toBe('s9');
    expect(ev.properties).toMatchObject({ classroom_id: 'c1', is_test_account: true });
  });

  it('Given a live round starts, When built, Then it carries mode and player count, keyed on the teacher', () => {
    const ev = buildLiveRoundStartedEvent(makeGame(), { isTestAccount: false });
    expect(ev).not.toBeNull();
    expect(ev!.event).toBe('edu_live_round_started');
    expect(ev!.distinctId).toBe('teacher-1');
    expect(ev!.properties).toMatchObject({
      classroom_id: 'class-1', game_mode: 'wordcraft', player_count: 2, lesson_count: 2,
    });
  });

  it('Given a game with no classroom, When a round starts, Then no event is built', () => {
    expect(buildLiveRoundStartedEvent(makeGame({ classroomId: '' as string }), { isTestAccount: false })).toBeNull();
  });

  it('Given a round completes, When built, Then duration and player count are included', () => {
    const ev = buildLiveRoundCompletedEvent({ game: makeGame(), durationSeconds: 90, playerCount: 2 });
    expect(ev).not.toBeNull();
    expect(ev!.event).toBe('edu_live_round_completed');
    expect(ev!.properties).toMatchObject({
      classroom_id: 'class-1', game_mode: 'wordcraft', duration_seconds: 90, player_count: 2,
    });
  });

  it('Given a round completes with unknown duration, When built, Then duration is null, never NaN', () => {
    const ev = buildLiveRoundCompletedEvent({ game: makeGame(), durationSeconds: null, playerCount: 2 });
    expect(ev!.properties.duration_seconds).toBeNull();
  });

  it('Given a student who joined yesterday, When the round completes, Then a day-1 return is emitted', () => {
    const joined = new Date(NOW.getTime() - 1.5 * DAY).toISOString();
    const events = buildStudentReturnedEvents({
      classroomId: 'c1', now: NOW, students: [{ userId: 's1', joinedAt: joined }],
    });
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('edu_student_returned');
    expect(events[0].distinctId).toBe('s1');
    expect(events[0].properties).toMatchObject({ classroom_id: 'c1', day_n: 1 });
  });

  it('Given a student who joined today or has no join date, When the round completes, Then no return is emitted', () => {
    const events = buildStudentReturnedEvents({
      classroomId: 'c1',
      now: NOW,
      students: [
        { userId: 's1', joinedAt: new Date(NOW.getTime() - 3_600_000).toISOString() },
        { userId: 's2', joinedAt: null },
      ],
    });
    expect(events).toEqual([]);
  });

  it('Given a teacher runs their first live round, When built, Then the first-live-game event is keyed on the teacher', () => {
    const ev = buildTeacherFirstLiveGameEvent({
      teacherId: 't1', classroomId: 'c1', gameMode: 'classic', playerCount: 4,
    });
    expect(ev.event).toBe('edu_teacher_first_live_game');
    expect(ev.distinctId).toBe('t1');
    expect(ev.properties).toMatchObject({ classroom_id: 'c1', game_mode: 'classic', player_count: 4 });
  });
});
