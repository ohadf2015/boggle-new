import { render, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionBanner } from '../ConnectionStatusIndicator';

/**
 * Reconnect button double-tap guard + pending feedback.
 *
 * PostHog rage data: users rapidly re-click the multiplayer reconnect button
 * across he/es/ja. Root cause — `manualReconnect` fired `socket.connect()` on
 * every click with no disabled state and no label change, so the tap produced
 * no visible "I heard you" feedback. These tests lock the button to: on click
 * it (1) disables, (2) swaps to the localized "reconnecting…" label, and
 * (3) cannot re-invoke manualReconnect while a retry is in flight.
 */

const mockSocket = {
  isConnected: false as boolean,
  isReconnecting: false as boolean,
  isServerUpdating: false as boolean,
  connectionError: null as string | null,
  manualReconnect: vi.fn(),
  getReconnectAttempt: () => 0,
  maxReconnectAttempts: 5,
};

vi.mock('@/utils/SocketContext', () => ({
  useSocket: () => ({ ...mockSocket }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

// connectionBannerCopy is pure; let it run for real.

function showBanner() {
  const utils = render(<ConnectionBanner />);
  // Banner only appears after the graduated delay (BANNER_DELAY_MS = 1500ms).
  act(() => { vi.advanceTimersByTime(1600); });
  return utils;
}

function getRetryButton(container: HTMLElement): HTMLButtonElement | null {
  return Array.from(container.querySelectorAll('button')).find(
    (b) => b.textContent?.includes('connection.retryNow') || b.textContent?.includes('connection.reconnecting'),
  ) as HTMLButtonElement | null;
}

describe('ConnectionBanner reconnect button — pending feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSocket.isConnected = false;
    mockSocket.isReconnecting = false;
    mockSocket.connectionError = 'boom'; // disconnected → banner + retry button
    mockSocket.manualReconnect = vi.fn();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the retry button with the retryNow label initially', () => {
    const { container } = showBanner();
    const btn = getRetryButton(container);
    expect(btn).not.toBeNull();
    expect(btn?.disabled).toBe(false);
    expect(btn?.textContent).toContain('connection.retryNow');
  });

  it('on click: calls manualReconnect, disables the button, swaps to the reconnecting label', () => {
    const { container } = showBanner();
    const btn = getRetryButton(container)!;
    act(() => { fireEvent.click(btn); });
    expect(mockSocket.manualReconnect).toHaveBeenCalledTimes(1);
    const after = getRetryButton(container)!;
    expect(after.disabled).toBe(true);
    expect(after.textContent).toContain('connection.reconnecting');
  });

  it('does not re-invoke manualReconnect on a second click while pending', () => {
    const { container } = showBanner();
    const btn = getRetryButton(container)!;
    act(() => { fireEvent.click(btn); });
    act(() => { fireEvent.click(getRetryButton(container)!); });
    expect(mockSocket.manualReconnect).toHaveBeenCalledTimes(1);
  });

  it('during an auto-reconnect, shows the reconnecting label but stays clickable to force a retry', () => {
    // Bad-network users (the rage population) must keep the ability to force a
    // retry while socket.io is auto-retrying — only the brief post-click
    // cooldown disables the button, not the auto-reconnect itself.
    mockSocket.connectionError = null;
    mockSocket.isReconnecting = true; // status === 'reconnecting'
    const { container } = showBanner();
    const btn = getRetryButton(container)!;
    expect(btn.textContent).toContain('connection.reconnecting');
    expect(btn.disabled).toBe(false);
    act(() => { fireEvent.click(btn); });
    expect(mockSocket.manualReconnect).toHaveBeenCalledTimes(1);
    // now in the cooldown bridge → disabled
    expect(getRetryButton(container)!.disabled).toBe(true);
  });

  it('re-enables the button after the pending bridge elapses (so a failed retry can be retried)', () => {
    const { container } = showBanner();
    act(() => { fireEvent.click(getRetryButton(container)!); });
    expect(getRetryButton(container)!.disabled).toBe(true);
    act(() => { vi.advanceTimersByTime(2500); });
    expect(getRetryButton(container)!.disabled).toBe(false);
  });
});
