/**
 * The entry screen's half of the dead-room recovery: when the page hands it a
 * room-ended offer, show ONE toast that says the room ended and carries a
 * "Play now" button that starts Quick Play.
 */
import React from 'react';
import { renderHook, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { toast, trackGrowthEvent } = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), { dismiss: vi.fn() }),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: toast }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => trackGrowthEvent(...a) }));

import { useRoomEndedOffer } from '../useRoomEndedOffer';
import { consumeRoomEndedRecoveryAccepted, resetRoomEndedRecoveryForTests } from '@/lib/multiplayer/roomEndedRecovery';
import { MP_TOAST_IDS } from '@/utils/multiplayer/mpToastIds';

const t = (k: string) => k;

type Props = { offer: { seq: number } | null };

describe('useRoomEndedOffer', () => {
  beforeEach(() => {
    toast.mockClear(); toast.dismiss.mockClear(); trackGrowthEvent.mockClear();
    resetRoomEndedRecoveryForTests();
  });

  it('GIVEN no offer THEN shows nothing', () => {
    const onShown = vi.fn();
    renderHook(() => useRoomEndedOffer({ offer: null, onShown, onPlayNow: vi.fn(), t }));
    expect(toast).not.toHaveBeenCalled();
    expect(onShown).not.toHaveBeenCalled();
  });

  it('GIVEN an offer THEN shows one room-ended toast on the shared room-gone id and marks it shown', () => {
    const onShown = vi.fn();
    renderHook(() => useRoomEndedOffer({ offer: { seq: 1 }, onShown, onPlayNow: vi.fn(), t }));
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][1]).toMatchObject({ id: MP_TOAST_IDS.roomGone });
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('WHEN Play now is tapped THEN starts Quick Play, dismisses the toast and counts the accept', () => {
    const onPlayNow = vi.fn();
    renderHook(() => useRoomEndedOffer({ offer: { seq: 1 }, onShown: vi.fn(), onPlayNow, t }));
    const renderToast = toast.mock.calls[0][0] as (tt: { id: string }) => React.ReactElement;
    render(renderToast({ id: 'toast-1' }));

    expect(screen.getByText('multiplayerFlow.roomEnded.line')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomEnded.playNow' }));

    expect(onPlayNow).toHaveBeenCalledTimes(1);
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
    expect(trackGrowthEvent).toHaveBeenCalledWith('mp_room_gone_recovery', { stage: 'accepted' });
    expect(consumeRoomEndedRecoveryAccepted()).toBe(true);
  });

  it('GIVEN a second dead room THEN shows the offer again', () => {
    const view = renderHook((p: Props) => useRoomEndedOffer({ offer: p.offer, onShown: vi.fn(), onPlayNow: vi.fn(), t }), {
      initialProps: { offer: { seq: 1 } },
    });
    view.rerender({ offer: null });
    view.rerender({ offer: { seq: 2 } });
    expect(toast).toHaveBeenCalledTimes(2);
  });
});
