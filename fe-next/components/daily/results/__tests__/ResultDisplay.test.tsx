/**
 * ResultDisplay Component Tests
 *
 * Tests for the Speedometer Gauge hero section in WordHunt daily challenge results.
 * Verifies scoring, eye toggle behavior, win/fail states.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultDisplay } from '../ResultDisplay';
import { getScoreBreakdown } from '@/utils/aiHintGenerator';
import { RON_PRANK_USER_ID } from '@/utils/dailyChallenge/ronPrank';

// Mock framer-motion to render immediately
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileTap, exit, variants, whileHover, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    span: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileTap, exit, variants, whileHover, ...rest } = props;
      return <span {...rest}>{children}</span>;
    },
  },
}));

vi.mock('@/hooks/useCountUp', () => ({
  useCountUp: ({ target }: { target: number }) => target,
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

vi.mock('@/shared/utils/wordNormalization', () => ({
  applyHebrewFinalLetters: (w: string) => w,
}));

// Mock ScoreGaugeRing to avoid SVG rendering complexity
vi.mock('../ScoreGaugeRing', () => ({
  ScoreGaugeRing: (props: any) => (
    <div data-testid="score-gauge-ring" data-score={props.score} data-max={props.maxScore}>
      {props.showScore !== false && <span data-testid="gauge-score">{props.score}</span>}
    </div>
  ),
}));

describe('ResultDisplay Score Calculation', () => {
  describe('getScoreBreakdown', () => {
    it('should return 0 for unsolved puzzles', () => {
      const breakdown = getScoreBreakdown(100, 1, 20, false);
      expect(breakdown.total).toBe(0);
      expect(breakdown.speed).toBe(0);
      expect(breakdown.accuracy).toBe(0);
      expect(breakdown.exploration).toBe(0);
    });

    it('should calculate all components for solved puzzles', () => {
      // Perfect game: 100 life, 1 guess, 20 words
      const breakdown = getScoreBreakdown(100, 1, 20, true);
      expect(breakdown.speed).toBe(400);       // 100 * 4 = 400
      expect(breakdown.accuracy).toBe(400);    // 400 - (1-1) * 40 = 400
      expect(breakdown.exploration).toBe(200); // 20 * 10 = 200
      expect(breakdown.total).toBe(1000);
    });

    it('should calculate correct accuracy score for multiple guesses', () => {
      // 7 guesses: 400 - (7-1) * 40 = 400 - 240 = 160
      const breakdown = getScoreBreakdown(50, 7, 10, true);
      expect(breakdown.accuracy).toBe(160);
    });

    it('should NOT return accuracy score alone when other params are missing', () => {
      const breakdown = getScoreBreakdown(0, 7, 0, true);
      expect(breakdown.speed).toBe(0);
      expect(breakdown.exploration).toBe(0);
      expect(breakdown.accuracy).toBe(160);
      expect(breakdown.total).toBe(160);
    });

    it('should calculate total as sum of all components', () => {
      const breakdown = getScoreBreakdown(50, 3, 15, true);
      expect(breakdown.speed).toBe(200);
      expect(breakdown.accuracy).toBe(320);
      expect(breakdown.exploration).toBe(150);
      expect(breakdown.total).toBe(670);
    });
  });
});

describe('ResultDisplay Props Requirements', () => {
  it('should require lifeRemaining for accurate speed score', () => {
    const withLife = getScoreBreakdown(50, 3, 10, true);
    const withoutLife = getScoreBreakdown(0, 3, 10, true);

    expect(withLife.speed).toBe(200);
    expect(withoutLife.speed).toBe(0);
    expect(withLife.total).toBeGreaterThan(withoutLife.total);
  });

  it('exploration = max(word points, fast-solve floor)', () => {
    // Past the efficiency floor (6+ guesses) words drive exploration as before.
    expect(getScoreBreakdown(50, 6, 10, true).exploration).toBe(100);
    expect(getScoreBreakdown(50, 6, 0, true).exploration).toBe(0);
    expect(getScoreBreakdown(50, 6, 10, true).total)
      .toBeGreaterThan(getScoreBreakdown(50, 6, 0, true).total);
    // A fast clean solve floors exploration even with no words farmed.
    expect(getScoreBreakdown(50, 1, 0, true).exploration).toBe(200);
    expect(getScoreBreakdown(50, 3, 0, true).exploration).toBe(100);
  });
});

const mockT = (key: string) => key;

describe('ResultDisplay Component', () => {
  const solvedProps = {
    solved: true,
    attemptsUsed: 3,
    targetWord: 'HELLO',
    streakDays: 5,
    language: 'en' as const,
    puzzleNumber: 42,
    countdown: '12:34:56',
    lifeRemaining: 60,
    wordsDiscovered: 8,
    t: mockT,
  };

  describe('Win state', () => {
    it('renders the gauge ring-3 for solved puzzle', () => {
      render(<ResultDisplay {...solvedProps} />);
      expect(screen.getByTestId('score-gauge-ring')).toBeInTheDocument();
    });

    it('shows target word by default', () => {
      render(<ResultDisplay {...solvedProps} targetWord="CAT" />);
      // Word is visible by default
      expect(screen.getByTestId('letter-C')).toBeInTheDocument();
      expect(screen.getByTestId('letter-A')).toBeInTheDocument();
      expect(screen.getByTestId('letter-T')).toBeInTheDocument();
    });

    it('hides target word letters when eye toggle is clicked', () => {
      render(<ResultDisplay {...solvedProps} targetWord="CAT" />);
      const toggle = screen.getByTestId('word-visibility-toggle');
      fireEvent.click(toggle);
      // Word is now hidden
      expect(screen.queryByTestId('letter-C')).not.toBeInTheDocument();
      const questionMarks = screen.getAllByText('?');
      expect(questionMarks.length).toBe(3);
    });

    it('renders puzzle number in header', () => {
      render(<ResultDisplay {...solvedProps} />);
      expect(screen.getByText('daily.puzzleNumber')).toBeInTheDocument();
    });

    it('renders streak badge when streak > 0', () => {
      render(<ResultDisplay {...solvedProps} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('does not render streak badge when streak is 0', () => {
      render(<ResultDisplay {...solvedProps} streakDays={0} />);
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('renders countdown', () => {
      render(<ResultDisplay {...solvedProps} />);
      expect(screen.getByText('12:34:56')).toBeInTheDocument();
    });

    it('renders score breakdown chips', () => {
      render(<ResultDisplay {...solvedProps} />);
      // getScoreBreakdown(60, 3, 8, true): speed=240, accuracy=320,
      // exploration=max(80, fast-solve floor 100)=100
      expect(screen.getByText(/\+240/)).toBeInTheDocument();
      expect(screen.getByText(/\+320/)).toBeInTheDocument();
      expect(screen.getByText(/\+100/)).toBeInTheDocument();
    });
  });

  describe('Score-tier badge (keyed to score %, not attempts)', () => {
    it('shows the top tier only for a near-perfect score', () => {
      // life 100, 1 attempt, 20 words → total 1000 (100%) → legendary
      render(<ResultDisplay {...solvedProps} attemptsUsed={1} lifeRemaining={100} wordsDiscovered={20} />);
      expect(screen.getByTestId('score-tier-legendary')).toBeInTheDocument();
      expect(screen.getByText('wordHunt.results.scoreTierLegendary')).toBeInTheDocument();
    });

    it('regression: a sub-50% score does NOT get top praise even in few attempts', () => {
      // life 15 (60), 3 attempts (320 accuracy), 0 words (fast-solve floor 100)
      // → total 480 (48%) → rising. Tier follows score%, not the low attempt count.
      render(<ResultDisplay {...solvedProps} attemptsUsed={3} lifeRemaining={15} wordsDiscovered={0} />);
      expect(screen.getByTestId('score-tier-rising')).toBeInTheDocument();
      expect(screen.queryByTestId('score-tier-legendary')).not.toBeInTheDocument();
      expect(screen.getByText('wordHunt.results.scoreTierRising')).toBeInTheDocument();
    });

    it('still shows attempts used as a secondary detail under the badge', () => {
      render(<ResultDisplay {...solvedProps} attemptsUsed={3} />);
      expect(screen.getByText('3/10')).toBeInTheDocument();
    });
  });

  describe('Ron bonus prank (display-only)', () => {
    it('shows a fake +1,000,000 bonus chip when the player is Ron and solved', () => {
      render(<ResultDisplay {...solvedProps} currentUserId={RON_PRANK_USER_ID} />);
      const chip = screen.getByTestId('ron-bonus-chip');
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveTextContent(/\+1,000,000/);
    });

    it('does NOT show the bonus chip for any other player', () => {
      render(<ResultDisplay {...solvedProps} currentUserId="not-ron-id" />);
      expect(screen.queryByTestId('ron-bonus-chip')).not.toBeInTheDocument();
    });

    it('does NOT show the bonus chip when currentUserId is absent (guests)', () => {
      render(<ResultDisplay {...solvedProps} />);
      expect(screen.queryByTestId('ron-bonus-chip')).not.toBeInTheDocument();
    });

    it('does NOT show the bonus chip in fail state, even for Ron', () => {
      render(<ResultDisplay {...solvedProps} solved={false} currentUserId={RON_PRANK_USER_ID} />);
      expect(screen.queryByTestId('ron-bonus-chip')).not.toBeInTheDocument();
    });

    it('leaves the real score chips unchanged (prank does not alter the real total)', () => {
      render(<ResultDisplay {...solvedProps} currentUserId={RON_PRANK_USER_ID} />);
      // Real breakdown for solvedProps: speed=240, accuracy=320, exploration=100
      expect(screen.getByText(/\+240/)).toBeInTheDocument();
      expect(screen.getByText(/\+320/)).toBeInTheDocument();
      expect(screen.getByText(/\+100/)).toBeInTheDocument();
    });
  });

  describe('Eye toggle', () => {
    it('renders the word visibility toggle button', () => {
      render(<ResultDisplay {...solvedProps} />);
      expect(screen.getByTestId('word-visibility-toggle')).toBeInTheDocument();
    });

    it('shows letters by default', () => {
      render(<ResultDisplay {...solvedProps} />);
      // Letters should be visible by default
      expect(screen.getByTestId('letter-H')).toBeInTheDocument();
    });

    it('hides letters when toggle is clicked', () => {
      render(<ResultDisplay {...solvedProps} />);
      const toggle = screen.getByTestId('word-visibility-toggle');
      fireEvent.click(toggle); // hide
      expect(screen.queryByTestId('letter-H')).not.toBeInTheDocument();
      // Should show ? placeholders (5 for HELLO)
      const questionMarks = screen.getAllByText('?');
      expect(questionMarks.length).toBe(5);
    });

    it('shows letters again when toggle is clicked twice', () => {
      render(<ResultDisplay {...solvedProps} />);
      const toggle = screen.getByTestId('word-visibility-toggle');
      fireEvent.click(toggle); // hide
      fireEvent.click(toggle); // show again
      expect(screen.getByTestId('letter-H')).toBeInTheDocument();
    });
  });

  describe('Fail state', () => {
    const failProps = { ...solvedProps, solved: false };

    it('renders fail state without gauge score', () => {
      render(<ResultDisplay {...failProps} />);
      // Gauge is rendered but with showScore=false
      expect(screen.getByTestId('score-gauge-ring')).toBeInTheDocument();
    });

    it('shows attempts used', () => {
      render(<ResultDisplay {...failProps} />);
      const text = screen.getByText('3');
      expect(text).toBeInTheDocument();
    });

    it('shows countdown in fail state', () => {
      render(<ResultDisplay {...failProps} />);
      expect(screen.getByText('12:34:56')).toBeInTheDocument();
    });

    it('does not show eye toggle in fail state', () => {
      render(<ResultDisplay {...failProps} />);
      expect(screen.queryByTestId('word-visibility-toggle')).not.toBeInTheDocument();
    });
  });
});
