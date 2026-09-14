import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BridgeCountdown from '../BridgeCountdown';

describe('BridgeCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T21:15:30.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('shows an hh:mm countdown to the next UTC day with the caller label', () => {
    render(<BridgeCountdown nextLabel="Next bridge in" />);
    expect(screen.getByText(/02:44/)).toBeInTheDocument();
    expect(screen.getByText(/Next bridge in/)).toBeInTheDocument();
  });

  it('ticks down over time', () => {
    render(<BridgeCountdown nextLabel="Next bridge in" />);
    expect(screen.getByText(/02:44/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(screen.getByText(/02:43/)).toBeInTheDocument();
  });
});
