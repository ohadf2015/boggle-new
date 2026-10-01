'use client';

import { Check, ClipboardList, Copy, Flag, Loader2, Play, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { LibraryItem } from '@/lib/education/libraryTypes';
import { ItemStats, SourceBadge, coverClass } from './LibraryCard';

export type PreviewBusy = 'host' | 'assign' | 'copy' | null;

interface ListPreviewSheetProps {
  item: LibraryItem | null;
  onClose: () => void;
  busy: PreviewBusy;
  copied: boolean;
  onHost: () => void;
  onAssign: () => void;
  onCopy: () => void;
  onOpenMyLists: () => void;
  onReport: () => void;
}

const ACTION = cn(
  'inline-flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-neo border-3 border-neo-black px-3',
  'font-neo-display text-sm font-bold uppercase text-neo-black shadow-hard transition-all',
  'hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-60 sm:text-base',
);

export default function ListPreviewSheet({ item, onClose, busy, copied, onHost, onAssign, onCopy, onOpenMyLists, onReport }: ListPreviewSheetProps) {
  const { t } = useLanguage();
  const author = item ? (item.source === 'verified' ? 'LexiClash' : item.authorName ?? t('eduLibrary.card.aTeacher')) : '';

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        data-testid="list-preview-sheet"
        hideCloseButton
        className={cn(
          'flex h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-neo-navy p-0 text-neo-white',
          'max-sm:data-[state=open]:animate-none max-sm:data-[state=closed]:animate-none',
          'sm:h-auto sm:max-h-[88dvh] sm:w-[calc(100%-2rem)] sm:max-w-2xl lg:max-w-2xl xl:max-w-2xl sm:rounded-neo-lg sm:border-4 sm:border-neo-cream',
        )}
        style={{ backgroundImage: 'none' }}
      >
        {item && (
          <>
            <header className={cn('relative shrink-0 border-b-3 border-neo-black px-4 pb-3 pt-14 sm:pt-12', coverClass(item))}>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none"
              >
                <X className="size-5" strokeWidth={3} aria-hidden="true" />
              </button>
              <div className="rounded-neo border-3 border-neo-cream bg-neo-navy-light p-3 shadow-hard">
                <DialogTitle dir="auto" className="font-neo-display text-xl font-bold normal-case text-neo-white text-balance sm:text-2xl">
                  {item.name}
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neo-white/80">
                    <SourceBadge item={item} />
                    <span dir="auto">{t('eduLibrary.card.by', { author })}</span>
                    <span className="font-bold tabular-nums text-neo-cyan">{t('eduLibrary.card.words', { count: item.wordCount })}</span>
                    <ItemStats item={item} />
                  </div>
                </DialogDescription>
                {item.description && <p dir="auto" className="mt-2 text-sm text-neo-white/85 text-pretty">{item.description}</p>}
              </div>
            </header>

            <ul data-testid="preview-words" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [columns:1] sm:[columns:2] sm:gap-4">
              {item.words.map((w, i) => (
                <li key={`${i}:${w.word}`} className="mb-1.5 flex break-inside-avoid items-baseline gap-3 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light px-3 py-1.5">
                  <span dir="auto" className="shrink-0 font-neo-body font-bold text-neo-white">{w.word}</span>
                  {w.definition && <span dir="auto" className="min-w-0 flex-1 line-clamp-2 text-end text-xs text-neo-white/70">{w.definition}</span>}
                </li>
              ))}
            </ul>

            <footer className="shrink-0 space-y-2 border-t-3 border-neo-cream/50 bg-neo-navy-light px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button type="button" data-testid="preview-host" onClick={onHost} disabled={busy !== null} className={cn(ACTION, 'col-span-2 bg-neo-lime sm:col-span-1')}>
                  {busy === 'host' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Play className="size-5 fill-current" aria-hidden="true" />}
                  {t('eduLibrary.preview.host')}
                </button>
                <button type="button" data-testid="preview-assign" onClick={onAssign} disabled={busy !== null} className={cn(ACTION, 'bg-neo-cyan')}>
                  {busy === 'assign' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ClipboardList className="size-5" aria-hidden="true" />}
                  {t('eduLibrary.preview.assign')}
                </button>
                {!item.isMine &&
                  (copied ? (
                    <button type="button" data-testid="preview-copied" onClick={onOpenMyLists} className={cn(ACTION, 'bg-neo-yellow motion-safe:animate-neo-pop')}>
                      <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                      {t('eduLibrary.preview.copied')}
                    </button>
                  ) : (
                    <button type="button" data-testid="preview-copy" onClick={onCopy} disabled={busy !== null} className={cn(ACTION, 'bg-neo-cream')}>
                      {busy === 'copy' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                      {t('eduLibrary.preview.copy')}
                    </button>
                  ))}
              </div>
              {copied && <p className="text-center text-xs font-bold text-neo-yellow">{t('eduLibrary.preview.copiedHint')}</p>}
              {item.source === 'teacher' && !item.isMine && (
                <button
                  type="button"
                  data-testid="preview-report"
                  onClick={onReport}
                  className="mx-auto flex min-h-9 items-center gap-1.5 px-2 text-xs font-bold text-neo-white/70 underline-offset-2 hover:text-neo-pink hover:underline"
                >
                  <Flag className="size-3.5" aria-hidden="true" />
                  {t('eduLibrary.report.action')}
                </button>
              )}
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
