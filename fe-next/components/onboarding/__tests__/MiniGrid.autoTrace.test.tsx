import { render, act } from '@testing-library/react';
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
  Hand: () => <div>Hand</div>,
}));

// Mock framer-motion
jest.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(({ children, className, animate, ...props }: any, ref: any) => (
    <div ref={ref} className={className} data-animate={JSON.stringify(animate)} {...props}>{children}</div>
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

// Mock WordPathTrail
jest.mock('@/components/animations/WordPathTrail', () => ({
  WordPathTrail: () => <div data-testid="word-path-trail-mock" />,
}));

describe('MiniGrid - autoTrace prop', () => {
  const mockLetters = [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E'],
  ];

  const mockDemoPath: GridPosition[] = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
  ];

  const mockOnDemoComplete = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnDemoComplete.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should render auto-trace overlay when autoTrace is true after first timer', () => {
    const { container } = render(
      <LanguageProvider>
        <MiniGrid
          size={3}
          letters={mockLetters}
          demoWord="CAT"
          demoPath={mockDemoPath}
          onDemoComplete={mockOnDemoComplete}
          autoTrace={true}
        />
      </LanguageProvider>
    );

    // Advance past first cell timer
    act(() => {
      jest.advanceTimersByTime(700);
    });

    const autoTraceOverlay = container.querySelector('[data-testid="auto-trace-overlay"]');
    expect(autoTraceOverlay).toBeInTheDocument();
  });

  test('should not render auto-trace overlay when autoTrace is false', () => {
    const { container } = render(
      <LanguageProvider>
        <MiniGrid
          size={3}
          letters={mockLetters}
          demoWord="CAT"
          demoPath={mockDemoPath}
          onDemoComplete={mockOnDemoComplete}
          autoTrace={false}
        />
      </LanguageProvider>
    );

    const autoTraceOverlay = container.querySelector('[data-testid="auto-trace-overlay"]');
    expect(autoTraceOverlay).not.toBeInTheDocument();
  });

  test('should not render auto-trace overlay by default', () => {
    const { container } = render(
      <LanguageProvider>
        <MiniGrid
          size={3}
          letters={mockLetters}
          demoWord="CAT"
          demoPath={mockDemoPath}
          onDemoComplete={mockOnDemoComplete}
        />
      </LanguageProvider>
    );

    const autoTraceOverlay = container.querySelector('[data-testid="auto-trace-overlay"]');
    expect(autoTraceOverlay).not.toBeInTheDocument();
  });

  test('should call onAutoTraceComplete after animation finishes', () => {
    const onAutoTraceComplete = jest.fn();
    render(
      <LanguageProvider>
        <MiniGrid
          size={3}
          letters={mockLetters}
          demoWord="CAT"
          demoPath={mockDemoPath}
          onDemoComplete={mockOnDemoComplete}
          autoTrace={true}
          onAutoTraceComplete={onAutoTraceComplete}
        />
      </LanguageProvider>
    );

    // Auto-trace animation: 3 cells * ~667ms + 1 extra delay = ~2667ms
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(onAutoTraceComplete).toHaveBeenCalled();
  });
});
