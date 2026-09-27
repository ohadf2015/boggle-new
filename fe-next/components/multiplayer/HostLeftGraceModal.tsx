'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DoorOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface HostLeftGraceModalProps {
  /** When true the banner is shown and the countdown begins. */
  isOpen: boolean;
  /** Called when the countdown reaches zero OR the user taps the exit button. Fires at most once per open cycle. */
  onExit: () => void;
  /** Countdown duration. Defaults to 10s — long enough to read what happened, short enough to not feel stuck. */
  seconds?: number;
  /**
   * Discriminator from server-side `hostLeftRoomClosing` payload (audit 2026-05-10).
   * When provided, the body uses the reason-specific i18n key so players see
   * "Host didn't return in time" vs "Host moved to a different room" vs the
   * generic fallback. Without it, falls through to the generic body.
   */
  reason?: 'explicit_no_successor' | 'grace_expired' | 'host_switched_room';
}

const REASON_TO_KEY: Record<NonNullable<HostLeftGraceModalProps['reason']>, string> = {
  explicit_no_successor: 'multiplayerFlow.hostLeftReason.explicitNoSuccessor',
  grace_expired: 'multiplayerFlow.hostLeftReason.graceExpired',
  host_switched_room: 'multiplayerFlow.hostLeftReason.hostSwitchedRoom',
};

/**
 * HostLeftGraceModal — the soft cushion between server-side `hostLeftRoomClosing`
 * and the player landing back on the arenas (multiplayer-ux-2026-05-04 #2).
 *
 * MP rebuild (DESIGN §b.8): an in-shell BANNER docked over the top of the
 * current screen, not a page modal — the room stays visible, nothing is
 * focus-trapped, no scrim. Name and props are kept: the frozen PageClient
 * lazy-loads it as `HostLeftGraceModal` and owns the exit (in-place reset,
 * classroom hub). The server only emits the room-CLOSING case today; there is
 * no "you're the host now" event wired, so this banner has one variant.
 */
export const HostLeftGraceModal: React.FC<HostLeftGraceModalProps> = ({ isOpen, onExit, seconds = 10, reason }) => {
  const { t, dir } = useLanguage();
  const [remaining, setRemaining] = useState<number>(seconds);
  const firedRef = useRef<boolean>(false);

  // Keep the freshest onExit without putting it in the interval effect's deps —
  // an inline onExit from the parent changes identity every render, which would
  // otherwise tear down + restart the countdown (and visually snap it back).
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    if (!isOpen) return;
    setRemaining(seconds);
    firedRef.current = false;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          if (!firedRef.current) {
            firedRef.current = true;
            onExitRef.current();
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, seconds]);

  const handleExitNow = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onExitRef.current();
  };

  if (!isOpen) return null;

  const body = reason && REASON_TO_KEY[reason] ? t(REASON_TO_KEY[reason]) : t('multiplayerFlow.hostLeftModal.body');

  return (
    <div
      data-testid="host-left-banner"
      dir={dir}
      className="fixed inset-x-0 top-0 z-[70] px-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-[calc(640px*var(--mp-u,1))] items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-pink px-3 py-2.5 text-neo-black shadow-hard animate-mp-drop">
        <span
          data-testid="host-left-countdown"
          role="status"
          aria-live="polite"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-3 border-neo-black bg-neo-navy font-neo-display text-xl font-bold tabular-nums text-neo-lime"
        >
          <span key={remaining} className="animate-mp-punch">{remaining}</span>
        </span>
        <div role="alert" className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-neo-display text-base font-bold uppercase leading-tight tracking-tight">
            <DoorOpen aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{t('multiplayerFlow.hostLeftModal.title')}</span>
          </p>
          <p className="text-xs font-bold leading-snug line-clamp-2">{body}</p>
          <p className="text-[11px] font-neo-body opacity-80">{t('mpUi.entry.hostLeftIn', { seconds: remaining })}</p>
        </div>
        <button
          data-testid="host-left-exit-now"
          type="button"
          onClick={handleExitNow}
          className="shrink-0 min-h-11 rounded-neo border-3 border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-bold uppercase tracking-wide text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
        >
          {t('multiplayerFlow.hostLeftModal.exitNow')}
        </button>
      </div>
    </div>
  );
};

export default HostLeftGraceModal;
