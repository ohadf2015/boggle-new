'use client';

/**
 * Entry-screen half of the dead-room recovery (`lib/multiplayer/roomEndedRecovery`).
 *
 * The page (useMpRoomSocket) decides an arcade player whose room is gone should
 * be offered Quick Play and hands the entry screen an offer; this shows it as
 * ONE toast — "That room has ended" plus a "Play now" button — on the shared
 * room-gone toast id, so a run of dead-room taps still collapses to one.
 *
 * A toast rather than an inline card: the MP entry is a no-scroll MpScreen, and
 * an overlay changes no layout there or under the CrazyGames hero.
 */
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { markRoomEndedRecoveryAccepted } from '@/lib/multiplayer/roomEndedRecovery';
import { MP_TOAST_IDS } from '@/utils/multiplayer/mpToastIds';

/** Long enough to read a sentence and reach the button on a phone. */
export const ROOM_ENDED_OFFER_DURATION_MS = 10_000;

interface UseRoomEndedOfferInput {
  /** A fresh object per dead room; null when there is nothing to offer. */
  offer: { seq: number } | null;
  /** The offer is on screen — the page clears it so it shows once. */
  onShown?: () => void;
  /** Start Quick Play (the entry's own handler). */
  onPlayNow: () => void;
  t: (key: string) => string;
}

export function useRoomEndedOffer({ offer, onShown, onPlayNow, t }: UseRoomEndedOfferInput): void {
  // The toast outlives this render; read the latest handlers when tapped.
  const latest = useRef({ onShown, onPlayNow, t });
  useEffect(() => {
    latest.current = { onShown, onPlayNow, t };
  });

  const seq = offer?.seq ?? null;
  useEffect(() => {
    if (seq === null) return;
    const { t: tr } = latest.current;
    toast(
      (tt) => (
        <span className="flex items-center gap-3 font-neo-body text-sm">
          <span>{tr('multiplayerFlow.roomEnded.line')}</span>
          <button
            type="button"
            onClick={() => {
              toast.dismiss(tt.id);
              markRoomEndedRecoveryAccepted();
              trackGrowthEvent('mp_room_gone_recovery', { stage: 'accepted' });
              latest.current.onPlayNow();
            }}
            className="shrink-0 rounded-neo border-2 border-neo-black bg-neo-lime px-3 py-1.5 font-neo-display font-bold uppercase tracking-tight text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed"
          >
            {tr('multiplayerFlow.roomEnded.playNow')}
          </button>
        </span>
      ),
      { id: MP_TOAST_IDS.roomGone, duration: ROOM_ENDED_OFFER_DURATION_MS, icon: '🎲' },
    );
    latest.current.onShown?.();
  }, [seq]);
}
