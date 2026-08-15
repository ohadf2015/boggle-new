/**
 * The pill auto-appeared on EVERY page load (store default `pillVisible: true`)
 * and read no cooldown at all, so "no thanks" on the popup silenced the popup
 * for 14 days while the pill came straight back on the next page. Measured on
 * prod for desktop over 7 days: 305 `android_install_pill_shown` across 118
 * sessions (2.58 per session) vs 79 `android_install_promo_shown` across 74
 * (1.07) — the popup behaved, the pill did not.
 */

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AndroidInstallPill from '../AndroidInstallPill';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';
import { persistInstallDismissal } from '@/lib/androidInstall/installCooldown';

vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: vi.fn() } }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/utils/androidApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/androidApp')>();
  return {
    ...actual,
    isCapacitorNative: () => false,
    isStandaloneDisplay: () => false,
  };
});

const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Mount and run out the pill's 1500ms native-bridge settle window. */
function mountPill() {
  render(<AndroidInstallPill />);
  act(() => {
    vi.advanceTimersByTime(2000);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-15T00:00:00Z'));
  localStorage.clear();
  sessionStorage.clear();
  useAndroidInstallStore.setState({ open: false, source: 'auto_popup', pillVisible: true });
  Object.defineProperty(navigator, 'userAgent', { value: DESKTOP_UA, configurable: true });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('AndroidInstallPill — respects the install dismissal cooldown', () => {
  it('shows on a fresh desktop visit', () => {
    mountPill();
    expect(screen.queryByText('androidAppPromo.pillLabel')).toBeInTheDocument();
  });

  it('stays hidden while the 14-day dismissal is active', () => {
    persistInstallDismissal();
    mountPill();
    expect(screen.queryByText('androidAppPromo.pillLabel')).not.toBeInTheDocument();
  });

  it('comes back once the cooldown has expired', () => {
    persistInstallDismissal();
    vi.setSystemTime(new Date('2026-09-15T00:00:00Z'));
    mountPill();
    expect(screen.queryByText('androidAppPromo.pillLabel')).toBeInTheDocument();
  });
});
