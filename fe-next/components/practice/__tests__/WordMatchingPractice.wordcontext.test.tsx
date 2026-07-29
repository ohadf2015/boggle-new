/**
 * Integration test: WordContextRow in WordMatchingPractice.
 *
 * VocabularyWord has no partOfSpeech/examples, so WordContextRow renders null
 * by default (graceful degradation). This test verifies the component doesn't
 * crash and that enriched-style data surfaces when present.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
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
  useDroppable: vi.fn(() => ({ setNodeRef: vi.fn(), isOver: false })),
}));

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('WordMatchingPractice — WordContextRow integration', () => {
  const baseWords: VocabularyWord[] = [
    { word: 'apple', definition: 'a fruit', canIntegrate: true },
    { word: 'car', definition: 'a vehicle', canIntegrate: true },
  ];

  it('renders without crashing when words lack partOfSpeech/examples', () => {
    render(
      <WordMatchingPractice
        words={baseWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );
    // Words still rendered
    expect(screen.getByText('apple')).toBeInTheDocument();
    // No context row visible
    expect(screen.queryByText('noun')).not.toBeInTheDocument();
  });

  it('shows part-of-speech for a word when enriched-style data is attached', () => {
    const enrichedWords = [
      {
        ...baseWords[0],
        partOfSpeech: 'noun',
        examples: [{ text: 'An apple a day keeps the doctor away.' }],
      } as any,
      baseWords[1],
    ];

    render(
      <WordMatchingPractice
        words={enrichedWords}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('noun')).toBeInTheDocument();
    expect(
      screen.getByText(/An apple a day keeps the doctor away\./)
    ).toBeInTheDocument();
  });
});
