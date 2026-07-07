/**
 * cookieConsent — storage-resilience guard.
 *
 * The consent modal (fixed inset-0, blocking) closes only after its
 * Accept/Decline handler runs `setConsentState` to completion. Before this
 * guard, `setConsentState` called `localStorage.setItem` with no try/catch —
 * so in any context where the write throws (iOS Safari private mode, many
 * in-app / social webviews with partitioned or blocked storage) the handler
 * threw before closing the modal, permanently trapping the user behind the
 * consent wall with every Play / Sign-up button unreachable.
 *
 * A consent DECISION must always apply in-session (dispatch the change event so
 * PostHog opts in/out and the modal closes) even when it cannot be PERSISTED.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setConsentState, acceptAll, declineAll, resetConsent } from '../cookieConsent';

const CONSENT_EVENT = 'cookie-consent-change';

describe('cookieConsent — resilience when localStorage.setItem throws', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    // Simulate blocked/partitioned storage: reads work, writes throw.
    setItemSpy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
  });

  afterEach(() => {
    setItemSpy.mockRestore();
  });

  it('setConsentState does not throw when the write fails', () => {
    expect(() => setConsentState({ analytics: true, advertising: true })).not.toThrow();
    expect(setItemSpy).toHaveBeenCalled(); // prove the throwing write path was exercised
  });

  it('setConsentState still dispatches the change event so listeners (PostHog opt-in) fire', () => {
    const handler = vi.fn();
    window.addEventListener(CONSENT_EVENT, handler);
    setConsentState({ analytics: true, advertising: true });
    expect(handler).toHaveBeenCalledTimes(1);
    const detail = (handler.mock.calls[0][0] as CustomEvent).detail;
    expect(detail.analytics).toBe(true);
    window.removeEventListener(CONSENT_EVENT, handler);
  });

  it('acceptAll / declineAll / resetConsent do not throw when the write fails', () => {
    expect(() => acceptAll()).not.toThrow();
    expect(() => declineAll()).not.toThrow();
    expect(() => resetConsent()).not.toThrow();
  });
});
