/**
 * "+40 vs last round" is the line that makes a student want round three.
 *
 * A placing only rewards the same three children every round. A DELTA rewards
 * everyone who improved, which in a classroom is most of the room — and it is
 * the one number a child who came seventh can be proud of out loud.
 *
 * The rules it must never break: round one claims nothing, a drop is shown
 * honestly rather than hidden, and a personal best is only ever a real one.
 */

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { StudentRoundOutcome } from '../StudentRoundOutcome';
import type { RoundMomentum } from '@/lib/education/roundEndHistory';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const standings = [
  { username: 'Maya', score: 140 },
  { username: 'Noa', score: 100 },
  { username: 'Eitan', score: 60 },
];

const momentum = (over: Partial<RoundMomentum> = {}): RoundMomentum => ({
  roundNumber: 2,
  delta: 40,
  rankDelta: 0,
  personalBest: false,
  ...over,
});

const outcome = (props: Record<string, unknown> = {}) => (
  <StudentRoundOutcome username="Noa" standings={standings} t={t} {...props} />
);

describe('StudentRoundOutcome — momentum', () => {
  afterEach(cleanup);

  it('claims nothing in round one', () => {
    render(outcome());
    expect(screen.queryByTestId('student-outcome-delta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('student-outcome-round')).not.toBeInTheDocument();
  });

  it('reads out the points gained since the last round', () => {
    render(outcome({ momentum: momentum({ delta: 40 }) }));
    expect(screen.getByTestId('student-outcome-delta')).toHaveTextContent('40');
    expect(screen.getByTestId('student-outcome-delta')).toHaveTextContent('deltaUp');
  });

  it('is honest about a round that went backwards', () => {
    render(outcome({ momentum: momentum({ delta: -25 }) }));
    expect(screen.getByTestId('student-outcome-delta')).toHaveTextContent('deltaDown');
    // The number is shown as a size, not as a minus sign to decode.
    expect(screen.getByTestId('student-outcome-delta')).toHaveTextContent('25');
  });

  it('says so plainly when a round matched the last one', () => {
    render(outcome({ momentum: momentum({ delta: 0 }) }));
    expect(screen.getByTestId('student-outcome-delta')).toHaveTextContent('deltaSame');
  });

  it('crowns a personal best', () => {
    render(outcome({ momentum: momentum({ personalBest: true }) }));
    expect(screen.getByTestId('student-outcome-best')).toBeInTheDocument();
  });

  it('does not crown a round that merely improved', () => {
    render(outcome({ momentum: momentum({ personalBest: false }) }));
    expect(screen.queryByTestId('student-outcome-best')).not.toBeInTheDocument();
  });

  it('counts the round out so a rematch feels like a session', () => {
    render(outcome({ momentum: momentum({ roundNumber: 3 }) }));
    expect(screen.getByTestId('student-outcome-round')).toHaveTextContent('3');
  });

  it('celebrates a climb in placing for a student who still did not win', () => {
    render(outcome({ momentum: momentum({ rankDelta: 3 }) }));
    expect(screen.getByTestId('student-outcome-climb')).toHaveTextContent('3');
  });

  it('shows no climb chip for a slip', () => {
    render(outcome({ momentum: momentum({ rankDelta: -2 }) }));
    expect(screen.queryByTestId('student-outcome-climb')).not.toBeInTheDocument();
  });

  it('still says nothing when the student was never ranked', () => {
    const { container } = render(
      outcome({ username: 'Spectator', momentum: momentum() })
    );
    expect(container).toBeEmptyDOMElement();
  });
});
