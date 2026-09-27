/**
 * Integration tests: WordContextRow visible in FlashcardReview word face
 * when enrichedWords data is available.
 */
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlashcardReview from '../FlashcardReview';
import type { VocabularyWord } from '@/lib/supabase/education';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak: vi.fn(), isSpeaking: false }),
}));

// Provide a socket that emits vocabularyEnriched so enrichedWords gets populated
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => ({ socket: mockSocket }),
}));

vi.mock('../PronunciationButton', () => ({
  PronunciationButton: () => null,
}));

vi.mock('../FlashcardSwipeStack', () => ({
  FlashcardSwipeStack: () => <div data-testid="swipe-stack" />,
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';
  return {
    m: { div: MotionDiv },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const MockDiv = React.forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} {...props}>{children}</div>
  ));
  MockDiv.displayName = 'MockDiv';
  return {
    AdaptiveMotion: { div: MockDiv, button: MockDiv },
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockWords: VocabularyWord[] = [
  {
    word: 'serendipity',
    definition: 'A happy accident',
    canIntegrate: true,
    // The teacher's own example sentence — the only real source of context
    // this screen has. See the note where triggerEnrichment used to be.
    example: 'Finding that book was pure serendipity.',
  },
];

/**
 * There is no `triggerEnrichment` any more.
 *
 * These tests used to drive a `vocabularyEnriched` socket callback to populate
 * the context row. No server handler for `enrichVocabulary` ever existed, so
 * that callback fired only here, in this file — the tests were green while
 * every real student sat on an infinite spinner. The emit, the listener and
 * the loading gate are gone; the row now renders from the word itself.
 */

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FlashcardReview — WordContextRow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows no part-of-speech, because nothing in the app produces one', () => {
    render(
      <FlashcardReview
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // Part of speech had exactly one source: the phantom socket reply. Until
    // something real produces it, calling a word a "noun" would be invented.
    expect(screen.queryByText('noun')).not.toBeInTheDocument();
  });

  it("shows the teacher's own example sentence on the word face", () => {
    render(
      <FlashcardReview
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // No socket round trip, no waiting: the sentence is already on the word.
    expect(
      screen.getByText(/Finding that book was pure serendipity\./)
    ).toBeInTheDocument();
  });

  it('renders no context row for a word the teacher left bare', () => {
    render(
      <FlashcardReview
        words={[{ word: 'serendipity', definition: 'A happy accident', canIntegrate: true }]}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.queryByText('noun')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Finding that book was pure serendipity\./)
    ).not.toBeInTheDocument();
  });
});
