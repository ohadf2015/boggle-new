import { describe, it, expect } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';
import { planClassroomRoundEvents } from '../classroomRoundRecord';

const DAY = 86_400_000;
const NOW = new Date('2026-10-07T12:00:00Z');

const game = {
  gameCode: 'GHY123',
  teacherId: 'teacher-1',
  classroomId: 'class-1',
  lessonIds: ['l1'],
  settings: { gameMode: 'classic' },
  players: [],
} as unknown as ClassroomGame;

const noHistory = { firstRealRoundAt: null, secondDayReached: false, teacherIsTest: false };

describe('planClassroomRoundEvents', () => {
  it('Given the teacher has no prior real rounds, When a 2-player round completes, Then first-live-game and round-completed are planned', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1', 's2'], durationSeconds: 120, priorRealRounds: 0, ...noHistory, memberships: [], now: NOW,
    });
    const names = events.map((e) => e.event);
    expect(names).toContain('edu_live_round_completed');
    expect(names).toContain('edu_teacher_first_live_game');
  });

  it('Given a teacher testing alone on a second device, When the 1-player round completes, Then it is not their first live game', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1'], durationSeconds: 120, priorRealRounds: 0, ...noHistory, memberships: [], now: NOW,
    });
    expect(events.map((e) => e.event)).not.toContain('edu_teacher_first_live_game');
  });

  it('Given the teacher already ran a real round, When a round completes, Then no first-live-game is planned', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1'], durationSeconds: 120, priorRealRounds: 3, ...noHistory, memberships: [], now: NOW,
    });
    expect(events.map((e) => e.event)).not.toContain('edu_teacher_first_live_game');
  });

  it('Given returning members and a non-player member, When planned, Then only players who joined a day ago get a return event', () => {
    const events = planClassroomRoundEvents({
      game,
      playerIds: ['s1', 's2'],
      durationSeconds: 60,
      priorRealRounds: 1,
      ...noHistory,
      memberships: [
        { userId: 's1', joinedAt: new Date(NOW.getTime() - 2 * DAY).toISOString(), isTestAccount: false },
        { userId: 's2', joinedAt: new Date(NOW.getTime() - 1_000).toISOString(), isTestAccount: false },
        { userId: 'bystander', joinedAt: new Date(NOW.getTime() - 5 * DAY).toISOString(), isTestAccount: false },
      ],
      now: NOW,
    });
    const returns = events.filter((e) => e.event === 'edu_student_returned');
    expect(returns.map((e) => e.distinctId)).toEqual(['s1']);
  });

  it('Given a game without a classroom, When planned, Then nothing is planned', () => {
    const events = planClassroomRoundEvents({
      game: { ...game, classroomId: '' } as ClassroomGame,
      playerIds: ['s1'], durationSeconds: 60, priorRealRounds: 0, ...noHistory, memberships: [], now: NOW,
    });
    expect(events).toEqual([]);
  });

  it('Given a first real round 6 UTC days ago and nothing since, When a 3-player round completes, Then the second-day event is planned with days_since_first 6', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1', 's2', 's3'], durationSeconds: 300, priorRealRounds: 1,
      firstRealRoundAt: '2026-10-01T09:00:00Z', secondDayReached: false, teacherIsTest: false,
      memberships: [], now: NOW,
    });
    const second = events.filter((e) => e.event === 'edu_teacher_second_live_game_day');
    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ distinctId: 'teacher-1', properties: { days_since_first: 6, player_count: 3, is_test_account: false } });
  });

  it('Given a solo self-test on a new day, or a day already reached, When the round completes, Then no second-day event', () => {
    const solo = planClassroomRoundEvents({
      game, playerIds: ['s1'], durationSeconds: 60, priorRealRounds: 1,
      firstRealRoundAt: '2026-10-01T09:00:00Z', secondDayReached: false, teacherIsTest: false, memberships: [], now: NOW,
    });
    const again = planClassroomRoundEvents({
      game, playerIds: ['s1', 's2'], durationSeconds: 60, priorRealRounds: 4,
      firstRealRoundAt: '2026-10-01T09:00:00Z', secondDayReached: true, teacherIsTest: false, memberships: [], now: NOW,
    });
    expect([...solo, ...again].map((e) => e.event)).not.toContain('edu_teacher_second_live_game_day');
  });

  it('Given a test teacher, When a round completes, Then every planned event carries is_test_account true', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1', 's2'], durationSeconds: 60, priorRealRounds: 0,
      firstRealRoundAt: null, secondDayReached: false, teacherIsTest: true,
      memberships: [{ userId: 's1', joinedAt: new Date(NOW.getTime() - 3 * DAY).toISOString(), isTestAccount: false }],
      now: NOW,
    });
    expect(events.length).toBeGreaterThanOrEqual(3);
    for (const e of events) expect(e.properties.is_test_account).toBe(true);
  });

  it('Given a flagged QA student with a real teacher, When planned, Then only that student is tagged and the return carries surface live', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1', 's2'], durationSeconds: 60, priorRealRounds: 1, ...noHistory,
      memberships: [
        { userId: 's1', joinedAt: new Date(NOW.getTime() - 3 * DAY).toISOString(), isTestAccount: true },
        { userId: 's2', joinedAt: new Date(NOW.getTime() - 3 * DAY).toISOString(), isTestAccount: false },
      ],
      now: NOW,
    });
    const returns = events.filter((e) => e.event === 'edu_student_returned');
    expect(returns.map((e) => [e.distinctId, e.properties.is_test_account, e.properties.surface])).toEqual([
      ['s1', true, 'live'],
      ['s2', false, 'live'],
    ]);
    expect(events.find((e) => e.event === 'edu_live_round_completed')!.properties.is_test_account).toBe(false);
  });
});
