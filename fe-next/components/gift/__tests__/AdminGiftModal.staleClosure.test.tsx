/**
 * AdminGiftModal - Stale Closure Bug Test
 *
 * Bug: After claiming a gift, the setTimeout(onDismiss, 1500) was capturing
 * a stale reference to onDismiss. When onDismiss was called 1.5s later,
 * it used the OLD callback that had the old gifts array in its closure.
 *
 * Fix: Use a ref (onDismissRef) to always get the latest callback.
 */

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdminGiftModal } from '../AdminGiftModal';

// Mock hooks
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: true, // Skip animations to go straight to ready
    enableGlowEffects: false,
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    isRTL: false,
  }),
}));

vi.mock('@/utils/confettiUtils', () => ({
  fireConfetti: vi.fn(),
}));

// Mock GSAP
vi.mock('gsap', () => ({
  context: () => ({ revert: vi.fn() }),
  timeline: () => ({
    to: () => ({ to: () => ({ from: () => ({ from: () => ({ from: () => {} }) }) }) }),
    from: () => ({ from: () => {} }),
    kill: vi.fn(),
  }),
}));

describe('AdminGiftModal - Stale Closure Fix', () => {
  const mockGift = {
    id: 'gift-1',
    title: 'Test Gift',
    message: 'Test message',
    template_type: 'top_player' as const,
    xp_amount: 100,
    coin_amount: 50,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should use the latest onDismiss callback, not a stale closure', async () => {
    // Track which version of onDismiss was called
    const callLog: string[] = [];

    const onDismissV1 = vi.fn(() => callLog.push('v1'));
    const onDismissV2 = vi.fn(() => callLog.push('v2'));
    const onClaim = vi.fn().mockResolvedValue(undefined);

    // Render with initial onDismiss
    const { rerender } = render(
      <AdminGiftModal
        gift={mockGift}
        show={true}
        onClaim={onClaim}
        onDismiss={onDismissV1}
        currentXp={0}
        currentCoins={0}
      />
    );

    // Wait for ready state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /claim/i })).toBeInTheDocument();
    });

    // Click claim button
    const claimButton = screen.getByRole('button', { name: /claim/i });
    await act(async () => {
      fireEvent.click(claimButton);
    });

    // Wait for onClaim to be called
    await waitFor(() => {
      expect(onClaim).toHaveBeenCalled();
    });

    // CRITICAL: Before the 1.5s timeout fires, update onDismiss prop
    // This simulates what happens when Header re-renders with new gifts array
    rerender(
      <AdminGiftModal
        gift={mockGift}
        show={true}
        onClaim={onClaim}
        onDismiss={onDismissV2} // NEW callback
        currentXp={0}
        currentCoins={0}
      />
    );

    // Advance timer past the 1.5s auto-dismiss
    act(() => {
      vi.advanceTimersByTime(1600);
    });

    // BUG (before fix): v1 would be called because setTimeout captured stale reference
    // FIX: v2 should be called because we use ref to get latest callback
    expect(callLog).toContain('v2');
    expect(callLog).not.toContain('v1');
    expect(onDismissV2).toHaveBeenCalled();
    expect(onDismissV1).not.toHaveBeenCalled();
  });
});
