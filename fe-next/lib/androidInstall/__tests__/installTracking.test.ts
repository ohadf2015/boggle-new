import { describe, it, expect, beforeEach, vi } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...a: unknown[]) => captureMock(...a) },
}));

import {
  trackInstallPromoShown,
  trackInstallClick,
  trackInstallDismissed,
  trackInstallPillShown,
  trackInstallPillClick,
  trackInstallPillDismissed,
  trackInstallMenuClick,
} from '../installTracking';

beforeEach(() => captureMock.mockClear());

describe('installTracking', () => {
  it('tags the core promo events with a source for funnel attribution', () => {
    trackInstallPromoShown('auto_popup');
    trackInstallClick('menu');
    trackInstallDismissed('pill');
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_shown', { source: 'auto_popup' });
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_install_click', { source: 'menu' });
    expect(captureMock).toHaveBeenCalledWith('android_install_promo_dismissed', { source: 'pill' });
  });

  it('emits dedicated re-entry-surface events', () => {
    trackInstallPillShown();
    trackInstallPillClick();
    trackInstallPillDismissed();
    trackInstallMenuClick();
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_shown');
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_click');
    expect(captureMock).toHaveBeenCalledWith('android_install_pill_dismissed');
    expect(captureMock).toHaveBeenCalledWith('android_install_menu_click');
  });
});
