'use client';

import { Check, ClipboardList, Copy, Flag, Loader2, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Dialog } from '@/components/ui/dialog';
import type { LibraryItem } from '@/lib/education/libraryTypes';
import { ItemStats, SourceBadge } from './LibraryCard';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { NbDialogBody, NbDialogContent, NbDialogFooter, NbDialogHeader } from '@/components/teacher/nb/NbDialog';
import { NB_BLOCK, NB_LINK, NB_PRIMARY, NB_SECONDARY, NB_STICKER } from '@/components/teacher/nb/nbStyles';

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

const SECOND = cn(NB_SECONDARY, 'min-w-0 px-3 text-sm sm:text-base');

export default function ListPreviewSheet({ item, onClose, busy, copied, onHost, onAssign, onCopy, onOpenMyLists, onReport }: ListPreviewSheetProps) {
  const { t } = useLanguage();
  const author = item ? (item.source === 'verified' ? 'LexiClash' : item.authorName ?? t('eduLibrary.card.aTeacher')) : '';

  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <NbDialogContent data-testid="list-preview-sheet" size="lg" phone="full">
        {item && (
          <>
            <NbDialogHeader
              title={item.name}
              closeLabel={t('common.close')}
              description={
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                  <SourceBadge item={item} />
                  <span dir="auto">{t('eduLibrary.card.by', { author })}</span>
                  <span lang={item.language} className={cn(NB_STICKER, NB_BLOCK.navy)}>{nativeLanguageName(item.language)}</span>
                  <span className={cn(NB_STICKER, NB_BLOCK.navy, 'tabular-nums')}>{t('eduLibrary.card.words', { count: item.wordCount })}</span>
                  <ItemStats item={item} verbose />
                </span>
              }
            >
              {item.description && <p dir="auto" className="mt-2 font-neo-body text-sm text-neo-cream/85 text-pretty">{item.description}</p>}
            </NbDialogHeader>

            <NbDialogBody>
              <ul data-testid="preview-words" className="[columns:1] sm:[columns:2] sm:gap-3">
                {item.words.map((w, i) => (
                  <li key={`${i}:${w.word}`} className="mb-2 flex break-inside-avoid items-baseline gap-3 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light px-3 py-2">
                    <span dir="auto" className="shrink-0 font-neo-display font-black text-neo-cream">{w.word}</span>
                    {w.definition && <span dir="auto" className="min-w-0 flex-1 text-end font-neo-body text-xs text-neo-cream/75">{w.definition}</span>}
                  </li>
                ))}
              </ul>
            </NbDialogBody>

            <NbDialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                <button type="button" data-testid="preview-host" onClick={onHost} disabled={busy !== null} className={cn(NB_PRIMARY, 'col-span-2 sm:order-last sm:col-span-1')}>
                  {busy === 'host' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Play className="size-5 fill-current" aria-hidden="true" />}
                  {t('eduLibrary.preview.host')}
                </button>
                <button type="button" data-testid="preview-assign" onClick={onAssign} disabled={busy !== null} className={SECOND}>
                  {busy === 'assign' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <ClipboardList className="size-5" aria-hidden="true" />}
                  {t('eduLibrary.preview.assign')}
                </button>
                {!item.isMine &&
                  (copied ? (
                    <button type="button" data-testid="preview-copied" onClick={onOpenMyLists} className={cn(SECOND, 'border-neo-lime motion-safe:animate-neo-pop')}>
                      <Check className="size-5 text-neo-lime" strokeWidth={3} aria-hidden="true" />
                      {t('eduLibrary.preview.copied')}
                    </button>
                  ) : (
                    <button type="button" data-testid="preview-copy" onClick={onCopy} disabled={busy !== null} className={SECOND}>
                      {busy === 'copy' ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Copy className="size-5" aria-hidden="true" />}
                      {t('eduLibrary.preview.copy')}
                    </button>
                  ))}
              </div>
              {copied && <p className="text-center font-neo-body text-xs font-bold text-neo-cream/85">{t('eduLibrary.preview.copiedHint')}</p>}
              {item.source === 'teacher' && !item.isMine && (
                <button type="button" data-testid="preview-report" onClick={onReport} className={cn(NB_LINK, 'mx-auto text-xs')}>
                  <Flag className="size-3.5" aria-hidden="true" />
                  {t('eduLibrary.report.action')}
                </button>
              )}
            </NbDialogFooter>
          </>
        )}
      </NbDialogContent>
    </Dialog>
  );
}
