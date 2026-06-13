// @vitest-environment happy-dom
/**
 * usePostHogFlag — the optional `initialValue` lets callers seed the first
 * render's state (e.g. from a cookie) so the bucketed variant shows on paint #1
 * instead of waiting for the async PostHog flag fetch.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// No `getFeatureFlag` on the mock → the hook's effect early-returns, so state
// stays at whatever we seeded (isolates the initial-value behaviour under test).
vi.mock('posthog-js', () => ({ default: {} }));

import { usePostHogFlag } from '../usePostHogFlag';

describe('usePostHogFlag initialValue', () => {
  it('applies initialValue (post-mount) when provided', () => {
    const { result } = renderHook(() =>
      usePostHogFlag('some-flag', 'control', 'cubes'),
    );
    expect(result.current).toBe('cubes');
  });

  it('falls back to defaultValue when initialValue is omitted', () => {
    const { result } = renderHook(() => usePostHogFlag('some-flag', 'control'));
    expect(result.current).toBe('control');
  });
});
