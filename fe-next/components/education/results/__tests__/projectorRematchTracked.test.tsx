/**
 * The projector's rematch is the teacher's REAL play-again path (a classroom
 * host is forced onto the projector), so it is the tap the replay funnel has to
 * count. Same event as the teacher card and the student phone.
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: vi.fn(),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '/sounds/education-round-win.mp3',
  CLASS_SWEEP_SOUND: '/sounds/education-class-sweep.mp3',
}));
const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));

import { ClassroomTvResults } from '../ClassroomTvResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

const summary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Unit 3'],
  lessonIds: ['lesson-1'],
  totalWords: 2,
  classFoundCount: 1,
  coverage: [
    { word: 'atom', foundBy: ['Maya'] },
    { word: 'quark', foundBy: [] },
  ],
  missedWords: ['quark'],
  masteryByPlayer: { Maya: { found: 1, total: 2 } },
  podium: [{ username: 'Maya', score: 90, rank: 1 }],
} as ClassroomSummary;

describe('projector rematch', () => {
  afterEach(cleanup);

  it('restarts in one tap and counts it as a projector rematch', async () => {
    const onRematch = vi.fn();
    render(<ClassroomTvResults summary={summary} onRematch={onRematch} t={(k) => k} />);
    await userEvent.setup().click(screen.getByTestId('classroom-tv-rematch'));
    expect(onRematch).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('results_primary_action_clicked', {
      action: 'rematch',
      surface: 'projector',
    });
  });
});
