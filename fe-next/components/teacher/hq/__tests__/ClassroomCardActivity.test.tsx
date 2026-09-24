/**
 * The Classes tab card's "what happened / what next" strip, read from the same
 * class pulse the HQ Tools sheet uses (one judgement, one source).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const pulse = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, b?: unknown) => {
      const params = (typeof a === 'object' && a !== null ? a : b) as Record<string, unknown> | undefined;
      return params ? `${k}:${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
}));
vi.mock('@/hooks/useClassPulse', () => ({ useClassPulse: () => pulse() }));

import { ClassroomCardActivity } from '../ClassroomCardActivity';

const base = {
  state: 'ready',
  nextAction: 'playAgain',
  rosterCount: 3,
  playedCount: 3,
  gameRosterCount: 3,
  absentCount: 0,
  averageAccuracyPct: 78,
  gameMode: 'vocab-quiz',
  daysSinceLastGame: 2,
  struggling: [],
  strugglingCount: 0,
  topMissedWords: [],
};

describe('<ClassroomCardActivity>', () => {
  beforeEach(() => {
    pulse.mockReturnValue({ pulse: base, isLoading: false, error: null, refresh: vi.fn() });
  });

  it('Given a recent game, Then it says when and how well, and what to do next', () => {
    render(<ClassroomCardActivity classroomId="c1" rosterCount={3} />);
    expect(screen.getByTestId('classroom-card-last')).toHaveTextContent('teacher.pulse.lastPlayedDays');
    expect(screen.getByTestId('classroom-card-last')).toHaveTextContent('"days":2');
    expect(screen.getByTestId('classroom-card-next')).toHaveTextContent('teacher.pulse.action.playAgain');
  });

  it('Given missed words, Then the next step names them', () => {
    pulse.mockReturnValue({
      pulse: { ...base, state: 'needsReview', nextAction: 'review', topMissedWords: ['osmosis', 'mitosis'] },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<ClassroomCardActivity classroomId="c1" rosterCount={3} />);
    expect(screen.getByTestId('classroom-card-next')).toHaveTextContent('osmosis, mitosis');
  });

  it('Given a class that never played, Then it says so rather than a fake date', () => {
    pulse.mockReturnValue({
      pulse: { ...base, state: 'neverPlayed', nextAction: 'play', daysSinceLastGame: null, averageAccuracyPct: null },
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    render(<ClassroomCardActivity classroomId="c1" rosterCount={3} />);
    expect(screen.getByTestId('classroom-card-last')).toHaveTextContent('teacher.pulse.state.neverPlayed');
    expect(screen.getByTestId('classroom-card-next')).toHaveTextContent('teacher.pulse.action.play');
  });

  it('Given the read is still open, Then it claims nothing yet', () => {
    pulse.mockReturnValue({ pulse: { ...base, state: 'neverPlayed' }, isLoading: true, error: null, refresh: vi.fn() });
    render(<ClassroomCardActivity classroomId="c1" rosterCount={3} />);
    expect(screen.getByTestId('classroom-card-last')).toHaveTextContent('teacher.pulse.state.loading');
    expect(screen.getByTestId('classroom-card-last')).not.toHaveTextContent('neverPlayed');
  });
});
