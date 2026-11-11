'use client';

import type { ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogClose } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_PRIMARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';

export interface LobbySetupDisclosureProps {
  label: string;
  /** One line of what the modal holds, so a teacher can confirm without opening it. */
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy';

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
          'flex min-h-12 w-full items-center gap-2 rounded-neo-lg border-[3px] border-neo-cream/50 bg-neo-navy-light px-3 py-2 text-start shadow-hard',
          'font-neo-body text-sm text-neo-cream/80 transition-transform hover:-translate-y-px motion-reduce:transition-none',
          focusRing,
        )}
      >
        <SlidersHorizontal className="size-5 shrink-0" strokeWidth={3} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-bold text-neo-cream">{label}</span>
          <span data-testid="lobby-setup-line" className="text-xs leading-snug @lg/lobby:text-sm">{summary}</span>
        </span>
        <span className={cn(NB_STICKER, NB_BLOCK.cyan, 'ms-auto shrink-0 text-sm')}>
          {t('eduShell.host.gameOptionsChange')}
        </span>
      </button>
      <Dialog open={open} onOpenChange={(next) => next !== open && onToggle()}>
        <NbDialogContent size="xl" phone="full">
          <NbDialogHeader
            icon={<SlidersHorizontal className="size-6" strokeWidth={3} aria-hidden="true" />}
            title={label}
            description={
              <>
                {summary}
                <span className="sr-only">. {t('eduShell.host.gameOptionsHint')}</span>
              </>
            }
            closeLabel={t('common.close')}
          />
          <NbDialogBody data-testid="lobby-setup-body" className="@container/opts py-5">
            {children}
          </NbDialogBody>
          <NbDialogFooter className="sm:justify-between">
            <p className="hidden font-neo-body text-sm text-neo-cream/75 sm:block">{t('eduShell.host.gameOptionsHint')}</p>
            <DialogClose data-testid="lobby-setup-done" className={cn(NB_PRIMARY, 'w-full sm:w-auto sm:min-w-40')}>
              {t('eduShell.host.listDone')}
            </DialogClose>
          </NbDialogFooter>
        </NbDialogContent>
      </Dialog>
    </section>
  );
}

export default LobbySetupDisclosure;
