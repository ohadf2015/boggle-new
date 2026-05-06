/**
 * useExperiment — typed wrapper around usePostHogFlag.
 *
 * Why a wrapper:
 *  - Type-safe variant union (compile-time guard).
 *  - Auto-applies registry default (no per-call-site fallback string).
 *  - Optional `experiment_exposed` event that fires only when caller
 *    confirms the variant UI actually mounted (avoids inflating exposure
 *    counts with users who hit the route but never saw the variant).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockFlagValue = vi.fn<(key: string, fallback: string) => string>();
vi.mock('@/hooks/usePostHogFlag', () => ({
  usePostHogFlag: (key: string, fallback: string) => mockFlagValue(key, fallback),
}));

const mockCapture = vi.fn();
vi.mock('posthog-js', () => ({
  default: {
    capture: (...args: unknown[]) => mockCapture(...args),
  },
}));

const mockUseAuth = vi.fn<() => { user: { email?: string | null } | null }>();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useExperiment } from '../useExperiment';
import { EXPERIMENTS } from '@/lib/experiments';

describe('useExperiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('returns the registry default when the flag returns the fallback', () => {
    mockFlagValue.mockImplementation((_key, fallback) => fallback);
    const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));
    expect(result.current.variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
  });

  it('forwards the registry default as the fallback to usePostHogFlag', () => {
    mockFlagValue.mockReturnValue('value-prop');
    renderHook(() => useExperiment('signup-prompt-cta-copy'));
    expect(mockFlagValue).toHaveBeenCalledWith(
      'signup-prompt-cta-copy',
      EXPERIMENTS['signup-prompt-cta-copy'].default,
    );
  });

  it('returns the live variant when posthog provides one', () => {
    mockFlagValue.mockReturnValue('value-prop');
    const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));
    expect(result.current.variant).toBe('value-prop');
  });

  it('coerces an unknown variant string to the default (defensive)', () => {
    mockFlagValue.mockReturnValue('__rogue__');
    const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));
    expect(result.current.variant).toBe(EXPERIMENTS['signup-prompt-cta-copy'].default);
  });

  it('exposes a trackExposure() that fires experiment_exposed once per mount', () => {
    mockFlagValue.mockReturnValue('value-prop');
    const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));

    result.current.trackExposure();
    result.current.trackExposure();

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('experiment_exposed', {
      experiment: 'signup-prompt-cta-copy',
      variant: 'value-prop',
    });
  });

  describe('email overrides', () => {
    it('still uses the live posthog variant when authed email is not on the allowlist', () => {
      mockFlagValue.mockReturnValue('value-prop');
      mockUseAuth.mockReturnValue({ user: { email: 'random@x.com' } });
      const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));
      expect(result.current.variant).toBe('value-prop');
    });

    it('falls back to default when no email is authed and posthog has not assigned', () => {
      mockFlagValue.mockImplementation((_key, fallback) => fallback);
      mockUseAuth.mockReturnValue({ user: null });
      const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));
      expect(result.current.variant).toBe('control');
    });
  });

  it('trackExposure does not fire when variant is still the default fallback', () => {
    // SDK not loaded — variant === default. Don't pollute stats with users
    // who never actually got assigned a real variant.
    mockFlagValue.mockImplementation((_key, fallback) => fallback);
    const { result } = renderHook(() => useExperiment('signup-prompt-cta-copy'));
    result.current.trackExposure();
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
