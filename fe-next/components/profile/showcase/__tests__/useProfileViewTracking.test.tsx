import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const trackProfileViewed = vi.hoisted(() => vi.fn());
vi.mock('@/lib/avatar/avatarTelemetry', () => ({ trackProfileViewed }));

import { useProfileViewTracking } from '../useProfileViewTracking';

describe('useProfileViewTracking', () => {
  beforeEach(() => {
    trackProfileViewed.mockClear();
    window.history.replaceState(null, '', '/en/profile?from=header');
  });

  it('Given not ready (auth still loading), Then nothing fires', () => {
    renderHook(() => useProfileViewTracking({ profileKey: 'u1', isOwn: false, ready: false }));
    expect(trackProfileViewed).not.toHaveBeenCalled();
  });

  it('Given ready, Then fires once with the ?from source, even across re-renders and isOwn flips', () => {
    const { rerender } = renderHook(
      (p: { isOwn: boolean }) => useProfileViewTracking({ profileKey: 'u1', isOwn: p.isOwn, ready: true }),
      { initialProps: { isOwn: true } },
    );
    rerender({ isOwn: false });
    rerender({ isOwn: true });
    expect(trackProfileViewed).toHaveBeenCalledTimes(1);
    expect(trackProfileViewed).toHaveBeenCalledWith('header', true);
  });

  it('Given a different profile, Then it fires again; no source means direct', () => {
    window.history.replaceState(null, '', '/en/u/ron');
    const { rerender } = renderHook(
      (p: { key: string }) => useProfileViewTracking({ profileKey: p.key, isOwn: false, ready: true }),
      { initialProps: { key: 'a' } },
    );
    rerender({ key: 'b' });
    expect(trackProfileViewed).toHaveBeenCalledTimes(2);
    expect(trackProfileViewed).toHaveBeenLastCalledWith('direct', false);
  });

  it('Given no profile key yet, Then waits', () => {
    renderHook(() => useProfileViewTracking({ profileKey: null, isOwn: true, ready: true }));
    expect(trackProfileViewed).not.toHaveBeenCalled();
  });
});
