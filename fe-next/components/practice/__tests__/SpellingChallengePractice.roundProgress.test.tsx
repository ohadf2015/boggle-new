import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'eduStudent.practice.praise' ? 'Nailed it!|Spot on!' : key),
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
    footer,
  }: {
    correct: number;
    total: number;
    onRestart: () => void;
    onBack: () => void;
    footer?: React.ReactNode;
  }) => (
    <div data-testid="practice-results-card">
      {footer}
      <div data-testid="results-score">{correct} / {total}</div>
      <button onClick={onRestart} data-testid="restart-button">Try Again</button>
      <button onClick={onBack} data-testid="back-button">Back</button>
    </div>
  ),
}));

describe('SpellingChallengePractice - a round you can see filling up, and a second go at the misses', () => {
  const words: VocabularyWord[] = [
    { word: 'cat', definition: 'A small furry pet', canIntegrate: true },
    { word: 'book', definition: 'For reading stories', canIntegrate: true },
    { word: 'apple', definition: 'A red fruit', canIntegrate: true },
  ];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const answer = (value: string) => {
    const input = screen.getByTestId('spelling-input');
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(input.closest('form')!);
  };
  const pips = () =>
    Array.from(screen.getByTestId('practice-progress-track').children).map((el) => el.getAttribute('data-state'));

  it('Given answers, Then each pip turns hit or miss and the next one is current', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    expect(pips()).toEqual(['current', 'todo', 'todo']);
    answer('cat');
    act(() => { vi.advanceTimersByTime(1100); });
    expect(pips()).toEqual(['hit', 'current', 'todo']);
    answer('bok');
    expect(pips()).toEqual(['hit', 'miss', 'todo']);
  });

  it('Given a right answer, Then the verdict cheers with a line from the praise list', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    answer('cat');
    expect(screen.getByTestId('feedback-display')).toHaveTextContent('Nailed it!');
  });

  it('Given misses, Then the results list them and "practice these" replays only those words', () => {
    render(<SpellingChallengePractice words={words} onComplete={vi.fn()} onBack={vi.fn()} />);
    answer('cat');
    act(() => { vi.advanceTimersByTime(1100); });
    answer('bok');
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.practice.next' }));
    answer('apple');
    act(() => { vi.advanceTimersByTime(1100); });
    act(() => { vi.advanceTimersByTime(600); });
    const missed = screen.getByTestId('spelling-missed');
    expect(missed).toHaveTextContent('book');
    expect(missed).not.toHaveTextContent('apple');
    fireEvent.click(screen.getByTestId('spelling-retry-missed'));
    expect(screen.getByTestId('progress-text')).toHaveTextContent('0 / 1');
    expect(screen.getByTestId('definition-card')).toHaveTextContent('For reading stories');
  });

  it('Given a perfect round, Then there is no missed list', () => {
    render(<SpellingChallengePractice words={words.slice(0, 1)} onComplete={vi.fn()} onBack={vi.fn()} />);
    answer('cat');
    act(() => { vi.advanceTimersByTime(1100); });
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.getByTestId('practice-results-card')).toBeInTheDocument();
    expect(screen.queryByTestId('spelling-missed')).toBeNull();
  });
});
