/**
 * CrazyGamesTutorial - Tests
 *
 * Verifies the CrazyGames-specific tutorial step:
 * - Renders the asymmetric heading + demo grid
 * - "watch me" → "your turn" copy transitions
 * - Skip routes to onSkip immediately
 * - Demo completion calls onContinue (after celebration delay)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import CrazyGamesTutorial from '../CrazyGamesTutorial';

// Lightweight LanguageContext mock — surfaces `t(key)` as the key itself for
// stable assertions. Real strings are tested by translation snapshot tests.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
}));

// Stub MiniGrid — we don't want to test the trace UX twice; this suite only
// verifies tutorial wiring. Expose the callbacks as buttons.
vi.mock('../MiniGrid', () => ({
  __esModule: true,
  default: ({ onDemoComplete, onAutoTraceComplete }: {
    onDemoComplete: () => void;
    onAutoTraceComplete?: () => void;
  }) => (
    <div data-testid="mini-grid">
      <button data-testid="fire-auto-trace-end" onClick={onAutoTraceComplete}>auto-end</button>
      <button data-testid="fire-demo-complete" onClick={onDemoComplete}>demo-end</button>
    </div>
  ),
}));

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  }),
  AnimatePresence: ({ children }: any) => children,
}));

describe('CrazyGamesTutorial', () => {
  const onContinue = vi.fn();
  const onSkip = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the asymmetric heading + demo grid', () => {
    render(<CrazyGamesTutorial onContinue={onContinue} onSkip={onSkip} />);
    expect(screen.getByTestId('crazygames-tutorial')).toBeInTheDocument();
    expect(screen.getByTestId('mini-grid')).toBeInTheDocument();
  });

  it('starts in "watchMe" phase, transitions to "yourTurn" after auto-trace', () => {
    render(<CrazyGamesTutorial onContinue={onContinue} onSkip={onSkip} />);
    expect(screen.getByText('onboarding.crazygames.tutorial.watchMe')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('fire-auto-trace-end'));

    expect(screen.queryByText('onboarding.crazygames.tutorial.watchMe')).not.toBeInTheDocument();
    expect(screen.getByText(/onboarding\.crazygames\.tutorial\.yourTurn/)).toBeInTheDocument();
  });

  it('calls onContinue ~900ms after demo completes', () => {
    render(<CrazyGamesTutorial onContinue={onContinue} onSkip={onSkip} />);
    fireEvent.click(screen.getByTestId('fire-auto-trace-end'));
    fireEvent.click(screen.getByTestId('fire-demo-complete'));

    // Success badge visible immediately
    expect(screen.getByText('onboarding.crazygames.tutorial.success')).toBeInTheDocument();

    // onContinue fires after the celebration delay
    expect(onContinue).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(900); });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('skip button calls onSkip', () => {
    render(<CrazyGamesTutorial onContinue={onContinue} onSkip={onSkip} />);
    const skipBtn = screen.getByTestId('crazygames-tutorial-skip');
    fireEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('skip button is hidden after demo completes', () => {
    render(<CrazyGamesTutorial onContinue={onContinue} onSkip={onSkip} />);
    fireEvent.click(screen.getByTestId('fire-auto-trace-end'));
    fireEvent.click(screen.getByTestId('fire-demo-complete'));

    expect(screen.queryByTestId('crazygames-tutorial-skip')).not.toBeInTheDocument();
  });
});
