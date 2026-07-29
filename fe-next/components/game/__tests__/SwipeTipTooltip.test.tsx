import React from 'react';
import { render, act } from '@testing-library/react';
import SwipeTipTooltip from '../SwipeTipTooltip';

vi.mock('framer-motion', () => ({
  m: new Proxy({}, {
    get: () => ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileTap, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('SwipeTipTooltip timer cleanup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call onDismiss after unmount while pop animation is pending', () => {
    const onDismiss = vi.fn();
    const t = (k: string): string => k;

    const { unmount, getByRole } = render(
      <SwipeTipTooltip isVisible onDismiss={onDismiss} t={t} />,
    );

    // Click to trigger handleDismiss (schedules 300ms setTimeout)
    act(() => {
      getByRole('tooltip').click();
    });

    unmount();

    // Advance past the popping timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not fire the auto-dismiss after unmount', () => {
    const onDismiss = vi.fn();
    const t = (k: string): string => k;

    const { unmount } = render(
      <SwipeTipTooltip isVisible onDismiss={onDismiss} t={t} />,
    );

    unmount();

    // AUTO_DISMISS_MS = 8000
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not update state after unmount during animation path', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onDismiss = vi.fn();
    const t = (k: string): string => k;

    const { unmount } = render(
      <SwipeTipTooltip isVisible onDismiss={onDismiss} t={t} />,
    );

    // Start the animation loop (500ms startTimer kicks animatePath)
    act(() => {
      vi.advanceTimersByTime(600);
    });

    unmount();

    // Flush remaining animation setTimeouts
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // React 18 no longer warns for late setStates but still logs act() errors
    // — any such error here indicates leaked timer firing on unmounted tree.
    const lateSetStateErrs = errSpy.mock.calls.filter(args =>
      String(args[0] ?? '').includes('unmounted') || String(args[0] ?? '').includes('act('),
    );
    expect(lateSetStateErrs).toHaveLength(0);
    errSpy.mockRestore();
  });
});
