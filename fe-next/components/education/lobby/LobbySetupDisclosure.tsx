'use client';

import type { ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface LobbySetupDisclosureProps {
  label: string;
  /** One line of what the modal holds, so a teacher can confirm without opening it. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

export function LobbySetupDisclosure({ label, summary, open, onToggle, children }: LobbySetupDisclosureProps) {
  const { t } = useLanguage();
  return (
    <section>
      <button
        type="button"
        data-testid="lobby-setup-summary"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'flex min-h-11 w-full items-center gap-2 rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light px-3 py-2 text-start',
          'font-neo-body text-sm text-neo-cream/70 transition-colors hover:border-neo-cream/50 hover:text-neo-cream',
          focusRing
        )}
      >
        <SlidersHorizontal className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
        <span className="shrink-0 font-bold text-neo-cream">{label}</span>
        <span data-testid="lobby-setup-line" className="hidden min-w-0 flex-1 truncate @lg/lobby:block">{summary}</span>
        <span className="ms-auto shrink-0 rounded-neo border-2 border-neo-cream/50 px-2.5 py-0.5 font-bold text-neo-cream">
          {t('eduShell.host.gameOptionsChange')}
        </span>
      </button>
      <Dialog open={open} onOpenChange={(next) => next !== open && onToggle()}>
        <DialogContent
          hideCloseButton
          style={{ backgroundImage: 'none' }}
          className={cn(
            'flex max-h-[min(92dvh,56rem)] w-[calc(100%-1.5rem)] flex-col overflow-hidden',
            'sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl',
            'border-2 border-neo-cream/40 bg-neo-navy text-neo-cream shadow-hard-lg dark:border-neo-cream/40 dark:bg-neo-navy sm:border-2'
          )}
        >
          <header className="flex items-start gap-3 border-b-2 border-neo-cream/20 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light">
              <SlidersHorizontal className="size-5" strokeWidth={3} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-neo-display text-xl font-black normal-case leading-tight tracking-normal text-neo-cream">{label}</DialogTitle>
              <DialogDescription className="mt-0.5 font-neo-body text-sm text-neo-cream/70">
                {summary}
                <span className="sr-only">. {t('eduShell.host.gameOptionsHint')}</span>
              </DialogDescription>
            </div>
            <DialogClose
              aria-label={t('common.close')}
              title={t('common.close')}
              className={cn('grid size-10 shrink-0 place-items-center rounded-neo border-2 border-neo-cream/40 text-neo-cream hover:bg-neo-navy-light', focusRing)}
            >
              <X className="size-5" strokeWidth={3} aria-hidden="true" />
            </DialogClose>
          </header>
          <div data-testid="lobby-setup-body" className="@container/opts min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            {children}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t-2 border-neo-cream/20 px-5 py-3">
            <p className="font-neo-body text-sm text-neo-cream/70">{t('eduShell.host.gameOptionsHint')}</p>
            <DialogClose
              data-testid="lobby-setup-done"
              className={cn(
                'min-h-11 shrink-0 rounded-neo border-2 border-neo-cream px-6 font-neo-display text-base font-black text-neo-cream',
                'transition-colors hover:bg-neo-navy-light motion-reduce:transition-none',
                focusRing
              )}
            >
              {t('eduShell.host.listDone')}
            </DialogClose>
          </footer>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default LobbySetupDisclosure;
