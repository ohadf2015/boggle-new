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

  it('GIVEN an offer THEN the toast stays until dismissed (no auto-dismiss)', () => {
    renderHook(() => useRoomEndedOffer({ offer: { seq: 1 }, onShown: vi.fn(), onPlayNow: vi.fn(), t }));
    expect(toast.mock.calls[0][1]).toMatchObject({ duration: Infinity });
  });

  it('WHEN Create a room is tapped THEN opens create, dismisses the toast and tracks it', () => {
    const onCreateRoom = vi.fn();
    const onPlayNow = vi.fn();
    renderHook(() => useRoomEndedOffer({ offer: { seq: 1 }, onShown: vi.fn(), onPlayNow, onCreateRoom, t }));
    const renderToast = toast.mock.calls[0][0] as (tt: { id: string }) => React.ReactElement;
    render(renderToast({ id: 'toast-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomEnded.createRoom' }));
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
    expect(onPlayNow).not.toHaveBeenCalled();
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
    expect(trackGrowthEvent).toHaveBeenCalledWith('mp_room_gone_recovery', { stage: 'create_room' });
  });

  it('WHEN the close button is tapped THEN dismisses the toast and tracks dismissed', () => {
    renderHook(() => useRoomEndedOffer({ offer: { seq: 1 }, onShown: vi.fn(), onPlayNow: vi.fn(), t }));
    const renderToast = toast.mock.calls[0][0] as (tt: { id: string }) => React.ReactElement;
    render(renderToast({ id: 'toast-1' }));
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomEnded.dismiss' }));
    expect(toast.dismiss).toHaveBeenCalledWith('toast-1');
    expect(trackGrowthEvent).toHaveBeenCalledWith('mp_room_gone_recovery', { stage: 'dismissed' });
  });

  it('GIVEN the player typed the code THEN says no room has that code (a typo reads the same as an ended room) and resets the flag', () => {
    const typedCodeRef = { current: true };
    renderHook(() => useRoomEndedOffer({ offer: { seq: 1 }, onShown: vi.fn(), onPlayNow: vi.fn(), t, typedCodeRef }));
    const renderToast = toast.mock.calls[0][0] as (tt: { id: string }) => React.ReactElement;
    render(renderToast({ id: 'toast-1' }));
    expect(screen.getByText('multiplayerFlow.roomEnded.noRoom')).toBeTruthy();
    expect(screen.queryByText('multiplayerFlow.roomEnded.line')).toBeNull();
    expect(typedCodeRef.current).toBe(false);
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
