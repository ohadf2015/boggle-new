/**
 * ComboDisplayConnected — owns the useComboTimer subscription so the
 * 10 Hz RAF-driven combo-timer state never propagates up the parent chain.
 *
 * Mirrors the OpponentWordFeedConnected pattern (PR #450).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

// Capture the args useComboTimer is called with, return controllable output.
const useComboTimerMock = vi.fn();
vi.mock('@/player/hooks/useComboTimer', () => ({
  useComboTimer: (...args: unknown[]) => useComboTimerMock(...args),
}));

// Lightweight ComboDisplay stub — surfaces props as data attrs so we can assert
// the connected wrapper passes the hook's output through unchanged.
vi.mock('../ComboDisplay', () => ({
  __esModule: true,
  default: ({ comboLevel, timeRemaining, isDanger, compact }: {
    comboLevel: number;
    timeRemaining: number | null;
    isDanger: boolean;
    compact?: boolean;
  }) => (
    <div
      data-testid="combo-display"
      data-combo-level={comboLevel}
      data-time-remaining={timeRemaining === null ? 'null' : String(timeRemaining)}
      data-is-danger={String(isDanger)}
      data-compact={String(!!compact)}
    />
  ),
}));

import { ComboDisplayConnected } from '../ComboDisplayConnected';

describe('ComboDisplayConnected', () => {
  beforeEach(() => {
    useComboTimerMock.mockReset();
    useComboTimerMock.mockReturnValue({ comboTimeRemaining: null, comboDanger: false });
  });

  it('calls useComboTimer with comboLevel + lastWordTime from props', () => {
    render(<ComboDisplayConnected comboLevel={3} lastWordTime={1000} />);
    expect(useComboTimerMock).toHaveBeenCalledWith(3, 1000);
  });

  it('forwards the hook output to ComboDisplay', () => {
    useComboTimerMock.mockReturnValue({ comboTimeRemaining: 42, comboDanger: true });
    render(<ComboDisplayConnected comboLevel={5} lastWordTime={2000} compact />);

    const display = screen.getByTestId('combo-display');
    expect(display.dataset.comboLevel).toBe('5');
    expect(display.dataset.timeRemaining).toBe('42');
    expect(display.dataset.isDanger).toBe('true');
    expect(display.dataset.compact).toBe('true');
  });

  it('passes null lastWordTime through unchanged', () => {
    render(<ComboDisplayConnected comboLevel={0} lastWordTime={null} />);
    expect(useComboTimerMock).toHaveBeenCalledWith(0, null);
  });

  it('is memoised — stable comboLevel + lastWordTime do not re-run useComboTimer eagerly', () => {
    // Render with combo state; re-render with identical props.
    const { rerender } = render(
      <ComboDisplayConnected comboLevel={3} lastWordTime={1000} />,
    );
    const callsAfterFirst = useComboTimerMock.mock.calls.length;

    rerender(<ComboDisplayConnected comboLevel={3} lastWordTime={1000} />);
    // memo() short-circuits identical props, so the second render is skipped
    // and useComboTimer fires only once.
    expect(useComboTimerMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
