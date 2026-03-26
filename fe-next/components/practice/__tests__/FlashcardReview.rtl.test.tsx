import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlashcardReview from '../FlashcardReview';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));

vi.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: () => null,
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../FlashcardSwipeStack', () => ({
  FlashcardSwipeStack: () => <div data-testid="swipe-stack" />,
}));

vi.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }),
}));

vi.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => null,
}));

const mockWords = [
  { id: '1', word: 'שלום', definition: 'Hello', partOfSpeech: 'noun', examples: [], canIntegrate: true },
];

describe('FlashcardReview RTL', () => {
  it('applies dir=rtl on main container when language is Hebrew', () => {
    const { container } = render(
      <FlashcardReview words={mockWords} onComplete={vi.fn()} onBack={vi.fn()} />
    );
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});
