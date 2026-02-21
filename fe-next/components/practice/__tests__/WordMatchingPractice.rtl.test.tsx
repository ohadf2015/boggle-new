import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));

jest.mock('@/components/motion/AdaptiveMotion', () => {
  const MockDiv = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  return {
    AdaptiveMotion: {
      div: MockDiv,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
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

jest.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: () => <div data-testid="results-card" />,
}));

// Mock useMatchingGame to return isComplete=true so the results screen renders
jest.mock('../hooks/useMatchingGame', () => ({
  useMatchingGame: () => ({
    wordColumn: [],
    definitionColumn: [],
    matchedPairs: new Map(),
    attempts: 2,
    correctCount: 2,
    isComplete: true,
    accuracy: 100,
    checkMatch: jest.fn(),
    resetGame: jest.fn(),
  }),
}));

const mockWords: VocabularyWord[] = [
  { word: 'שלום', definition: 'Hello', canIntegrate: true },
  { word: 'תודה', definition: 'Thanks', canIntegrate: true },
];

describe('WordMatchingPractice RTL — results screen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies dir=rtl on results screen container when language is Hebrew', async () => {
    const { container } = render(
      <WordMatchingPractice words={mockWords} onComplete={jest.fn()} onBack={jest.fn()} />
    );

    // Advance past the 500ms timeout that sets showResults=true
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    // Results screen should now be visible
    expect(container.querySelector('[data-testid="results-card"]')).toBeInTheDocument();

    // The results screen container must have dir=rtl
    const resultsContainer = container.firstChild as HTMLElement;
    expect(resultsContainer).toHaveAttribute('dir', 'rtl');
  });
});
