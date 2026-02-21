import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlashcardReview from '../FlashcardReview';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));

jest.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: () => null,
}));

jest.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('../FlashcardSwipeStack', () => ({
  FlashcardSwipeStack: () => <div data-testid="swipe-stack" />,
}));

jest.mock('@/hooks/useSpeechSynthesis', () => ({
  useSpeechSynthesis: () => ({ speak: jest.fn(), cancel: jest.fn(), speaking: false }),
}));

jest.mock('@/utils/SocketContext', () => ({
  useSocketOptional: () => null,
}));

const mockWords = [
  { id: '1', word: 'שלום', definition: 'Hello', partOfSpeech: 'noun', examples: [], canIntegrate: true },
];

describe('FlashcardReview RTL', () => {
  it('applies dir=rtl on main container when language is Hebrew', () => {
    const { container } = render(
      <FlashcardReview words={mockWords} onComplete={jest.fn()} onBack={jest.fn()} />
    );
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
  });
});
