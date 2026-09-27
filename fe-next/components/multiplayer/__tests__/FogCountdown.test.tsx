import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FogCountdown } from '../WheelRushView';

describe('FogCountdown (MP perf — ref-driven, no re-render)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the initial remaining seconds', () => {
    render(<FogCountdown endsAt={10_000} />);
    expect(screen.getByTestId('fog-countdown').textContent).toBe('10s');
  });

  it('updates the displayed seconds as time advances without a React re-render', () => {
    render(<FogCountdown endsAt={10_000} />);
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByTestId('fog-countdown').textContent).toBe('7s');
  });

  it('clamps at 0s once the fog window has elapsed', () => {
    render(<FogCountdown endsAt={2_000} />);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByTestId('fog-countdown').textContent).toBe('0s');
  });
});
