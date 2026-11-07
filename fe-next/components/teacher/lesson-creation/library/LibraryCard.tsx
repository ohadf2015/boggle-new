'use client';

import { BadgeCheck, ChevronRight, Copy, Play, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { LibraryItem } from '@/lib/education/libraryTypes';
import { countKey } from '@/lib/education/library';
import { nativeLanguageName } from '@/components/education/pickers/nativeLanguageName';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ARCADE_ACCENTS, ARCADE_BLOCK, type ArcadeAccent } from '@/lib/education/arcadeAccent';
import { GAME_CARD } from '@/components/teacher/home/homeStyles';

export const LIBRARY_CARD_H = 144;

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

// Literal sm: classes so Tailwind sees them; the band only exists from sm, the phone row gets a start strip.
const BAND: Record<ArcadeAccent, string> = {
  cyan: 'sm:bg-neo-cyan',
  pink: 'sm:bg-neo-pink',
  purple: 'sm:bg-neo-purple',
  yellow: 'sm:bg-neo-yellow',
  orange: 'sm:bg-neo-orange',
};

/** A list keeps its color across pages and filters, so it is keyed by id, not grid position. */
export function libraryAccent(id: string): ArcadeAccent {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ARCADE_ACCENTS[Math.abs(h) % ARCADE_ACCENTS.length];
}

const TILE = 'rounded-[6px] border-2 border-neo-black bg-neo-cream font-neo-display font-black text-neo-black';
// Fans toward the card's inside edge, so RTL mirrors the lean and the spread.
const FAN = [
  'sm:rotate-6 group-hover:sm:translate-x-3 group-hover:sm:rotate-12 rtl:sm:-rotate-6 rtl:group-hover:sm:-translate-x-3 rtl:group-hover:sm:-rotate-12',
  'sm:rotate-12 group-hover:sm:translate-x-6 group-hover:sm:rotate-[20deg] rtl:sm:-rotate-12 rtl:group-hover:sm:-translate-x-6 rtl:group-hover:sm:-rotate-[20deg]',
];

export default function LibraryCard({ item, index, onOpen }: LibraryCardProps) {
  const { t } = useLanguage();
  const sample = item.words[0]?.word ?? '';
  const peek = item.words.slice(1, 3).map((w) => w.word);
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
        'group relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] content-center items-center gap-x-2 gap-y-1.5 overflow-hidden ps-4 pe-2.5 py-2.5 text-start',
        GAME_CARD,
        'sm:flex sm:h-[144px] sm:flex-col sm:items-stretch sm:gap-0 sm:p-0',
        'transition-[translate,rotate,box-shadow] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 active:translate-y-0.5',
        index % 2 ? 'hover:rotate-1' : 'hover:-rotate-1',
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:rotate-0',
        'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cream',
        'motion-safe:animate-pop-in [animation-fill-mode:both]',
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 start-0 w-2 border-e-2 border-neo-black sm:hidden', ARCADE_BLOCK[accent])} />
      <span
        data-testid="library-card-band"
        className={cn(
          'contents sm:relative sm:flex sm:h-11 sm:shrink-0 sm:items-center sm:justify-between sm:gap-2 sm:border-b-[3px] sm:border-neo-black sm:px-3',
          BAND[accent],
        )}
      >
        <span className="relative isolate col-start-1 row-start-1 flex min-w-0 sm:max-w-[62%]">
          {peek.length > 0 && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 hidden sm:block">
              {peek.map((w, i) => (
                <span
                  key={i}
                  data-testid="library-card-fan-tile"
                  dir="auto"
                  style={{ zIndex: -1 - i }}
                  className={cn(
                    TILE,
                    'absolute inset-0 flex items-center justify-center overflow-hidden px-1.5 text-transparent opacity-90 transition-[translate,rotate] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none origin-bottom-left rtl:origin-bottom-right',
                    FAN[i],
                  )}
                >
                  {w}
                </span>
              ))}
            </span>
          )}
          <span
            data-testid="library-card-sample"
            dir="auto"
            className={cn(
              TILE,
              'relative max-w-[12rem] px-1.5 py-px text-xs shadow-hard-sm [overflow-wrap:anywhere] sm:max-w-full sm:-rotate-3 sm:px-2 sm:py-0.5 sm:leading-tight',
              sample.length > 8 ? 'sm:text-sm' : 'sm:text-lg',
              'transition-[rotate] duration-200 group-hover:sm:rotate-0 motion-reduce:transition-none',
            )}
          >
            {sample}
          </span>
        </span>
        <span className="col-start-3 row-start-1 shrink-0 rounded-full border-2 border-neo-cream/40 bg-neo-navy px-2 py-px text-[11px] font-black tabular-nums text-neo-cream sm:text-xs">
          {t('eduLibrary.card.words', { count: item.wordCount })}
        </span>
      </span>
      <span className="contents sm:flex sm:min-h-0 sm:flex-1 sm:flex-col sm:gap-0.5 sm:px-3 sm:pb-1.5 sm:pt-1.5">
        <span dir="auto" title={item.name} className="col-span-3 row-start-2 line-clamp-2 shrink-0 font-neo-display text-base font-bold leading-tight text-neo-white sm:text-sm">
          {item.name}
        </span>
        <span className="col-span-3 row-start-3 flex min-w-0 items-center gap-2 sm:contents">
          <span className="min-w-0 flex-1 shrink-0 truncate text-[11px] text-neo-cream/75 sm:flex-none sm:whitespace-normal" dir="auto">
            <span lang={item.language}>{nativeLanguageName(item.language)}</span>
            {' · '}
            {author}
          </span>
          <span className="flex shrink-0 items-center justify-between gap-2 sm:mt-auto">
            <SourceBadge item={item} sticker />
            <span className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full border-2 border-neo-cream px-2.5 font-neo-display text-xs font-black text-neo-cream transition-colors group-hover:bg-neo-cream group-hover:text-neo-black">
              {t('eduLibrary.card.use')}
              <DirectionalIcon icon={ChevronRight} className="size-3.5" />
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
