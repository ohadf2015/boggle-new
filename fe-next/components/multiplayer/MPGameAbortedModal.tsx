'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface Props {
  wordCount: number;
  onContinueSolo: () => void;
  onReturnToLobby: () => void;
  boardSeed: string;
}

export function MPGameAbortedModal({ wordCount, onContinueSolo, onReturnToLobby }: Props){
  const { t } = useLanguage();

  return (
    // Forces a choice (continue solo / return to lobby) — no dismiss path, so onOpenChange is a no-op.
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        noDescription
        hideCloseButton
        className="max-w-sm border-2! rounded-neo! shadow-none! bg-neo-navy! border-neo-white/20!"
      >
        <DialogTitle className="sr-only">{t('mp.abort.title')}</DialogTitle>
        <div className="flex flex-col items-center gap-6 px-8 py-10 text-center">
          <div className="flex flex-col gap-2">
            <p aria-hidden="true" className="font-neo-display text-xl font-bold text-neo-white">
              {t('mp.abort.title')}
            </p>
            <p className="font-neo-body text-neo-white text-sm">
              {t('mp.abort.body')} {wordCount}
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button type="button"
              onClick={onContinueSolo}
              aria-label={t('mp.abort.continueSolo')}
              className="w-full px-5 py-3 font-neo-body text-sm font-bold text-neo-navy bg-neo-cyan border-2 border-neo-cyan rounded-neo hover:bg-neo-cyan/80 transition-colors"
            >
              {t('mp.abort.continueSolo')}
            </button>
            <button type="button"
              onClick={onReturnToLobby}
              aria-label={t('mp.abort.returnToLobby')}
              className="w-full px-5 py-3 font-neo-body text-sm text-neo-white border border-neo-white/20 rounded-neo hover:border-neo-white/40 transition-colors"
            >
              {t('mp.abort.returnToLobby')}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
