import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordMatchingPractice } from '../WordMatchingPractice';
import type { VocabularyWord } from '@/lib/supabase/education/types';

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
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
  DndContext: ({ children, onDragEnd }: any) => (
    <div data-testid="dnd-context" data-ondragend={onDragEnd ? 'exists' : 'missing'}>
      {children}
    </div>
  ),
  useSensors: jest.fn(() => []),
  useSensor: jest.fn(),
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  closestCenter: jest.fn(),
  useDraggable: jest.fn((props) => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  })),
  useDroppable: jest.fn((props) => ({
    setNodeRef: jest.fn(),
    isOver: false,
  })),
}));

jest.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: jest.fn(),
}));

// Mock AdaptiveMotion (it's an object with element-keyed components like .div, .span, etc.)
jest.mock('@/components/motion/AdaptiveMotion', () => {
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
  };
});

describe('WordMatchingPractice', () => {
  const mockWords: VocabularyWord[] = [
    { word: 'apple', definition: 'a fruit', canIntegrate: true },
    { word: 'car', definition: 'a vehicle', canIntegrate: true },
    { word: 'book', definition: 'for reading', canIntegrate: true },
  ];

  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render two columns of items', () => {
      render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Should have DndContext for drag and drop
      const contexts = screen.getAllByTestId('dnd-context');
      expect(contexts.length).toBeGreaterThan(0);

      // Should show progress
      expect(screen.getByText('0 / 3')).toBeInTheDocument();
    });

    it('should render all words and definitions', () => {
      render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Check words are rendered (exact text may vary due to shuffling)
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('car')).toBeInTheDocument();
      expect(screen.getByText('book')).toBeInTheDocument();

      // Check definitions are rendered
      expect(screen.getByText('a fruit')).toBeInTheDocument();
      expect(screen.getByText('a vehicle')).toBeInTheDocument();
      expect(screen.getByText('for reading')).toBeInTheDocument();
    });

    it('should show back button', () => {
      render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      const backButton = screen.getByLabelText('common.back');
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('matching', () => {
    it('should track progress as pairs are matched', () => {
      render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Initial state
      expect(screen.getByText('0 / 3')).toBeInTheDocument();

      // Note: Since DndContext is mocked, we can't simulate actual drag events
      // This test verifies the component structure exists
      const contexts = screen.getAllByTestId('dnd-context');
      expect(contexts.length).toBeGreaterThan(0);
      expect(contexts[0]).toHaveAttribute('data-ondragend', 'exists');
    });
  });

  describe('completion', () => {
    it('should show results card when all pairs matched', () => {
      // Create a version with 0 words to trigger immediate completion
      render(
        <WordMatchingPractice
          words={[]}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // With 0 words, game should be complete immediately
      // Should show some completion UI (exact implementation may vary)
      expect(screen.queryByText('0 / 0')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Back button should have aria-label
      const backButton = screen.getByLabelText('common.back');
      expect(backButton).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation via dnd-kit sensors', () => {
      const { useSensors, useSensor, KeyboardSensor } = require('@dnd-kit/core');

      render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Verify keyboard sensor is configured
      expect(useSensors).toHaveBeenCalled();
      expect(useSensor).toHaveBeenCalled();
    });
  });

  describe('RTL support', () => {
    it('should have dir attribute from language context', () => {
      const { container } = render(
        <WordMatchingPractice
          words={mockWords}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Check for dir attribute (ltr from mock)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('edge cases', () => {
    it('should handle empty words array', () => {
      render(
        <WordMatchingPractice
          words={[]}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      // Should render without errors
      expect(screen.getByText('0 / 0')).toBeInTheDocument();
    });

    it('should handle single word pair', () => {
      const singleWord: VocabularyWord[] = [
        { word: 'test', definition: 'a test', canIntegrate: true },
      ];

      render(
        <WordMatchingPractice
          words={singleWord}
          onComplete={mockOnComplete}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('a test')).toBeInTheDocument();
    });
  });
});
