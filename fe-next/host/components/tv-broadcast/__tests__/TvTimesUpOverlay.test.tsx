/**
 * TDD RED: TvTimesUpOverlay
 *
 * Countdown overlay for TV broadcast — shows 5..4..3..2..1 then "TIME'S UP!"
 * Must trigger entirely before unmount (React 18 batching kills remainingTime=0 render).
 */

import { vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion — render children immediately, pass through data-testid
vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv(
      { children, className, style, ...rest }: any,
      ref: any
    ) {
      return (
        <div ref={ref} className={className} style={style} data-testid={rest['data-testid']}>
          {children}
        </div>
      );
    }),
    span: React.forwardRef(function MotionSpan(
      { children, className, ...rest }: any,
      ref: any
    ) {
      return (
        <span className={className} data-testid={rest['data-testid']}>
          {children}
        </span>
      );
    }),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import TvTimesUpOverlay from '../TvTimesUpOverlay';

const t = (key: string) => {
  const map: Record<string, string> = {
    'tvBroadcast.timesUp': "TIME'S UP!",
    'tvBroadcast.timesUpSub': 'Pencils down!',
  };
  return map[key] || key;
};

describe('TvTimesUpOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Visibility rules ──

  it('renders nothing when remainingTime > 5', () => {
    render(<TvTimesUpOverlay remainingTime={10} t={t} />);
    expect(screen.queryByTestId('tv-times-up-overlay')).not.toBeInTheDocument();
  });

  it('renders countdown overlay when remainingTime <= 5', () => {
    render(<TvTimesUpOverlay remainingTime={5} t={t} />);
    expect(screen.getByTestId('tv-times-up-overlay')).toBeInTheDocument();
  });

  // ── Countdown numbers ──

  it('shows the current countdown number', () => {
    render(<TvTimesUpOverlay remainingTime={3} t={t} />);
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('3');
  });

  it('shows 1 when remainingTime is 1', () => {
    render(<TvTimesUpOverlay remainingTime={1} t={t} />);
    expect(screen.getByTestId('countdown-number')).toHaveTextContent('1');
  });

  // ── TIME'S UP! trigger ──

  it('shows TIME\'S UP text after delay when remainingTime reaches 1', () => {
    render(<TvTimesUpOverlay remainingTime={1} t={t} />);

    // Before timer fires — still showing countdown
    expect(screen.queryByTestId('times-up-text')).not.toBeInTheDocument();

    // Advance past the delay
    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByTestId('times-up-text')).toHaveTextContent("TIME'S UP!");
  });

  it('does not show TIME\'S UP when remainingTime is 3', () => {
    render(<TvTimesUpOverlay remainingTime={3} t={t} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.queryByTestId('times-up-text')).not.toBeInTheDocument();
  });

  // ── onTimesUp callback ──

  it('calls onTimesUp callback when TIME\'S UP triggers', () => {
    const onTimesUp = vi.fn();

    render(<TvTimesUpOverlay remainingTime={1} t={t} onTimesUp={onTimesUp} />);

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(onTimesUp).toHaveBeenCalledOnce();
  });

  // ── Null remainingTime (timer not started) ──

  it('renders nothing when remainingTime is null', () => {
    render(<TvTimesUpOverlay remainingTime={null} t={t} />);
    expect(screen.queryByTestId('tv-times-up-overlay')).not.toBeInTheDocument();
  });
});
