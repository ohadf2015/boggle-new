import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

const dnd = vi.hoisted(() => ({ onDragEnd: (_e: unknown) => {} }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
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
  DndContext: ({ children, onDragEnd }: any) => {
    dnd.onDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  useSensors: vi.fn(() => []),
  useSensor: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
  useDraggable: vi.fn((props) => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
  useDroppable: vi.fn((props) => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
}));

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn(),
}));

// Mock AdaptiveMotion (it's an object with element-keyed components like .div, .span, etc.)
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const MockDiv = ({ children, ...props }: any) => (
    <div data-testid="adaptive-motion" {...props}>{children}</div>
  );
  return {
    AdaptiveMotion: {
      div: MockDiv,
      span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
      button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
    useSkipAnimations: () => true,
  };
});

describe('WordMatchingPractice word results', () => {
  const words: VocabularyWord[] = [
    { word: 'apple', definition: 'a fruit', canIntegrate: true },
    { word: 'car', definition: 'a vehicle', canIntegrate: true },
  ];

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const drop = (word: string, onto: string) => act(() => { dnd.onDragEnd({ active: { id: word }, over: { id: onto } }); });

  it('Given a word dropped on the wrong meaning first, When every pair is matched, Then only that word is reported wrong', () => {
    const onComplete = vi.fn();
    render(<WordMatchingPractice words={words} onComplete={onComplete} onBack={vi.fn()} />);
    drop('apple', 'car');
    drop('apple', 'apple');
    drop('car', 'car');
    act(() => { vi.advanceTimersByTime(600); });
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      wordResults: [
        { word: 'apple', correct: false, kind: 'recognise' },
        { word: 'car', correct: true, kind: 'recognise' },
      ],
    }));
  });
});
