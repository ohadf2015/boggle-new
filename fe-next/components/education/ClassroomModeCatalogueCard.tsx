'use client';

import type { ReactNode } from 'react';
import { Check, Clock, Flame, Sparkles } from 'lucide-react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { pressMotion, useReducedMotionSafe } from './motion';
import type { CatalogueMode } from './ClassroomModeCatalogueData';

export interface ClassroomModeCatalogueCardProps {
  mode: CatalogueMode;
  name: string;
  minutesLabel: string;
  recommendedLabel: string | null;
  /** "Most popular" on the modes classes play most; hidden when the card already says Best fit. */
  favoriteLabel?: string | null;
  /** Where the mode is played (Projector / On phones / Both). */
  deliveryTag?: ReactNode;
  selected: boolean;
  busy?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
}

const TAG =
  'absolute start-1 top-1 z-10 inline-flex max-w-[90%] items-center gap-0.5 truncate rounded-full border border-neo-cream/40 bg-neo-navy px-1.5 py-0.5 font-neo-body text-xs font-bold leading-none text-neo-cream';

export function ClassroomModeCatalogueCard({
  mode,
  name,
  minutesLabel,
  recommendedLabel,
  favoriteLabel = null,
  deliveryTag,
  selected,
  busy,
  onPick,
}: ClassroomModeCatalogueCardProps) {
  const reduced = useReducedMotionSafe();
  return (
    <m.button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`mode-tile-${mode.id}`}
      data-selected={selected ? 'true' : 'false'}
      disabled={busy}
      {...(busy || selected ? {} : pressMotion(reduced))}
      onClick={() => {
        if (busy || selected) return;
        onPick(mode.id);
      }}
      className={cn(
        'group relative flex w-[6.6rem] shrink-0 snap-center flex-col items-stretch gap-1 rounded-neo-lg border-2 bg-neo-navy-light p-1.5 text-center text-neo-cream lg:w-auto lg:p-2',
        'transition-[border-color] duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy disabled:cursor-wait',
        selected
          ? 'z-10 border-neo-lime ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy-light'
          : 'border-neo-cream/35 [@media(hover:hover)]:hover:border-neo-cream/60'
      )}
    >
      {recommendedLabel ? (
        <span data-testid="mode-recommended" className={TAG}>
          <Sparkles className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          {recommendedLabel}
        </span>
      ) : favoriteLabel ? (
        <span data-testid="mode-favorite" className={cn(TAG, 'border-neo-black bg-neo-orange text-neo-black')}>
          <Flame className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
          {favoriteLabel}
        </span>
      ) : null}
      <span className="relative block aspect-square w-full overflow-hidden rounded-neo bg-neo-navy lg:aspect-[5/4] lg:[@media(max-height:1099px)]:aspect-[2/1]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the catalog */}
        <img
          data-testid="mode-card-cover"
          src={mode.cover}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className={cn(
            'pointer-events-none h-full w-full select-none object-cover object-[50%_28%]'
          )}
        />
        {selected ? (
          <span
            data-testid="mode-selected-check"
            aria-hidden="true"
            className="absolute end-1 top-1 grid size-6 place-items-center rounded-full border-2 border-neo-lime bg-neo-navy"
          >
            <Check className="size-3.5 text-neo-lime" strokeWidth={4} />
          </span>
        ) : null}
      </span>
      <span className={cn('line-clamp-3 min-h-[2.2em] font-neo-display text-[0.8rem] font-bold leading-[1.1] lg:text-sm', selected && 'text-neo-lime')}>
        {name}
      </span>
      <span className="mx-auto inline-flex items-center gap-1 whitespace-nowrap font-neo-body text-xs font-bold leading-none text-neo-cream/80">
        <Clock className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        {minutesLabel}
      </span>
      {deliveryTag ? <span className="flex justify-center">{deliveryTag}</span> : null}
    </m.button>
  );
}

export default ClassroomModeCatalogueCard;
