/**
 * useSharePromptImpression tests — share-prompt-timing A/B exposure telemetry.
 *
 * Ensures share_win_prompt_shown fires exactly once per session with the
 * resolved variant, so PostHog funnel can split share rate by arm.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockTrack = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrack(...args),
}));

import { useSharePromptImpression } from '../useSharePromptImpression';

beforeEach(() => {
  mockTrack.mockClear();
  if (typeof window !== 'undefined') {
    window.sessionStorage.clear();
  }
});

describe('useSharePromptImpression', () => {
  it('emits share_win_prompt_shown with variant when enabled', () => {
    renderHook(() =>
      useSharePromptImpression({ variant: 'immediate', enabled: true })
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('share_win_prompt_shown', {
      variant: 'immediate',
    });
  });

  it('emits with results-page variant', () => {
    renderHook(() =>
      useSharePromptImpression({ variant: 'results-page', enabled: true })
    );
    expect(mockTrack).toHaveBeenCalledWith('share_win_prompt_shown', {
      variant: 'results-page',
    });
  });

  it('does NOT emit when disabled', () => {
    renderHook(() =>
      useSharePromptImpression({ variant: 'immediate', enabled: false })
    );
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('does NOT emit twice across re-renders', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useSharePromptImpression({ variant: 'immediate', enabled }),
      { initialProps: { enabled: true } }
    );
    rerender({ enabled: true });
    rerender({ enabled: true });
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it('does NOT emit twice across separate mounts (sessionStorage guard)', () => {
    const { unmount } = renderHook(() =>
      useSharePromptImpression({ variant: 'immediate', enabled: true })
    );
    unmount();
    renderHook(() =>
      useSharePromptImpression({ variant: 'immediate', enabled: true })
    );
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });
});
