import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
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

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => <div data-testid="mascot">Mascot</div>,
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  useSensors: vi.fn(() => []),
  useSensor: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
}));

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
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
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const buttons = screen.getAllByTestId('pronunciation-btn');
    expect(buttons).toHaveLength(mockWords.length);
  });

  it('passes each word to its own PronunciationButton', () => {
    render(
      <WordMatchingPractice
        words={mockWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const buttons = screen.getAllByTestId('pronunciation-btn');
    const words = buttons.map((b) => b.getAttribute('data-word'));
    expect(words).toContain('apple');
    expect(words).toContain('car');
    expect(words).toContain('book');
  });
});
