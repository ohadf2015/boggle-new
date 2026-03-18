import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import MiniGrid, { GridPosition } from '../MiniGrid';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Check: () => <div>Check</div>,
  Sparkles: () => <div>Sparkles</div>,
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const React = require('react');
  const createMotionComponent = (tag: string) => {
    const Comp = React.forwardRef(({ children, className, animate, transition, initial, exit, whileHover, whileTap, ...rest }: any, ref: any) =>
      React.createElement(tag, { ref, className, ...rest }, children)
    );
    Comp.displayName = `motion.${tag}`;
    return Comp;
  };
  return {
    motion: new Proxy({}, {
      get: (_: any, prop: string) => createMotionComponent(prop),
    }),
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

    // Find all grid cells (they have aspect-square class)
    const cells = container.querySelectorAll('.aspect-square');

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

    const cells = container.querySelectorAll('.aspect-square');

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
