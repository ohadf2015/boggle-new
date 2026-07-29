import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimedBlitzPractice } from '../TimedBlitzPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    (
      {
        children,
        initial,
        animate,
        exit,
        transition,
        whileHover,
        whileTap,
        ...props
      }: any,
      ref: any
    ) => <div ref={ref} {...props}>{children}</div>
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  const MockMotionSpan = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <span ref={ref} {...props}>{children}</span>
  ));
  MockMotionSpan.displayName = 'MockMotionSpan';

  return {
    m: {
      div: MockMotionDiv,
      span: MockMotionSpan,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('../../CircularTimer', () => ({
  __esModule: true,
  default: ({ remainingTime }: { remainingTime: number }) => (
    <div data-testid="circular-timer">{remainingTime}s</div>
  ),
}));

vi.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: ({
    correct,
    total,
    xpEarned,
    onRestart,
    onBack,
  }: {
    correct: number;
    total: number;
    xpEarned?: number;
    onRestart: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="practice-results-card">
      <div data-testid="results-score">{correct} / {total}</div>
      <div data-testid="results-xp">{xpEarned} XP</div>
      <button onClick={onRestart} data-testid="restart-button">Try Again</button>
      <button onClick={onBack} data-testid="back-button">Back</button>
    </div>
  ),
}));

// Mock words for testing
const mockWords: VocabularyWord[] = [
  { word: 'apple', definition: 'A red fruit', canIntegrate: true },
  { word: 'banana', definition: 'A yellow fruit', canIntegrate: true },
  { word: 'cherry', definition: 'A small red fruit', canIntegrate: true },
];

