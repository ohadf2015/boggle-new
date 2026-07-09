import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HoldToStartFlow } from '../HoldToStartFlow';

// The control is dual-purpose: a quick tap starts the relaxed flow, while a
// press-and-hold that fills the ring commits to the fast flow. Framer-motion is
// stubbed to plain elements so the gesture logic is what's under test.
vi.mock('framer-motion', () => ({
  m: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { children, ...rest } = props as { children?: React.ReactNode };
    return <div {...rest}>{children}</div>;
  } }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('HoldToStartFlow', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts the relaxed flow (fast=false) on a quick tap', () => {
    const onStart = vi.fn();
    render(<HoldToStartFlow onStart={onStart} label="Start Flow" holdHint="Hold for fast" />);

    const btn = screen.getByRole('button');
    // Press and release well under the hold threshold.
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(120); });
    fireEvent.pointerUp(btn);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(false);
  });

  it('commits to the fast flow (fast=true) once the hold ring fills', () => {
    const onStart = vi.fn();
    render(<HoldToStartFlow onStart={onStart} label="Start Flow" holdHint="Hold for fast" holdMs={800} />);

    const btn = screen.getByRole('button');
    fireEvent.pointerDown(btn);
    // Cross the fill threshold — fast flow should fire automatically.
    act(() => { vi.advanceTimersByTime(850); });

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(true);
  });

  it('does not double-fire: a release after the hold already committed is ignored', () => {
    const onStart = vi.fn();
    render(<HoldToStartFlow onStart={onStart} label="Start Flow" holdHint="Hold for fast" holdMs={800} />);

    const btn = screen.getByRole('button');
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(850); });
    fireEvent.pointerUp(btn);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(true);
  });

  it('swaps to the holding-state hint once the hold has visibly started', () => {
    render(
      <HoldToStartFlow
        onStart={vi.fn()}
        label="Start Flow"
        holdHint="Hold for fast"
        holdingHint="Keep holding for fast flow"
        holdMs={800}
      />,
    );

    const btn = screen.getByRole('button');
    expect(screen.getByText('Hold for fast')).toBeInTheDocument();

    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(100); });

    expect(screen.getByText('Keep holding for fast flow')).toBeInTheDocument();
    expect(screen.queryByText('Hold for fast')).not.toBeInTheDocument();
  });

  it('falls back to holdHint when holdingHint is not provided', () => {
    render(<HoldToStartFlow onStart={vi.fn()} label="Start Flow" holdHint="Hold for fast" holdMs={800} />);

    const btn = screen.getByRole('button');
    fireEvent.pointerDown(btn);
    act(() => { vi.advanceTimersByTime(100); });

    expect(screen.getByText('Hold for fast')).toBeInTheDocument();
  });
});
