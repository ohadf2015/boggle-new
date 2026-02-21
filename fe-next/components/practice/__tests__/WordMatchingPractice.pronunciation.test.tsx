import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: ({ word }: { word: string }) => (
    <button data-testid="pronunciation-btn" data-word={word}>
      🔊
    </button>
  ),
}));

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: () => <div data-testid="mascot">Mascot</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  useSensors: jest.fn(() => []),
  useSensor: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCenter: jest.fn(),
  useDraggable: jest.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  })),
  useDroppable: jest.fn(() => ({
    setNodeRef: jest.fn(),
    isOver: false,
  })),
}));

jest.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: jest.fn(),
}));

jest.mock('@/components/motion/AdaptiveMotion', () => {
  const MockDiv = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return {
    AdaptiveMotion: {
      div: MockDiv,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

const mockWords: VocabularyWord[] = [
  { word: 'apple', definition: 'a fruit', canIntegrate: true },
  { word: 'car', definition: 'a vehicle', canIntegrate: true },
  { word: 'book', definition: 'for reading', canIntegrate: true },
];

describe('WordMatchingPractice - PronunciationButton', () => {
  it('renders a PronunciationButton for each word chip', () => {
    render(
      <WordMatchingPractice
        words={mockWords}
        onComplete={jest.fn()}
        onBack={jest.fn()}
      />
    );

    const buttons = screen.getAllByTestId('pronunciation-btn');
    expect(buttons).toHaveLength(mockWords.length);
  });

  it('passes each word to its own PronunciationButton', () => {
    render(
      <WordMatchingPractice
        words={mockWords}
        onComplete={jest.fn()}
        onBack={jest.fn()}
      />
    );

    const buttons = screen.getAllByTestId('pronunciation-btn');
    const words = buttons.map((b) => b.getAttribute('data-word'));
    expect(words).toContain('apple');
    expect(words).toContain('car');
    expect(words).toContain('book');
  });
});
