'use client';

import { memo } from 'react';
import { BookMarked, ChevronDown, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface ListChip {
  id: string;
  title: string;
  count: number;
}

export interface PlayNowListChipsProps {
  kind: 'lessons' | 'packs';
  chips: ListChip[];
  selectedId: string | null;
  /** Shown as a leading chip when the armed words are not one of the chips (pasted, a pack from the sheet, or nothing yet). */
  offChipLabel: string;
  onSelect: (id: string) => void;
  onMore: () => void;
}

/**
 * The word lists, one tap away on the deck itself: tap a chip and GO LIVE is
 * re-armed, no sheet in between. The full picker (all packs, paste) stays one
 * "More" tap away.
 */
export const PlayNowListChips = memo(function PlayNowListChips({
  kind,
  chips,
  selectedId,
  offChipLabel,
  onSelect,
  onMore,
}: PlayNowListChipsProps) {
  const { t } = useLanguage();
  const Icon = kind === 'lessons' ? BookMarked : Sparkles;
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1.5 [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
      <div
        role="group"
        data-testid="play-now-list-chips"
        aria-label={t('eduHq.lists.label')}
        className="flex min-w-0 flex-1 flex-nowrap gap-1.5 overflow-x-auto py-0.5 ps-0.5 [scrollbar-width:none]"
      >
        {selectedId === null ? (
          <span className="inline-flex h-8 max-w-[11rem] shrink-0 items-center rounded-full border-2 border-neo-black bg-neo-cyan px-2.5 font-neo-display text-[0.7rem] font-black uppercase leading-none tracking-wide text-black shadow-hard-sm sm:h-9 sm:text-xs lg:max-w-[16rem]">
            <span data-testid="play-now-armed" dir="auto" className="min-w-0 truncate">
              {offChipLabel}
            </span>
          </span>
        ) : null}
        {chips.map((chip) => {
          const on = chip.id === selectedId;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={on}
              data-testid={`play-now-chip-${chip.id}`}
              title={chip.title}
              onClick={() => onSelect(chip.id)}
              className={cn(
                'inline-flex h-8 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border-2 px-2.5 font-neo-display text-[0.7rem] font-black uppercase leading-none tracking-wide sm:h-9 sm:text-xs lg:max-w-[14rem]',
                'transition-[box-shadow,background-color,border-color] duration-100 active:shadow-none',
                'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                on
                  ? 'border-neo-black bg-neo-cyan text-black shadow-hard-sm'
                  : 'border-neo-cream/40 bg-neo-navy text-neo-white hover:border-neo-cream',
              )}
            >
              <Icon className="size-3.5 shrink-0" strokeWidth={3} aria-hidden="true" />
              <span data-testid={on ? 'play-now-armed' : undefined} dir="auto" className="min-w-0 truncate">
                {chip.title}
              </span>
              <span className={cn('shrink-0 tabular-nums', on ? 'text-black/60' : 'text-neo-white/50')}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-testid="play-now-more-lists"
        onClick={onMore}
        className={cn(
          'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border-2 border-dashed border-neo-cream/60 px-2.5 sm:h-9',
          'font-neo-display text-[0.7rem] font-black uppercase leading-none tracking-wide text-neo-white sm:text-xs',
          'hover:border-neo-cream focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        )}
      >
        {t('eduHq.lists.more')}
        <ChevronDown className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
  );
});

export default PlayNowListChips;
