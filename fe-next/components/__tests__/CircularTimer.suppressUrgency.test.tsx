/**
 * The gentle-timer dial on the countdown (RED first).
 *
 * A teacher's gentle timer keeps counting but never turns red, pulses, or
 * fires the urgency vignette — the same clamp the cosy accessibility mode
 * applies, ORed in so either source calms the clock.
 */
import React from 'react';
import { render } from '@testing-library/react';
import CircularTimer from '../CircularTimer';

vi.mock('@/utils/preloadResults', () => ({ preloadResultsChunks: vi.fn() }));
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    circle: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <circle {...props}>{children}</circle>
    ),
  },
}));

describe('CircularTimer — suppressUrgency prop (gentle timer dial)', () => {
  it('keeps the ring calm at 3s left when suppressed — a state change re-fires normal', () => {
    // onTimerState only fires on a CHANGE of urgency state. Suppressed starts
    // and stays 'normal' (no call) — assert the clamp by crossing a threshold:
    // unsuppressed 20s→3s lands on critical, suppressed never leaves normal.
    const onTimerState = vi.fn();
    const { rerender } = render(
      <CircularTimer remainingTime={20} totalTime={180} onTimerState={onTimerState} suppressUrgency />
    );
    rerender(<CircularTimer remainingTime={3} totalTime={180} onTimerState={onTimerState} suppressUrgency />);
    const calls = onTimerState.mock.calls.map((c) => c[0]);
    expect(calls).not.toContain('critical');
    expect(calls).not.toContain('veryLow');
    expect(calls).not.toContain('low');
  });

  it('escalates to critical at 3s left when not suppressed', () => {
    const onTimerState = vi.fn();
    render(<CircularTimer remainingTime={3} totalTime={180} onTimerState={onTimerState} />);
    expect(onTimerState).toHaveBeenCalledWith('critical');
  });
});
