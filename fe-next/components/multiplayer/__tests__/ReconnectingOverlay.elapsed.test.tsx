/**
 * DESIGN §b.8: the reconnect overlay dims the CURRENT screen in place, shows
 * how long we have been trying, and offers a way back to the arenas after 8s
 * even if the socket is still counting early attempts. No backdrop blur (perf
 * rule 7 / anti-glassmorphism).
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));

import { ReconnectingOverlay } from '../ReconnectingOverlay';

describe('ReconnectingOverlay — elapsed time', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the seconds spent reconnecting and counts up', () => {
    render(<ReconnectingOverlay attempt={1} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.getByTestId('reconnect-elapsed').textContent).toContain('"seconds":0');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('reconnect-elapsed').textContent).toContain('"seconds":3');
  });

  it('offers the way back after 8s even on an early attempt', () => {
    render(<ReconnectingOverlay attempt={1} maxAttempts={30} onGiveUp={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /mp\.reconnect\.giveUp/ })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(screen.queryByRole('button', { name: /mp\.reconnect\.giveUp/ })).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: /mp\.reconnect\.giveUp/ })).toBeInTheDocument();
  });

  it('dims in place without a backdrop blur', () => {
    render(<ReconnectingOverlay attempt={1} maxAttempts={30} onGiveUp={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).not.toMatch(/backdrop-blur/);
  });
});
