/**
 * MiniGrid Word Trail Tests
 * Tests the delayed appearance of the word path trail in the tutorial grid
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MiniGrid from '../MiniGrid';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => {
  const MotionComponent = ({ children, ...props }: any) => {
    const { animate, initial, exit, transition, whileHover, whileTap, ...restProps } = props;
    return <div {...restProps}>{children}</div>;
  };

  return {
    motion: {
      div: MotionComponent,
      path: MotionComponent,
      span: MotionComponent,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

// Mock WordPathTrail component
jest.mock('@/components/animations/WordPathTrail', () => ({
  WordPathTrail: ({ points }: any) => (
    <div data-testid="word-path-trail-mock" data-points-count={points?.length || 0} />
  ),
}));

const mockDemoConfig = {
  letters: [
    ['C', 'A', 'P'],
    ['D', 'T', 'O'],
    ['E', 'R', 'S'],
  ],
  path: [
    { row: 0, col: 0 }, // C
    { row: 0, col: 1 }, // A
    { row: 1, col: 1 }, // T
  ],
  word: 'CAT',
};

const renderMiniGrid = (onDemoComplete = jest.fn()) => {
  return render(
    <LanguageProvider>
      <MiniGrid
        size={3}
        letters={mockDemoConfig.letters}
        demoWord={mockDemoConfig.word}
        demoPath={mockDemoConfig.path}
        onDemoComplete={onDemoComplete}
        showHints={true}
      />
    </LanguageProvider>
  );
};

describe('MiniGrid - Word Trail Visibility', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should not show word trail immediately on mount', () => {
    renderMiniGrid();

    // WordPathTrail should not be visible initially
    const trail = screen.queryByTestId('word-path-trail');
    expect(trail).not.toBeInTheDocument();
  });

  it('should not show trail before 8 seconds even if user has not touched board', () => {
    renderMiniGrid();

    // Advance time by 7 seconds
    act(() => {
      jest.advanceTimersByTime(7000);
    });

    const trail = screen.queryByTestId('word-path-trail');
    expect(trail).not.toBeInTheDocument();
  });

  it('should not show trail before 8 seconds even if user has touched board', () => {
    const { container } = renderMiniGrid();

    // Simulate user touching a cell
    const firstCell = container.querySelector('[data-row="0"][data-col="0"]');
    expect(firstCell).toBeInTheDocument();

    if (firstCell) {
      fireEvent.touchStart(firstCell, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
    }

    // Advance time by 7 seconds
    act(() => {
      jest.advanceTimersByTime(7000);
    });

    const trail = screen.queryByTestId('word-path-trail');
    expect(trail).not.toBeInTheDocument();
  });

  it('should show trail after 8 seconds AND user has touched the board', async () => {
    const { container } = renderMiniGrid();

    // Simulate user touching first cell (C)
    const firstCell = container.querySelector('[data-row="0"][data-col="0"]');
    expect(firstCell).toBeInTheDocument();

    if (firstCell) {
      fireEvent.touchStart(firstCell, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
    }

    // Select second cell (A) to create a path with at least 2 points
    const secondCell = container.querySelector('[data-row="0"][data-col="1"]');
    if (secondCell) {
      fireEvent.touchStart(secondCell, {
        touches: [{ clientX: 150, clientY: 100 }],
      });
    }

    // Advance time by 8 seconds
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    await waitFor(() => {
      const trail = screen.queryByTestId('word-path-trail');
      expect(trail).toBeInTheDocument();
    });
  });

  it('should not show trail after 8 seconds if user has NOT touched the board', () => {
    renderMiniGrid();

    // Advance time by 8+ seconds without any user interaction
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    const trail = screen.queryByTestId('word-path-trail');
    expect(trail).not.toBeInTheDocument();
  });

  it('should show trail immediately after 8 seconds passes once user touches board', async () => {
    const { container } = renderMiniGrid();

    // Advance time by 8 seconds FIRST (no touch yet)
    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // Verify trail is not shown yet
    expect(screen.queryByTestId('word-path-trail')).not.toBeInTheDocument();

    // NOW user touches the board - select TWO cells to create a path
    const firstCell = container.querySelector('[data-row="0"][data-col="0"]');
    if (firstCell) {
      fireEvent.touchStart(firstCell, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
    }

    const secondCell = container.querySelector('[data-row="0"][data-col="1"]');
    if (secondCell) {
      fireEvent.touchStart(secondCell, {
        touches: [{ clientX: 150, clientY: 100 }],
      });
    }

    // Trail should appear immediately (both conditions met)
    await waitFor(() => {
      const trail = screen.queryByTestId('word-path-trail');
      expect(trail).toBeInTheDocument();
    });
  });
});
