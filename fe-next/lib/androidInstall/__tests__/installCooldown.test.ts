/**
 * The 14-day "no thanks" cooldown used to live as a private const inside
 * AndroidAppInstallPromo, so the pill never saw it and the popup's own fire-time
 * check read a copy frozen at mount. Both surfaces now go through this module,
 * which reads storage at DECISION time.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  INSTALL_DISMISS_KEY,
  isInstallPromoDismissed,
  persistInstallDismissal,
  readInstallDismissedUntil,
} from '../installCooldown';

describe('install promo cooldown', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is not dismissed when nothing was ever stored', () => {
    expect(readInstallDismissedUntil()).toBeNull();
    expect(isInstallPromoDismissed()).toBe(false);
  });

  it('persists a 14-day cooldown and reports dismissed inside it', () => {
    persistInstallDismissal();

    const until = readInstallDismissedUntil();
    expect(until).toBe(Date.now() + 14 * 86_400_000);
    expect(isInstallPromoDismissed()).toBe(true);

    vi.advanceTimersByTime(13 * 86_400_000);
    expect(isInstallPromoDismissed()).toBe(true);
  });

  it('expires once the cooldown has passed', () => {
    persistInstallDismissal();
    vi.advanceTimersByTime(15 * 86_400_000);
    expect(isInstallPromoDismissed()).toBe(false);
  });

  it('treats an unparseable stored value as not dismissed', () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, 'not-a-number');
    expect(readInstallDismissedUntil()).toBeNull();
    expect(isInstallPromoDismissed()).toBe(false);
  });

  it('keeps the storage key the popup has always written, so live cooldowns survive', () => {
    expect(INSTALL_DISMISS_KEY).toBe('android_app_install_promo_dismissed_until');
  });
});
