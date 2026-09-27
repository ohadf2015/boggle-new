/**
 * The quiz projector's end screen needs the teacher's ONE loud action.
 *
 * Live capture 2026-09-19: a quiz ended on the wall with only PAUSE / +30S /
 * END ROUND under it — all no-ops on a finished quiz — because a quiz never
 * produces the `classroomSummary` that mounts ClassroomTvResults (where the
 * board rounds' rematch lives). The finale takes the same restart the board
 * rematch uses (host `handleStartNewGame`: same room, same code, same mode).
 */
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('@/utils/confettiUtils', () => ({ fireVictoryConfetti: vi.fn() }));
vi.mock('@/components/ui/InteractiveMascot', () => ({ InteractiveMascot: () => null }));
const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));

import { VocabQuizFinale } from '../VocabQuizFinale';

const standings = [
  { username: 'Noam', score: 280, correctCount: 2, bestStreak: 1 },
  { username: 'Maya', score: 135, correctCount: 1, bestStreak: 1 },
] as never;

describe('VocabQuizFinale — play again', () => {
  afterEach(cleanup);

  it('restarts the same quiz in one tap and counts it', async () => {
    const onPlayAgain = vi.fn();
    render(<VocabQuizFinale standings={standings} totalQuestions={10} onPlayAgain={onPlayAgain} t={(k) => k} />);
    const btn = screen.getByTestId('quiz-finale-play-again');
    expect(btn.className).toContain('bg-neo-yellow');
    await userEvent.setup().click(btn);
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('results_primary_action_clicked', {
      action: 'rematch',
      surface: 'projector',
    });
  });

  it('shows no dead button when nothing can restart the room', () => {
    render(<VocabQuizFinale standings={standings} totalQuestions={10} t={(k) => k} />);
    expect(screen.queryByTestId('quiz-finale-play-again')).toBeNull();
  });
});
