'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface HostLeftGraceModalProps {
  /** When true the modal is shown and the countdown begins. */
  isOpen: boolean;
  /** Called when the countdown reaches zero OR the user clicks the manual exit button. Fires at most once per open cycle. */
  onExit: () => void;
  /** Countdown duration. Defaults to 10s — long enough to read what happened, short enough to not feel stuck. */
  seconds?: number;
  /**
   * Discriminator from server-side `hostLeftRoomClosing` payload (audit 2026-05-10).
   * When provided, the modal body uses the reason-specific i18n key so players see
   * "Host didn't return in time" vs "Host moved to a different room" vs the
   * generic fallback. Without it, falls through to the generic body.
   */
  reason?: 'explicit_no_successor' | 'grace_expired' | 'host_switched_room';
}

/**
 * HostLeftGraceModal — soft cushion between server-side `hostLeftRoomClosing`
 * and the player landing back on the lobby. Replaces the prior 4s "Room
 * closed" toast which gave players no time to read or to choose timing.
 * See multiplayer-ux-2026-05-04 #2.
 */
const REASON_TO_KEY: Record<NonNullable<HostLeftGraceModalProps['reason']>, string> = {
  explicit_no_successor: 'multiplayerFlow.hostLeftReason.explicitNoSuccessor',
  grace_expired: 'multiplayerFlow.hostLeftReason.graceExpired',
  host_switched_room: 'multiplayerFlow.hostLeftReason.hostSwitchedRoom',
};

export const HostLeftGraceModal: React.FC<HostLeftGraceModalProps> = ({
  isOpen,
  onExit,
  seconds = 10,
  reason,
}) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleExitNow()}>
      <DialogContent
        noDescription
        dir={dir}
        className="max-w-[380px] p-0 gap-0 border-4 border-neo-black bg-neo-navy"
      >
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-lg font-black uppercase tracking-tight text-neo-pink">
            {t('multiplayerFlow.hostLeftModal.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-neo-white">
            {reason && REASON_TO_KEY[reason]
              ? t(REASON_TO_KEY[reason])
              : t('multiplayerFlow.hostLeftModal.body')}
          </p>
          <p
            data-testid="host-left-countdown"
            role="status"
            aria-live="polite"
            className="text-3xl font-black tabular-nums text-neo-lime font-neo-display"
          >
            {remaining}
          </p>
        </div>
        <div className="px-5 pb-5">
          <button
            data-testid="host-left-exit-now"
            type="button"
            onClick={handleExitNow}
            className="w-full py-3 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-bold text-base uppercase tracking-wide shadow-hard-lg active:shadow-hard-pressed active:translate-x-px active:translate-y-px transition-all"
          >
            {t('multiplayerFlow.hostLeftModal.exitNow')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostLeftGraceModal;
