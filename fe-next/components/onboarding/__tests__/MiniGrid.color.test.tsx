import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import MiniGrid, { GridPosition } from '../MiniGrid';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowDown: () => <div>ArrowDown</div>,
  ArrowUp: () => <div>ArrowUp</div>,
  ArrowLeft: () => <div>ArrowLeft</div>,
  ArrowRight: () => <div>ArrowRight</div>,
  ArrowDownLeft: () => <div>ArrowDownLeft</div>,
  ArrowDownRight: () => <div>ArrowDownRight</div>,
  ArrowUpLeft: () => <div>ArrowUpLeft</div>,
  ArrowUpRight: () => <div>ArrowUpRight</div>,
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <div ref={ref} className={className} {...props}>{children}</div>
  ));
  MotionDiv.displayName = 'motion.div';

  const MotionSpan = React.forwardRef(({ children, className, ...props }: any, ref: any) => (
    <span ref={ref} className={className} {...props}>{children}</span>
  ));
  MotionSpan.displayName = 'motion.span';

  return {
    motion: {
      div: MotionDiv,
      span: MotionSpan,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe('MiniGrid - Letter Color Fix', () => {
  const mockLetters = [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E']
  ];

  const mockDemoPath: GridPosition[] = [
    { row: 0, col: 0 }, // C
    { row: 0, col: 1 }, // A
    { row: 1, col: 1 }, // T
  ];

  const renderMiniGrid = () => {
    return render(
      <LanguageProvider>
        <MiniGrid
          size={3}
          letters={mockLetters}
          demoWord="CAT"
          demoPath={mockDemoPath}
          onDemoComplete={jest.fn()}
          showHints={true}
        />
      </LanguageProvider>
    );
  };

  it('should render all letters with black text color', () => {
    const { container } = renderMiniGrid();

    // Find all grid cells
    const cells = container.querySelectorAll('[data-row]');

    // Verify we have 9 cells (3x3 grid)
    expect(cells.length).toBe(9);

    // Check that each cell has text-neo-black class or equivalent black text styling
    cells.forEach((cell) => {
      const classList = Array.from(cell.classList);

      // Cell should have either:
      // 1. text-neo-black class explicitly set, OR
      // 2. Some other styling that ensures black text
      const hasBlackText = classList.some(className =>
        className.includes('text-neo-black') ||
        className.includes('text-black')
      );

      expect(hasBlackText).toBe(true);
    });
  });

  it('should ensure letters are visible (not using same color as background)', () => {
    const { container } = renderMiniGrid();

    const cells = container.querySelectorAll('[data-row]');

    cells.forEach((cell) => {
      const classList = Array.from(cell.classList);

      // Check that we don't have text color matching background
      // If background is cream, text should be black
      const hasCreamBackground = classList.some(className =>
        className.includes('bg-neo-cream') ||
        className.includes('letter-tile-gradient-cream')
      );

      if (hasCreamBackground) {
        const hasBlackText = classList.some(className =>
          className.includes('text-neo-black') ||
          className.includes('text-black')
        );
        expect(hasBlackText).toBe(true);
      }
    });
  });
});
