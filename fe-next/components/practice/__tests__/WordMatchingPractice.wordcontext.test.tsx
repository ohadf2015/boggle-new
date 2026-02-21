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

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
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
  useDroppable: jest.fn(() => ({ setNodeRef: jest.fn(), isOver: false })),
}));

jest.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: jest.fn(),
}));

jest.mock('@/components/motion/AdaptiveMotion', () => ({
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
        onComplete={jest.fn()}
        onBack={jest.fn()}
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
        onComplete={jest.fn()}
        onBack={jest.fn()}
      />
    );

    expect(screen.getByText('noun')).toBeInTheDocument();
    expect(
      screen.getByText(/An apple a day keeps the doctor away\./)
    ).toBeInTheDocument();
  });
});
