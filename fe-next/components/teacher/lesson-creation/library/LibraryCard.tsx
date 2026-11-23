'use client';

import { BadgeCheck, ChevronRight, Copy, Play, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BidiText } from '@/components/teacher/classroom/BidiText';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/education/libraryTypes';
import { countKey } from '@/lib/education/library';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ARCADE_ACCENTS, ARCADE_BLOCK, type ArcadeAccent } from '@/lib/education/arcadeAccent';
import { GAME_CARD, GAME_CARD_HOVER } from '@/components/teacher/home/homeStyles';
import { LIST_CARD_ACCENT } from '@/components/teacher/ListCard';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

export const LIBRARY_CARD_H = 116;

/** `sticker`: the verified mark as a filled tilted sticker, for game cards; the preview sheet keeps the outline. */
export function SourceBadge({ item, className, sticker = false }: { item: Pick<LibraryItem, 'source' | 'isMine'>; className?: string; sticker?: boolean }) {
  const { t } = useLanguage();
  const [Icon, label] = item.isMine
    ? [null, t('eduLibrary.badge.yours')]
    : item.source === 'verified'
      ? [BadgeCheck, t('eduLibrary.badge.verified')]
      : [User, t('eduLibrary.badge.byTeacher')];
  return (
    <span
      data-testid="library-card-badge"
      className={cn(
        'inline-flex min-w-0 items-center gap-1 rounded-neo border-2 px-1.5 py-px text-[11px] font-black',
        sticker && item.source === 'verified' && !item.isMine
          ? '-rotate-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm'
          : sticker ? 'border-neo-cream/70 text-neo-cream' : 'border border-neo-cream/50 text-neo-cream/90',
        className,
      )}
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

/** A list keeps its color across pages and filters, so it is keyed by id, not grid position. */
export function libraryAccent(id: string): ArcadeAccent {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ARCADE_ACCENTS[Math.abs(h) % ARCADE_ACCENTS.length];
}

/** One shared list: name, one fact line, and the whole card opens the preview. */
export default function LibraryCard({ item, index, onOpen }: LibraryCardProps) {
  const { t, language } = useLanguage();
  const author = item.source === 'verified' ? 'LexiClash' : item.authorName ?? t('eduLibrary.card.aTeacher');
  const accent = libraryAccent(item.id);

  return (
    <button
      type="button"
      data-testid="library-card"
      data-accent={accent}
      onClick={onOpen}
      style={{ animationDelay: `${Math.min(index, 11) * 35}ms` }}
      className={cn(
        'group relative flex min-h-[116px] min-w-0 flex-col gap-1 overflow-hidden py-3 pe-3 ps-6 text-start',
        GAME_CARD,
        GAME_CARD_HOVER,
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cream',
        'motion-safe:animate-pop-in [animation-fill-mode:both]',
      )}
    >
      <span aria-hidden="true" data-testid="list-card-accent" className={cn(LIST_CARD_ACCENT, ARCADE_BLOCK[accent])} />
      <span title={item.name} className="line-clamp-2 font-neo-display text-lg font-bold leading-tight text-neo-white">
        <BidiText>{item.name}</BidiText>
      </span>
      <span data-testid="library-card-fact" className="truncate text-sm font-semibold text-neo-cream/80" dir="auto">
        {t(pluralKeyOf('eduLibrary.card.words', item.wordCount, language), { count: item.wordCount })}
        {' · '}
        <span lang={item.language}>{nativeLanguageName(item.language)}</span>
        {' · '}
        {author}
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 pt-1">
        <SourceBadge item={item} />
        <span className="inline-flex items-center gap-0.5 font-neo-display text-sm font-black text-neo-cream">
          {t('eduLibrary.card.use')}
          <DirectionalIcon icon={ChevronRight} className="size-4" />
        </span>
      </span>
    </button>
  );
}
