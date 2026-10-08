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

describe('planClassroomRoundEvents', () => {
  it('Given the teacher has no prior rounds, When a round completes, Then first-live-game and round-completed are planned', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1'], durationSeconds: 120, priorRounds: 0, memberships: [], now: NOW,
    });
    const names = events.map((e) => e.event);
    expect(names).toContain('edu_live_round_completed');
    expect(names).toContain('edu_teacher_first_live_game');
  });

  it('Given the teacher already ran a round, When a round completes, Then no first-live-game is planned', () => {
    const events = planClassroomRoundEvents({
      game, playerIds: ['s1'], durationSeconds: 120, priorRounds: 3, memberships: [], now: NOW,
    });
    expect(events.map((e) => e.event)).not.toContain('edu_teacher_first_live_game');
  });

  it('Given returning members and a non-player member, When planned, Then only players who joined a day ago get a return event', () => {
    const events = planClassroomRoundEvents({
      game,
      playerIds: ['s1', 's2'],
      durationSeconds: 60,
      priorRounds: 1,
      memberships: [
        { userId: 's1', joinedAt: new Date(NOW.getTime() - 2 * DAY).toISOString() },
        { userId: 's2', joinedAt: new Date(NOW.getTime() - 1_000).toISOString() },
        { userId: 'bystander', joinedAt: new Date(NOW.getTime() - 5 * DAY).toISOString() },
      ],
      now: NOW,
    });
    const returns = events.filter((e) => e.event === 'edu_student_returned');
    expect(returns.map((e) => e.distinctId)).toEqual(['s1']);
  });

  it('Given a game without a classroom, When planned, Then nothing is planned', () => {
    const events = planClassroomRoundEvents({
      game: { ...game, classroomId: '' } as ClassroomGame,
      playerIds: ['s1'], durationSeconds: 60, priorRounds: 0, memberships: [], now: NOW,
    });
    expect(events).toEqual([]);
  });
});
