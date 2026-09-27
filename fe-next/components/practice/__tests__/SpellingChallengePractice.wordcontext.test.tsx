/**
 * Integration test: WordContextRow in SpellingChallengePractice.
 *
 * VocabularyWord has no partOfSpeech/examples, so WordContextRow renders null
 * (graceful degradation). This test verifies the component doesn't crash and
 * that when enriched-style data IS present on the word object, it surfaces.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SpellingChallengePractice } from '../SpellingChallengePractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: {
      div: MotionDiv,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: () => <div data-testid="practice-results-card" />,
}));

describe('SpellingChallengePractice — WordContextRow integration', () => {
  const baseWords: VocabularyWord[] = [
    { word: 'cat', definition: 'A small furry pet', canIntegrate: true },
  ];

  it('renders without crashing when words lack partOfSpeech/examples', () => {
    render(
      <SpellingChallengePractice
        words={baseWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    // Definition card still present
    expect(screen.getByTestId('definition-card')).toBeInTheDocument();
    // No spurious context row rendered
    expect(screen.queryByText('noun')).not.toBeInTheDocument();
  });

  it('shows part-of-speech when word has enriched-style data attached', () => {
    // Cast to any to simulate an enriched word passed via a future extended type
    const enrichedWord = {
      ...baseWords[0],
      partOfSpeech: 'noun',
      examples: [{ text: 'The cat sat on the mat.' }],
    } as any;

    render(
      <SpellingChallengePractice
        words={[enrichedWord]}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('noun')).toBeInTheDocument();
    expect(screen.getByText(/The cat sat on the mat\./)).toBeInTheDocument();
  });
});
