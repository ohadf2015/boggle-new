import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ExitHintToast from '../ExitHintToast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('ExitHintToast', () => {
  it('shows on lexiclash:exit-hint and hides itself', () => {
    vi.useFakeTimers();
    render(<ExitHintToast />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => { window.dispatchEvent(new CustomEvent('lexiclash:exit-hint')); });
    expect(screen.getByRole('status').textContent).toBe('common.pressBackAgainToExit');
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByRole('status')).toBeNull();
    vi.useRealTimers();
  });

  it('clears the native ad band instead of a hardcoded bottom-24', () => {
    // /he/daily is an Android root route: the first back press shows this toast
    // and does not navigate. bottom-24 (96px) sits inside the nav+banner stack
    // (~114–154px), so the player only sees a sliver behind the SurfaceView ad.
    vi.useFakeTimers();
    render(<ExitHintToast />);
    act(() => { window.dispatchEvent(new CustomEvent('lexiclash:exit-hint')); });
    const toast = screen.getByRole('status');
    expect(toast.className).not.toMatch(/\bbottom-24\b/);
    expect(toast.className).toContain('--bottom-stack-height');
    vi.useRealTimers();
  });
});
