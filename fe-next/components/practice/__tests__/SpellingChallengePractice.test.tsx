import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    ({ children, initial, animate, exit, transition, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )
  );
  MockMotionDiv.displayName = 'MockMotionDiv';

  return {
    m: {
      div: MockMotionDiv,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: ({
    correct,
    total,
    onRestart,
    onBack,
  }: {
    correct: number;
    total: number;
    onRestart: () => void;
    onBack: () => void;
  }) => (
    <div data-testid="practice-results-card">
      <div data-testid="results-score">{correct} / {total}</div>
      <button onClick={onRestart} data-testid="restart-button">Try Again</button>
      <button onClick={onBack} data-testid="back-button">Back</button>
    </div>
  ),
}));

describe('SpellingChallengePractice', () => {
  const mockWords: VocabularyWord[] = [
    { word: 'cat', definition: 'A small furry pet', canIntegrate: true },
    { word: 'book', definition: 'For reading stories', canIntegrate: true },
    { word: 'apple', definition: 'A round fruit', canIntegrate: true },
  ];

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

  describe('rendering', () => {
    it('should render definition card and input', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('definition-card')).toBeInTheDocument();
      expect(screen.getByTestId('spelling-input')).toBeInTheDocument();
      expect(screen.getByTestId('hint-display')).toBeInTheDocument();
    });

    it('should show progress counter', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('progress-text')).toHaveTextContent('0 / 3');
    });

    it('should show back button', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByLabelText('common.back');
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('should show hint button', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('hint-button')).toBeInTheDocument();
    });
  });

  describe('answer submission', () => {
    it('should show correct feedback on right answer', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Words sorted by length: cat (3), book (4), apple (5)
      // First word is 'cat'
      const input = screen.getByTestId('spelling-input');
      fireEvent.change(input, { target: { value: 'cat' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByTestId('feedback-display')).toBeInTheDocument();
      expect(screen.getByText('education.practice.correct')).toBeInTheDocument();
    });

    it('should show incorrect feedback with correct answer', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const input = screen.getByTestId('spelling-input');
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.submit(input.closest('form')!);

      expect(screen.getByTestId('feedback-display')).toBeInTheDocument();
      expect(screen.getByText('education.practice.incorrect')).toBeInTheDocument();
      // Should show the correct word
      expect(screen.getByText('cat')).toBeInTheDocument();
    });

    it('should clear input after submission', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const input = screen.getByTestId('spelling-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'cat' } });
      fireEvent.submit(input.closest('form')!);

      expect(input.value).toBe('');
    });

    it('should disable input during feedback', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const input = screen.getByTestId('spelling-input') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'cat' } });
      fireEvent.submit(input.closest('form')!);

      expect(input).toBeDisabled();
    });
  });

  describe('auto-advance', () => {
    it('should advance to next word after correct answer delay', async () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const firstDefinition = screen.getByTestId('definition-card').textContent;

      const input = screen.getByTestId('spelling-input');
      fireEvent.change(input, { target: { value: 'cat' } });
      fireEvent.submit(input.closest('form')!);

      // After 1s delay for correct answer
      act(() => { vi.advanceTimersByTime(1100); });

      await waitFor(() => {
        const newDefinition = screen.getByTestId('definition-card').textContent;
        expect(newDefinition).not.toBe(firstDefinition);
      });
    });
  });

  describe('hint system', () => {
    it('should reveal more letters when hint button is clicked', () => {
      render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const hintDisplay = screen.getByTestId('hint-display');
      // Initially shows first letter of 'cat' = 'c'
      expect(hintDisplay).toHaveTextContent('c');

      // Click hint to reveal more
      fireEvent.click(screen.getByTestId('hint-button'));

      // Should show 'ca' now
      expect(hintDisplay).toHaveTextContent('ca');
    });
  });

  describe('RTL support', () => {
    it('should have dir attribute from language context', () => {
      const { container } = render(
        <SpellingChallengePractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('edge cases', () => {
    it('should handle empty words array', () => {
      render(
        <SpellingChallengePractice
          words={[]}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByTestId('progress-text')).toHaveTextContent('0 / 0');
    });
  });
});
