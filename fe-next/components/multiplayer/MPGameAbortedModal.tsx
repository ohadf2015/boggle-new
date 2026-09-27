'use client';

import { Unplug } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useMpExit } from '@/hooks/useMpExit';
import { MpPrimaryCta } from '@/components/multiplayer/shell/MpPrimaryCta';

interface Props {
  wordCount: number;
  onContinueSolo: () => void;
  /**
   * Caller's clean-up before the exit (the host ends the round). The way OUT is
   * always `useMpExit()('aborted')` — the page's in-place reset to the entry.
   */
  onReturnToLobby?: () => void;
  boardSeed: string;
}

/**
 * The connection gave up mid-game. Forces a choice — keep the board solo, or go
 * back to the arenas — so there is no dismiss path. "Back" exits through the
 * one MP exit (DESIGN §b.8: aborted → mpExit), never a view-local route.
 */
export function MPGameAbortedModal({ wordCount, onContinueSolo, onReturnToLobby }: Props) {
  const { t } = useLanguage();
  const exit = useMpExit();

  const returnToArenas = () => {
    onReturnToLobby?.();
    exit('aborted');
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        noDescription
        hideCloseButton
        className="max-w-sm border-4! border-neo-black! rounded-neo-lg! shadow-hard-lg! bg-neo-navy-light! p-0!"
      >
        <DialogTitle className="sr-only">{t('mp.abort.title')}</DialogTitle>
        <div className="flex flex-col items-center gap-5 px-6 py-7 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-neo-black bg-neo-pink shadow-hard-sm animate-mp-stamp" aria-hidden="true">
            <Unplug className="h-7 w-7 text-neo-black" />
          </span>
          <div className="flex flex-col gap-2">
            <p aria-hidden="true" className="font-neo-display text-2xl font-bold uppercase tracking-tight text-neo-white">
              {t('mp.abort.title')}
            </p>
            <p className="font-neo-body text-sm text-neo-white">
              {t('mp.abort.body')}{' '}
              <span className="inline-block rounded-full border-2 border-neo-black bg-neo-lime px-2 font-neo-display font-bold tabular-nums text-neo-black">
                {wordCount}
              </span>
            </p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <MpPrimaryCta tone="cyan" label={t('mp.abort.continueSolo')} onPress={onContinueSolo} testId="mp-abort-continue-solo" />
            <button
              type="button"
              onClick={returnToArenas}
              aria-label={t('mp.abort.returnToLobby')}
              className="w-full min-h-11 rounded-neo border-2 border-neo-black bg-neo-navy px-5 py-3 font-neo-display text-sm font-bold uppercase tracking-wide text-neo-white shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
            >
              {t('mp.abort.returnToLobby')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