describe('TimedBlitzPractice', () => {
  const mockOnComplete = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // Countdown uses chained setTimeouts (3→2→1→playing).
  // Each step needs its own act() to flush React state updates
  // before the next setTimeout can be scheduled.
  function advanceThroughCountdown() {
    act(() => { vi.advanceTimersByTime(1100); }); // 3 → 2
    act(() => { vi.advanceTimersByTime(1100); }); // 2 → 1
    act(() => { vi.advanceTimersByTime(1100); }); // 1 → playing
  }

  describe('countdown phase', () => {
    it('should show 3-2-1 countdown before game starts', async () => {
      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Should start with countdown
      expect(screen.getByTestId('countdown-phase')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      // After 1 second, show 2
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      // After 2 seconds, show 1
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });

      // After 3 seconds, game starts
      act(() => {
        vi.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('countdown-phase')).not.toBeInTheDocument();
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });
    });
  });

  describe('playing phase', () => {
    it('should show timer, combo, definition, and input', async () => {
      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Should show timer
      expect(screen.getByTestId('circular-timer')).toBeInTheDocument();

      // Should show combo display
      expect(screen.getByTestId('combo-display')).toBeInTheDocument();

      // Should show definition card
      expect(screen.getByTestId('definition-card')).toBeInTheDocument();

      // Should show input
      expect(screen.getByTestId('word-input')).toBeInTheDocument();

      // Should show score
      expect(screen.getByTestId('score-display')).toBeInTheDocument();
    });

    it('should accept input and submit on Enter', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      const input = screen.getByTestId('word-input');
      const firstDefinition = screen.getByTestId('definition-card').textContent;

      // Find the corresponding word for this definition
      const word = mockWords.find(w => firstDefinition?.includes(w.definition!))?.word;

      // Type the correct word
      await user.type(input, `${word}{Enter}`);

      // Combo should increment
      await waitFor(() => {
        expect(screen.getByTestId('combo-display')).toHaveTextContent('1');
      });

      // Score should increment
      await waitFor(() => {
        const scoreText = screen.getByTestId('score-display').textContent || '';
        expect(parseInt(scoreText)).toBeGreaterThan(0);
      });
    });

    it('should show combo badge with flame icon', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Get correct answer
      const firstDefinition = screen.getByTestId('definition-card').textContent;
      const word = mockWords.find(w => firstDefinition?.includes(w.definition!))?.word;
      const input = screen.getByTestId('word-input');

      // Submit correct answer
      await user.type(input, `${word}{Enter}`);

      // Combo badge should appear
      await waitFor(() => {
        const comboBadge = screen.getByTestId('combo-badge');
        expect(comboBadge).toBeInTheDocument();
        expect(comboBadge).toHaveTextContent('1');
      });
    });

    it('should reset combo on incorrect answer', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      const input = screen.getByTestId('word-input');

      // First, build a combo
      for (let i = 0; i < 2; i++) {
        const definition = screen.getByTestId('definition-card').textContent;
        const word = mockWords.find(w => definition?.includes(w.definition!))?.word;
        await user.clear(input);
        await user.type(input, `${word}{Enter}`);
      }

      // Verify combo is 2
      await waitFor(() => {
        expect(screen.getByTestId('combo-display')).toHaveTextContent('2');
      });

      // Submit wrong answer
      await user.clear(input);
      await user.type(input, 'wrongword{Enter}');

      // Combo should reset — badge disappears when combo is 0
      await waitFor(() => {
        expect(screen.queryByTestId('combo-badge')).not.toBeInTheDocument();
      });
    });

    it('should immediately move to next word without pause', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      const input = screen.getByTestId('word-input');
      const firstDefinition = screen.getByTestId('definition-card').textContent;

      // Submit any answer
      await user.type(input, 'test{Enter}');

      // Definition should change immediately (no pause)
      await waitFor(() => {
        const newDefinition = screen.getByTestId('definition-card').textContent;
        expect(newDefinition).not.toBe(firstDefinition);
      });
    });

    it('should clear input after submission', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      const input = screen.getByTestId('word-input') as HTMLInputElement;

      // Type and submit
      await user.type(input, 'test{Enter}');

      // Input should be cleared
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });
  });

  describe('timer urgency', () => {
    it('should add urgency styling at 20 seconds', async () => {
      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Advance to 41 seconds (19 remaining)
      act(() => {
        vi.advanceTimersByTime(41500);
      });

      // Should have urgency styling
      await waitFor(() => {
        const playingPhase = screen.getByTestId('playing-phase');
        expect(playingPhase).toHaveClass('urgency-pulse');
      });
    });

    it('should add red tint at 10 seconds', async () => {
      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Advance to 51 seconds (9 remaining)
      act(() => {
        vi.advanceTimersByTime(51500);
      });

      // Should have red tint styling
      await waitFor(() => {
        const playingPhase = screen.getByTestId('playing-phase');
        expect(playingPhase).toHaveClass('urgency-red');
      });
    });
  });

  describe('game over', () => {
    it('should show results when timer reaches 0', async () => {
      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Advance time to end of game (61 seconds + buffer)
      act(() => {
        vi.advanceTimersByTime(61500);
      });

      // Should show TIME'S UP
      await waitFor(() => {
        expect(screen.getByTestId('times-up')).toBeInTheDocument();
      });

      // After brief animation, show results
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByTestId('practice-results-card')).toBeInTheDocument();
      });
    });

    it('should remove playing UI after time up', async () => {
      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Advance time to end of game (61 seconds + buffer)
      act(() => {
        vi.advanceTimersByTime(61500);
      });

      await waitFor(() => {
        expect(screen.getByTestId('times-up')).toBeInTheDocument();
      });

      // Playing phase (with input) should be gone — replaced by TIME'S UP screen
      expect(screen.queryByTestId('playing-phase')).not.toBeInTheDocument();
      expect(screen.queryByTestId('word-input')).not.toBeInTheDocument();
    });

    it('should show results with correct stats', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Answer 2 words correctly
      const input = screen.getByTestId('word-input');
      for (let i = 0; i < 2; i++) {
        const definition = screen.getByTestId('definition-card').textContent;
        const word = mockWords.find(w => definition?.includes(w.definition!))?.word;
        await user.clear(input);
        await user.type(input, `${word}{Enter}`);
      }

      // End game
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      // Skip TIME'S UP animation
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Should show results with 2 correct
      await waitFor(() => {
        const resultsCard = screen.getByTestId('practice-results-card');
        expect(resultsCard).toBeInTheDocument();
        // Results show correct/total (2 correct out of 2 attempted)
        expect(screen.getByTestId('results-score')).toHaveTextContent('2 / 2');
      });
    });

    it('should call onComplete with results', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Skip countdown (3 steps, each needing its own act flush)
      advanceThroughCountdown();

      await waitFor(() => {
        expect(screen.getByTestId('playing-phase')).toBeInTheDocument();
      });

      // Answer 1 word
      const input = screen.getByTestId('word-input');
      const definition = screen.getByTestId('definition-card').textContent;
      const word = mockWords.find(w => definition?.includes(w.definition!))?.word;
      await user.type(input, `${word}{Enter}`);

      // End game
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      // Skip TIME'S UP
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // onComplete should be called with results
      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            wordsFound: 1,
            combo: expect.any(Number),
            score: expect.any(Number),
          })
        );
      });
    });
  });

  describe('restart and back actions', () => {
    it('should restart game when clicking Try Again', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Complete countdown and game
      advanceThroughCountdown();
      act(() => {
        vi.advanceTimersByTime(61000);
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByTestId('practice-results-card')).toBeInTheDocument();
      });

      // Click Try Again
      const restartButton = screen.getByTestId('restart-button');
      await user.click(restartButton);

      // Should restart with countdown
      await waitFor(() => {
        expect(screen.getByTestId('countdown-phase')).toBeInTheDocument();
      });
    });

    it('should call onBack when clicking Back', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <TimedBlitzPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Complete countdown and game
      advanceThroughCountdown();
      act(() => {
        vi.advanceTimersByTime(61000);
      });
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      await waitFor(() => {
        expect(screen.getByTestId('practice-results-card')).toBeInTheDocument();
      });

      // Click Back
      const backButton = screen.getByTestId('back-button');
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty words array', () => {
      render(
        <TimedBlitzPractice
          words={[]}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Should render without crashing
      expect(screen.getByTestId('countdown-phase')).toBeInTheDocument();
    });
  });
});
