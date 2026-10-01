import { describe, it, expect, vi } from 'vitest';
import type { ClassroomGame } from '../../modules/classroomGameManager';

vi.mock('@/lib/posthog', () => ({ getPostHogServer: () => null }));

import { buildClassroomGameCompletedEvents } from '../educationTelemetry';

const outcome = (userId: string) => ({ userId, score: 10, xpEarned: 5, lessonWordsFoundCount: 1, lessonWordsAskedCount: 2 });

describe('edu_classroom_game_completed player_count', () => {
  it('counts the students actually recorded, even when the live roster was already emptied', () => {
    const game = {
      gameCode: 'ABC123',
      classroomId: 'cls-1',
      teacherId: 'teacher-1',
      lessonIds: ['l1'],
      settings: { gameMode: 'vocab-quiz' },
      players: [],
    } as unknown as ClassroomGame;
    const events = buildClassroomGameCompletedEvents(game, [outcome('a'), outcome('b'), outcome('c')]);
    expect(events).toHaveLength(3);
    for (const ev of events) expect(ev.properties.player_count).toBe(3);
  });
});
