import { describe, expect, it } from 'vitest';
import { buildClassroomJoinRefusedEvent } from '../educationTelemetry';
import { buildLiveGameEndedEvent } from '../educationRoundTelemetry';
import type { ClassroomGame } from '../../modules/classroomGameManager';

const game = {
  gameCode: 'ABC123',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  players: [{ userId: 's1' }],
  rosterUserIds: ['s1'],
  lessonIds: [],
  settings: { gameMode: 'classic' },
  startedAt: '2026-11-03T17:00:00.000Z',
} as unknown as ClassroomGame;

describe('join refusal and live-game events carry the fields this outage needs', () => {
  it('Given a student arrived 90s after the teacher ended, Then the refusal names the class and the delay', () => {
    const event = buildClassroomJoinRefusedEvent({
      gameCode: 'ABC123',
      classroomId: 'class-1',
      reason: 'SESSION_ENDED',
      door: 'join',
      actorId: 'student-9',
      isTestAccount: false,
      secondsSinceEnd: 90,
    });
    expect(event?.properties).toMatchObject({
      classroom_id: 'class-1',
      seconds_since_end: 90,
      reason: 'SESSION_ENDED',
    });
  });

  it('Given the game ends with one student seated, Then ended carries seated_count', () => {
    const event = buildLiveGameEndedEvent(game, {
      isTestAccount: false,
      now: new Date('2026-11-03T17:05:00.000Z'),
      roundsRecorded: 0,
    });
    expect(event?.properties.seated_count).toBe(1);
  });
});
