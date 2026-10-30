'use client';

import { BadgeCheck, ChevronRight, Copy, Play, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/education/libraryTypes';
import { countKey } from '@/lib/education/library';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';

export const LIBRARY_CARD_H = 136;

export function SourceBadge({ item, className }: { item: Pick<LibraryItem, 'source' | 'isMine'>; className?: string }) {
  const { t } = useLanguage();
  const [Icon, label] = item.isMine
    ? [null, t('eduLibrary.badge.yours')]
    : item.source === 'verified'
      ? [BadgeCheck, t('eduLibrary.badge.verified')]
      : [User, t('eduLibrary.badge.byTeacher')];
  return (
    <span
      data-testid="library-card-badge"
      className={cn('inline-flex min-w-0 items-center gap-1 rounded border border-neo-cream/50 px-1.5 py-px text-[11px] font-bold text-neo-cream/90', className)}
    >
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function ItemStats({ item, className, verbose = false }: { item: LibraryItem; className?: string; verbose?: boolean }) {
  const { t, language } = useLanguage();
  if (item.source !== 'teacher' || item.playCount === null || item.copyCount === null) return null;
  if (item.playCount === 0 && item.copyCount === 0) {
    return <span className={cn('text-[11px] font-bold text-neo-cream/80', className)}>{t('eduLibrary.card.new')}</span>;
  }
  const stats = [
    { count: item.playCount, label: t(countKey('plays', item.playCount, language), { count: item.playCount }), icon: <Play className="size-3 fill-current" aria-hidden="true" /> },
    { count: item.copyCount, label: t(countKey('copies', item.copyCount, language), { count: item.copyCount }), icon: <Copy className="size-3" aria-hidden="true" /> },
  ].filter((s) => s.count > 0);
  return (
    <span className={cn('inline-flex items-center gap-2 text-[11px] font-bold tabular-nums text-neo-white/80', className)}>
      {stats.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-0.5" aria-label={s.label} title={s.label}>
          {s.icon}
          {verbose ? s.label : s.count}
        </span>
      ))}
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
        'group grid h-[78px] min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] content-center items-start gap-x-2 gap-y-1 overflow-hidden rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-2.5 py-2 text-start',
        'sm:flex sm:h-[136px] sm:flex-col sm:items-stretch sm:gap-1.5 sm:py-2.5',
        'transition-colors duration-150 hover:border-neo-cream focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
        'motion-safe:animate-pop-in [animation-fill-mode:both]',
      )}
    >
      <span className="contents sm:flex sm:shrink-0 sm:items-center sm:justify-between sm:gap-2">
        <span
          data-testid="library-card-sample"
          dir="auto"
          className="col-start-1 row-start-1 max-w-[7rem] rounded border border-neo-black bg-neo-cream px-1.5 py-px font-neo-display text-xs font-bold text-neo-black [overflow-wrap:anywhere]"
        >
          {sample}
        </span>
        <span className="col-start-3 row-start-1 shrink-0 pt-0.5 text-[11px] font-bold tabular-nums text-neo-cream/75">
          {t('eduLibrary.card.words', { count: item.wordCount })}
        </span>
      </span>
      <span dir="auto" title={item.name} className="col-start-2 row-start-1 line-clamp-2 shrink-0 font-neo-display text-sm font-bold leading-tight text-neo-white">
        {item.name}
      </span>
      <span className="col-span-3 row-start-2 flex min-w-0 items-center gap-2 sm:contents">
        <span className="min-w-0 flex-1 shrink-0 text-[11px] text-neo-cream/75 sm:flex-none" dir="auto">
          <span lang={item.language}>{nativeLanguageName(item.language)}</span>
          {' · '}
          {author}
        </span>
        <span className="flex shrink-0 items-center justify-between gap-2 sm:mt-auto">
          <SourceBadge item={item} />
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-bold text-neo-cream group-hover:underline">
            {t('eduLibrary.card.use')}
            <DirectionalIcon icon={ChevronRight} className="size-3.5" />
          </span>
        </span>
      </span>
    </button>
  );
}
