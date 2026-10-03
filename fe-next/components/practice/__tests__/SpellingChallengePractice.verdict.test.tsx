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

describe('SpellingChallengePractice - every answer gets a verdict before moving on', () => {
  const words: VocabularyWord[] = [
    { word: 'cat', definition: 'A small furry pet', canIntegrate: true },
    { word: 'book', definition: 'For reading stories', canIntegrate: true },
  ];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const answer = (value: string) => {
    const input = screen.getByTestId('spelling-input');
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(input.closest('form')!);
  };

  it('Given a wrong answer, Then the verdict and the right spelling stay up until the student taps Next', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    const first = screen.getByTestId('definition-card').textContent;
    answer('kat');
    act(() => { vi.advanceTimersByTime(6000); });
    expect(screen.getByTestId('feedback-display')).toBeInTheDocument();
    expect(screen.getByTestId('definition-card').textContent).toBe(first);
    expect(screen.getByText('eduStudent.practice.answerIs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.practice.next' }));
    expect(screen.getByTestId('definition-card').textContent).not.toBe(first);
    expect(screen.queryByTestId('feedback-display')).toBeNull();
  });

  it('Given a right answer, Then a big verdict covers the answer zone and no Next tap is needed', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    answer('cat');
    const verdict = screen.getByTestId('feedback-display');
    expect(screen.getByTestId('spelling-answer-zone')).toContainElement(verdict);
    expect(verdict.className).toContain('absolute');
    expect(screen.queryByRole('button', { name: 'eduStudent.practice.next' })).toBeNull();
  });

  it('labels the last Next as the way to results', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    answer('cat');
    act(() => { vi.advanceTimersByTime(1100); });
    answer('bok');
    expect(screen.getByRole('button', { name: 'eduStudent.practice.finish' })).toBeInTheDocument();
  });
});
