import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import WelcomeDemoStep from '../WelcomeDemoStep';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Pointer: () => <div>Pointer</div>,
  Sparkles: () => <div>Sparkles</div>,
}));

// Mock Mascot
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: () => <div data-testid="mascot" />,
}));

// Mock MiniGrid
vi.mock('../MiniGrid', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => (
      <div
        data-testid="mini-grid"
        data-auto-trace={props.autoTrace}
        onClick={() => {
          if (props.onAutoTraceComplete) props.onAutoTraceComplete();
        }}
        onDoubleClick={() => props.onDemoComplete()}
      />
    ),
  };
});

// Mock framer-motion
vi.mock('framer-motion', () => {
  const React = require('react');
  const MotionDiv = React.forwardRef(function MotionDiv({ children, ...props }: any, ref: any) {
    return <div ref={ref} {...props}>{children}</div>;
  });
  const MotionButton = React.forwardRef(function MotionButton({ children, ...props }: any, ref: any) {
    return <button ref={ref} {...props}>{children}</button>;
  });
  return {
    m: { div: MotionDiv, button: MotionButton },
    AnimatePresence: function AnimatePresence({ children }: any) { return <>{children}</>; },
  };
});

// Mock demoConfigs
vi.mock('../demoConfigs', () => ({
  demoConfigs: {
    en: {
      letters: [['C', 'A', 'T'], ['O', 'R', 'S'], ['W', 'D', 'E']],
      path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
      word: 'CAT',
    },
  },
}));

describe('WelcomeDemoStep - Fast Onboarding Flow', () => {
  const mockOnDemoComplete = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnDemoComplete.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should start with auto-trace phase (Phase 1)', () => {
    render(
      <LanguageProvider>
        <WelcomeDemoStep
          onDemoComplete={mockOnDemoComplete}
          demoCompleted={false}
        />
      </LanguageProvider>
    );

    const grid = screen.getByTestId('mini-grid');
    expect(grid.dataset.autoTrace).toBe('true');
  });

  test('should transition to player turn phase (Phase 2) after auto-trace', () => {
    render(
      <LanguageProvider>
        <WelcomeDemoStep
          onDemoComplete={mockOnDemoComplete}
          demoCompleted={false}
        />
      </LanguageProvider>
    );

    // Simulate auto-trace completion
    const grid = screen.getByTestId('mini-grid');
    act(() => {
      grid.click(); // triggers onAutoTraceComplete
    });

    // Grid should no longer have autoTrace
    expect(grid.dataset.autoTrace).toBe('false');
  });

  test('should show skip button', () => {
    render(
      <LanguageProvider>
        <WelcomeDemoStep
          onDemoComplete={mockOnDemoComplete}
          demoCompleted={false}
        />
      </LanguageProvider>
    );

    // Skip button should always be visible
    expect(screen.getByTestId('skip-button')).toBeInTheDocument();
  });

  test('should show celebration when demo is completed', () => {
    render(
      <LanguageProvider>
        <WelcomeDemoStep
          onDemoComplete={mockOnDemoComplete}
          demoCompleted={true}
        />
      </LanguageProvider>
    );

    // Should show "Let's Play!" button
    expect(screen.getByTestId('lets-play-button')).toBeInTheDocument();
  });
});
