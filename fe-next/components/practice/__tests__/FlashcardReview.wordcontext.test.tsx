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
  { word: 'serendipity', definition: 'A happy accident', canIntegrate: true },
];

const enrichedPayload = [
  {
    word: 'serendipity',
    definition: 'A happy accident',
    pronunciation: '/ˌsɛr.ənˈdɪp.ɪ.ti/',
    partOfSpeech: 'noun',
    examples: [{ text: 'Finding that book was pure serendipity.' }],
    contextualExamples: [],
  },
];

/**
 * Trigger the vocabularyEnriched socket callback so enrichedWords state is set.
 */
function triggerEnrichment() {
  const onCall = mockSocket.on.mock.calls.find(([event]: [string]) => event === 'vocabularyEnriched');
  if (onCall) {
    act(() => {
      onCall[1]({ enrichedWords: enrichedPayload });
    });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FlashcardReview — WordContextRow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows part-of-speech on the word face when enriched data is available', () => {
    render(
      <FlashcardReview
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    triggerEnrichment();

    // The word face is shown by default (not-flipped)
    expect(screen.getByText('noun')).toBeInTheDocument();
  });

  it('shows usage example on the word face when enriched data is available', () => {
    render(
      <FlashcardReview
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    triggerEnrichment();

    expect(
      screen.getByText(/Finding that book was pure serendipity\./)
    ).toBeInTheDocument();
  });

  it('renders nothing for WordContextRow before enrichment callback fires', () => {
    // The socket mock is set up but triggerEnrichment() is NOT called,
    // so enrichedWords starts empty and WordContextRow receives undefined props → renders null.
    render(
      <FlashcardReview
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    // part-of-speech 'noun' should not appear (enrichment hasn't happened yet)
    expect(screen.queryByText('noun')).not.toBeInTheDocument();
  });
});
