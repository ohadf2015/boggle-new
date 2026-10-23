'use client';

import { Unplug } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useMpExit } from '@/hooks/useMpExit';
import { MpPrimaryCta } from '@/components/multiplayer/shell/MpPrimaryCta';
import type { ComponentProps } from 'react';
import type { MPGameAbortedModal } from '@/components/multiplayer/MPGameAbortedModal';

export type EduAbortedModalProps = ComponentProps<typeof MPGameAbortedModal>;

/** A classroom round that lost its connection has one way out: back to class, never a solo game. */
export default function EduAbortedModal({ wordCount, onReturnToLobby }: EduAbortedModalProps) {
  const { t } = useLanguage();
  const exit = useMpExit();

  const backToClass = () => {
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
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-neo-black bg-neo-pink shadow-hard-sm" aria-hidden="true">
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
          <MpPrimaryCta tone="cyan" label={t('eduLive.results.backToClass')} onPress={backToClass} testId="edu-abort-back-to-class" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
