/**
 * useConsentDecided tests.
 *
 * Gates engagement modals (signup prompt, email capture, push prompt) so they
 * don't auto-open while the cookie-consent decision is still pending. The flag
 * must flip reactively when the user accepts/declines, and flip back on reset.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockHas = vi.fn<() => boolean>();
let consentCb: ((state: unknown) => void) | null = null;

vi.mock('@/utils/cookieConsent', () => ({
  hasConsentDecision: () => mockHas(),
  onConsentChange: (cb: (state: unknown) => void) => {
    consentCb = cb;
    return () => {
      consentCb = null;
    };
  },
}));

import { useConsentDecided } from '../useConsentDecided';

beforeEach(() => {
  mockHas.mockReturnValue(false);
  consentCb = null;
});

describe('useConsentDecided', () => {
  it('returns false when no consent decision exists', () => {
    mockHas.mockReturnValue(false);
    const { result } = renderHook(() => useConsentDecided());
    expect(result.current).toBe(false);
  });

  it('returns true when a consent decision already exists', () => {
    mockHas.mockReturnValue(true);
    const { result } = renderHook(() => useConsentDecided());
    expect(result.current).toBe(true);
  });

  it('flips to true when a consent decision is made (onConsentChange fires)', () => {
    mockHas.mockReturnValue(false);
    const { result } = renderHook(() => useConsentDecided());
    expect(result.current).toBe(false);

    mockHas.mockReturnValue(true);
    act(() => {
      consentCb?.({});
    });
    expect(result.current).toBe(true);
  });

  it('flips back to false when consent is reset', () => {
    mockHas.mockReturnValue(true);
    const { result } = renderHook(() => useConsentDecided());
    expect(result.current).toBe(true);

    mockHas.mockReturnValue(false);
    act(() => {
      consentCb?.({});
    });
    expect(result.current).toBe(false);
  });

  it('subscribes to consent changes and unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useConsentDecided());
    expect(consentCb).not.toBeNull();
    unmount();
    expect(consentCb).toBeNull();
  });
});
