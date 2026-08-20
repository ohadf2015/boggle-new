/**
 * The guard's own phantom-history pop must not read as a back-button press.
 *
 * Round ends → guard tears down and fires history.go(-1) to remove the phantom
 * entry it pushed. That pop is ASYNCHRONOUS. In Quick Play the next round can
 * mount before it lands (the results screen starts a new round on one tap), and
 * the NEW guard then sees a popstate it did not cause — so word hunt opened
 * "Leave the Hunt?" the instant the board appeared, with the grid unclickable
 * behind the modal.
 */
import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useNavigationGuard } from '../useNavigationGuard';

describe('useNavigationGuard — self-inflicted phantom pop', () => {
  let goSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    goSpy = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores the popstate caused by its own teardown, then guards again', () => {
    // Round 1: guard mounts, pushes the phantom, then the round ends and the
    // component unmounts while STAYING on the page → teardown pops the phantom.
    const first = renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt: () => false }));
    first.unmount();
    expect(goSpy).toHaveBeenCalledWith(-1);

    // Round 2 mounts before the pop lands.
    const onNavigationAttempt = vi.fn(() => false);
    renderHook(() => useNavigationGuard({ enabled: true, onNavigationAttempt }));

    // The pop from round 1 arrives now.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(onNavigationAttempt).not.toHaveBeenCalled();

    // A real back press after that must still be caught.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(onNavigationAttempt).toHaveBeenCalledTimes(1);
  });
});
