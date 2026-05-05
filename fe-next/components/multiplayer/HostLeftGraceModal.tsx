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
}

/**
 * HostLeftGraceModal — soft cushion between server-side `hostLeftRoomClosing`
 * and the player landing back on the lobby. Replaces the prior 4s "Room
 * closed" toast which gave players no time to read or to choose timing.
 * See multiplayer-ux-2026-05-04 #2.
 */
export const HostLeftGraceModal: React.FC<HostLeftGraceModalProps> = ({
  isOpen,
  onExit,
  seconds = 10,
}) => {
  const { t, dir } = useLanguage();
  const [remaining, setRemaining] = useState<number>(seconds);
  const firedRef = useRef<boolean>(false);

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
            onExit();
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, seconds, onExit]);

  const handleExitNow = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onExit();
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
          <p className="text-sm text-neo-cream/85">
            {t('multiplayerFlow.hostLeftModal.body')}
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
