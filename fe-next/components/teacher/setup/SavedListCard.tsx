'use client';

import { ClipboardList, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NeoButton } from '@/components/ui/button';
import { NB_BLOCK, NB_ICON_TILE, NB_PANEL_POP, NB_STICKER } from '../nb/nbStyles';

type T = (key: string, params?: Record<string, string | number>) => string;

export type SavedList = { status: 'loading' } | { status: 'ready'; name: string; words: string[] };

const CHIP_LIMIT = 12;
const CHIP = 'inline-flex min-h-8 items-center rounded-neo-pill border-2 border-neo-black bg-neo-cream px-2.5 font-neo-body text-sm font-black text-neo-black shadow-hard';

/** The list the teacher pasted at setup, shown back as chips so the step never asks for the same words twice. */
export function SavedListCard({ list, onChangeWords, t }: { list: SavedList; onChangeWords: () => void; t: T }) {
  const ready = list.status === 'ready' ? list : null;
  const shown = ready ? ready.words.slice(0, CHIP_LIMIT) : [];
  const rest = ready ? ready.words.length - shown.length : 0;
  return (
    <section
      data-testid="saved-list-card"
      aria-busy={ready ? undefined : true}
      aria-labelledby="saved-list-name"
      className={cn(NB_PANEL_POP.cyan, 'flex flex-col gap-2.5 p-3 sm:p-4')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn(NB_ICON_TILE, NB_BLOCK.cyan)} aria-hidden="true">
            <ClipboardList className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-neo-body text-xs font-black uppercase tracking-wide text-neo-cream/70">{t('eduShell.setup.words.title')}</p>
            <h2 id="saved-list-name" data-testid="saved-list-name" dir="auto" className="truncate font-neo-display text-lg font-black leading-tight text-neo-cream sm:text-xl">
              {ready ? ready.name : ' '}
            </h2>
          </div>
        </div>
        {ready ? (
          <span data-testid="saved-list-count" className={cn(NB_STICKER, NB_BLOCK.lime, 'shrink-0')}>
            {t('eduShell.setup.words.count', { count: ready.words.length })}
          </span>
        ) : null}
      </div>

      {ready ? (
        <ul dir="auto" className="flex flex-wrap gap-1.5" aria-label={t('eduShell.setup.words.title')}>
          {shown.map((word) => (
            <li key={word} data-testid="saved-list-chip" className={CHIP}>
              {word}
            </li>
          ))}
          {rest > 0 ? (
            <li data-testid="saved-list-more" className={cn(CHIP, 'bg-neo-navy-light text-neo-cream')}>
              {t('teacher.weekInsight.more', { count: rest })}
            </li>
          ) : null}
        </ul>
      ) : (
        <div className="flex flex-wrap gap-1.5" aria-hidden="true">
          {[64, 80, 56, 72, 60, 88].map((w) => (
            <span key={w} style={{ width: w }} className="h-8 rounded-neo-pill bg-neo-cream/15 motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 font-neo-body text-sm font-semibold text-neo-cream/80 sm:flex-1">{t('eduShell.setup.words.yours')}</p>
        <NeoButton variant="small" tone="navy" data-testid="saved-list-change" onClick={onChangeWords} disabled={!ready} className="min-h-11 shrink-0 self-start sm:self-auto">
          <Pencil className="size-4" aria-hidden="true" />
          {t('eduShell.setup.savedList.change')}
        </NeoButton>
      </div>
    </section>
  );
}

export default SavedListCard;
