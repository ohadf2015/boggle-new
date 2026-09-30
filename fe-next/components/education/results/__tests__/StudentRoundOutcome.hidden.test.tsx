/**
 * The calm dial (leaderboard: hidden) turns every results surface before the
 * teacher's final reveal into "your own numbers, nobody's placing". The quiz
 * end screen passes `hideClassPosition`; the classroom final recap does not —
 * that screen IS the reveal the dial promised.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StudentRoundOutcome } from '../StudentRoundOutcome';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const standings = [
  { username: 'Maya', score: 240 },
  { username: 'Noa', score: 200 },
  { username: 'Eitan', score: 90 },
  { username: 'Dana', score: 40 },
];

const mastery = { found: 3, total: 4 };

describe('StudentRoundOutcome — hideClassPosition (leaderboard hidden)', () => {
  it('shows the own score and words but no placing', () => {
    render(
      <StudentRoundOutcome username="Noa" standings={standings} mastery={mastery} hideClassPosition t={t} />
    );
    const card = screen.getByTestId('student-round-outcome');
    expect(card).toHaveTextContent('200');
    expect(screen.getByTestId('student-outcome-words')).toBeInTheDocument();
    expect(card.dataset.rank).toBeUndefined();
  });

  it('never prints a rank, a win, a beaten count, or the gap to the next player', () => {
    render(
      <StudentRoundOutcome username="Maya" standings={standings} mastery={mastery} hideClassPosition t={t} />
    );
    expect(screen.queryByTestId('student-outcome-beat')).toBeNull();
    expect(screen.queryByTestId('student-outcome-gap')).toBeNull();
    const headline = screen.getByTestId('student-outcome-headline');
    expect(headline).toHaveTextContent('education.results.you.roundComplete');
    expect(screen.getByTestId('student-round-outcome')).not.toHaveTextContent('you.won');
  });

  it('keeps self-referential momentum but drops the rank climb chip', () => {
    const momentum = {
      delta: 30,
      personalBest: true,
      rankDelta: 2,
      roundNumber: 2,
      previousScore: 170,
      previousRank: 4,
    };
    render(
      <StudentRoundOutcome
        username="Noa"
        standings={standings}
        mastery={mastery}
        momentum={momentum}
        hideClassPosition
        t={t}
      />
    );
    expect(screen.getByTestId('student-outcome-delta')).toBeInTheDocument();
    expect(screen.getByTestId('student-outcome-best')).toBeInTheDocument();
    expect(screen.getByTestId('student-outcome-round')).toBeInTheDocument();
    expect(screen.queryByTestId('student-outcome-climb')).toBeNull();
  });
});
