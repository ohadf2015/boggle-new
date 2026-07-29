import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: ({ word }: { word: string }) => (
    <button data-testid="pronunciation-btn" data-word={word}>
      🔊
    </button>
  ),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockMotionDiv = React.forwardRef(
    ({ children, ...props }: any, ref: any) => (
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
  default: ({ onRestart, onBack }: { onRestart: () => void; onBack: () => void }) => (
    <div data-testid="practice-results-card">
      <button onClick={onRestart}>Try Again</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

const mockWords: VocabularyWord[] = [
  { word: 'cat', definition: 'A small furry pet', canIntegrate: true },
  { word: 'book', definition: 'For reading stories', canIntegrate: true },
];

describe('SpellingChallengePractice - PronunciationButton', () => {
  it('renders a PronunciationButton in the hint area', () => {
    render(
      <SpellingChallengePractice
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByTestId('pronunciation-btn')).toBeInTheDocument();
  });

  it('passes the current word to PronunciationButton', () => {
    render(
      <SpellingChallengePractice
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Words sorted by length: cat(3), book(4). First word = 'cat'
    const btn = screen.getByTestId('pronunciation-btn');
    expect(btn.getAttribute('data-word')).toBe('cat');
  });
});
