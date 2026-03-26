import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
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

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
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

vi.mock('../PracticeResultsCard', () => ({
  __esModule: true,
  default: () => <div data-testid="results-card" />,
}));

// Mock useMatchingGame to return isComplete=true so the results screen renders
vi.mock('../hooks/useMatchingGame', () => ({
  useMatchingGame: () => ({
    wordColumn: [],
    definitionColumn: [],
    matchedPairs: new Map(),
    attempts: 2,
    correctCount: 2,
    isComplete: true,
    accuracy: 100,
    checkMatch: vi.fn(),
    resetGame: vi.fn(),
  }),
}));

const mockWords: VocabularyWord[] = [
  { word: 'שלום', definition: 'Hello', canIntegrate: true },
  { word: 'תודה', definition: 'Thanks', canIntegrate: true },
];

describe('WordMatchingPractice RTL — results screen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies dir=rtl on results screen container when language is Hebrew', async () => {
    const { container } = render(
      <WordMatchingPractice words={mockWords} onComplete={vi.fn()} onBack={vi.fn()} />
    );

    // Advance past the 500ms timeout that sets showResults=true
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    // Results screen should now be visible
    expect(container.querySelector('[data-testid="results-card"]')).toBeInTheDocument();

    // The results screen container must have dir=rtl
    const resultsContainer = container.firstChild as HTMLElement;
    expect(resultsContainer).toHaveAttribute('dir', 'rtl');
  });
});
