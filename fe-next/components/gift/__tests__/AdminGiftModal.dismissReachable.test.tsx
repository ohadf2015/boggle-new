/**
 * A long personal gift used to pin the only close control inside the
 * overflow-hidden card. On a phone that card is taller than the viewport, so
 * the X scrolls off-screen and the bottom tabs (z-80, outside the header) are
 * the only way out. The close control must stay on the viewport, above those
 * tabs, and the card itself must scroll.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('react-hot-toast', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ prefersReducedMotion: true, enableGlowEffects: false, isLowEnd: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { AdminGiftModal } from '../AdminGiftModal';

const longGift = {
  id: 'g-personal',
  title: 'A note just for you',
  message: 'personal\n'.repeat(80),
  template_type: 'custom' as const,
  xp_amount: 100,
  coin_amount: 50,
};

describe('AdminGiftModal dismiss stays reachable on a long personal gift', () => {
  it('pins close above the tab bar and outside the clipping card', () => {
    const onDismiss = vi.fn();
    render(
      <AdminGiftModal gift={longGift} show onClaim={vi.fn()} onDismiss={onDismiss} />,
    );

    const close = screen.getByRole('button', { name: /close/i });
    const dialog = screen.getByRole('dialog');
    const card = document.querySelector('.gift-card');

    expect(card).toBeTruthy();
    // X must not live in the transformed, overflow-clipped card — that is what
    // pushed it above the phone viewport.
    expect(card!.contains(close)).toBe(false);
    // Portal so header z-60 cannot trap the dialog under GlobalBottomNav z-80.
    expect(dialog.parentElement).toBe(document.body);
    expect(dialog.className).toContain('z-[90]');
    // Safe-area offset: Android WebView draws edge-to-edge; top-3 sits under the status bar.
    expect(close.className).toMatch(/safe-area-inset-top/);
    // Long message scrolls inside the card; the claim action stays reachable.
    expect(card!.className).toMatch(/overflow-y-auto/);
    expect(card!.className).toMatch(/max-h-/);

    fireEvent.click(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape so a player is never stuck in the popup', () => {
    const onDismiss = vi.fn();
    render(
      <AdminGiftModal gift={longGift} show onClaim={vi.fn()} onDismiss={onDismiss} />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss again after the player already closed', async () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    let resolveClaim: () => void = () => {};
    const onClaim = vi.fn(() => new Promise<void>((resolve) => { resolveClaim = resolve; }));
    render(<AdminGiftModal gift={longGift} show onClaim={onClaim} onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: /gift\.claim/ }));
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    await act(async () => { resolveClaim(); });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
