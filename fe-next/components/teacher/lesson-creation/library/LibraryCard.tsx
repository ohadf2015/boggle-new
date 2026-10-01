'use client';

import { BadgeCheck, Copy, Play, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/education/libraryTypes';

const COVERS = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-purple', 'bg-neo-yellow', 'bg-neo-orange'];

/** Stable per-list cover colour, so a grid of same-topic lists still reads as different sets. */
export function coverClass(item: Pick<LibraryItem, 'id'>): string {
  let h = 0;
  for (let i = 0; i < item.id.length; i++) h = (h * 31 + item.id.charCodeAt(i)) >>> 0;
  return COVERS[h % COVERS.length];
}

export function SourceBadge({ item, className }: { item: Pick<LibraryItem, 'source' | 'isMine'>; className?: string }) {
  const { t } = useLanguage();
  if (item.isMine) {
    return (
      <span className={cn('inline-flex items-center gap-1 rounded border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 text-[10px] font-black uppercase text-neo-black', className)}>
        {t('eduLibrary.badge.yours')}
      </span>
    );
  }
  return item.source === 'verified' ? (
    <span className={cn('inline-flex items-center gap-1 rounded border-2 border-neo-black bg-neo-cyan px-1.5 py-0.5 text-[10px] font-black uppercase text-neo-black', className)}>
      <BadgeCheck className="size-3" strokeWidth={3} aria-hidden="true" />
      {t('eduLibrary.badge.verified')}
    </span>
  ) : (
    <span className={cn('inline-flex items-center gap-1 rounded border-2 border-neo-black bg-neo-pink px-1.5 py-0.5 text-[10px] font-black uppercase text-neo-black', className)}>
      <User className="size-3" strokeWidth={3} aria-hidden="true" />
      {t('eduLibrary.badge.teacher')}
    </span>
  );
}

export function ItemStats({ item, className }: { item: LibraryItem; className?: string }) {
  const { t } = useLanguage();
  if (item.source !== 'teacher' || item.playCount === null || item.copyCount === null) return null;
  if (item.playCount === 0 && item.copyCount === 0) {
    return <span className={cn('text-[11px] font-black uppercase text-neo-lime', className)}>{t('eduLibrary.card.new')}</span>;
  }
  return (
    <span className={cn('inline-flex items-center gap-2 text-[11px] font-bold tabular-nums text-neo-white/80', className)}>
      <span className="inline-flex items-center gap-0.5" aria-label={t('eduLibrary.card.plays', { count: item.playCount })}>
        <Play className="size-3 fill-current" aria-hidden="true" />
        {item.playCount}
      </span>
      <span className="inline-flex items-center gap-0.5" aria-label={t('eduLibrary.card.copies', { count: item.copyCount })}>
        <Copy className="size-3" aria-hidden="true" />
        {item.copyCount}
      </span>
    </span>
  );
}

interface LibraryCardProps {
  item: LibraryItem;
  index: number;
  onOpen: () => void;
}

export default function LibraryCard({ item, index, onOpen }: LibraryCardProps) {
  const { t } = useLanguage();
  const sample = item.words[0]?.word ?? '';
  const author = item.source === 'verified' ? 'LexiClash' : item.authorName ?? t('eduLibrary.card.aTeacher');

  return (
    <button
      type="button"
      data-testid="library-card"
      onClick={onOpen}
      style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
      className={cn(
        'group flex min-w-0 flex-col overflow-hidden rounded-neo border-3 border-neo-cream bg-neo-navy-light text-start shadow-hard',
        'transition-transform duration-150 hover:-translate-y-1 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-sm',
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan motion-safe:animate-pop-in [animation-fill-mode:both]',
      )}
    >
      <div className={cn('relative h-16 shrink-0 overflow-hidden border-b-3 border-neo-black sm:h-20', coverClass(item))}>
        <span
          dir="auto"
          className="absolute start-2 top-2 max-w-[80%] -rotate-3 truncate rounded border-2 border-neo-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-sm font-bold text-neo-black shadow-hard-sm transition-transform group-hover:rotate-0 sm:text-base"
        >
          {sample}
        </span>
        <span className="absolute bottom-1.5 end-1.5 rounded bg-neo-black/80 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-neo-white">
          {t('eduLibrary.card.words', { count: item.wordCount })}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <h3 dir="auto" className="line-clamp-2 font-neo-display text-sm font-bold leading-tight text-neo-white sm:text-base">
          {item.name}
        </h3>
        <p className="truncate text-[11px] text-neo-white/70" dir="auto">
          {t('eduLibrary.card.by', { author })}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-1">
          <SourceBadge item={item} />
          <ItemStats item={item} />
        </div>
      </div>
    </button>
  );
}
