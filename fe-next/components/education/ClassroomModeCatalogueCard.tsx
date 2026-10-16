'use client';

import type { ReactNode } from 'react';
import { Check, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModeAccent } from '@/lib/education/gameModes';
import type { CatalogueMode } from './ClassroomModeCatalogueData';

/** Whole literal classes — Tailwind v4 only emits what it can read verbatim. */
export const ACCENT_FILL: Record<ModeAccent, string> = {
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

export interface ClassroomModeCatalogueCardProps {
  mode: CatalogueMode;
  name: string;
  minutesLabel: string;
  recommendedLabel: string | null;
  /** Where the mode is played (Projector / On phones / Both). */
  deliveryTag?: ReactNode;
  selected: boolean;
  busy?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
}

export function ClassroomModeCatalogueCard({
  mode,
  name,
  minutesLabel,
  recommendedLabel,
  deliveryTag,
  selected,
  busy,
  onPick,
}: ClassroomModeCatalogueCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`mode-tile-${mode.id}`}
      data-selected={selected ? 'true' : 'false'}
      disabled={busy}
      onClick={() => {
        if (busy || selected) return;
        onPick(mode.id);
      }}
      className={cn(
        'group relative flex w-[6.6rem] shrink-0 snap-center flex-col items-stretch gap-1 rounded-neo-lg border-[3px] p-1.5 text-center lg:w-auto lg:p-2',
        'transition-[transform,box-shadow] duration-150 motion-reduce:transition-none motion-safe:active:scale-95',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy disabled:cursor-wait',
        !selected
          ? 'border-neo-cream bg-neo-navy-light text-neo-cream shadow-hard motion-safe:hover:-translate-y-0.5 motion-safe:hover:-rotate-1'
          : cn('z-10 -translate-y-1 border-neo-black text-neo-black shadow-hard-lg', ACCENT_FILL[mode.accent])
      )}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute -end-2 -top-2 z-10 grid size-6 place-items-center rounded-full border-[3px] border-neo-black bg-neo-lime shadow-hard-sm lg:size-7"
        >
          <Check className="size-3.5 text-neo-black" strokeWidth={4} />
        </span>
      )}
      {recommendedLabel && (
        <span
          data-testid="mode-recommended"
          className="absolute -start-1.5 -top-2.5 z-10 inline-flex max-w-[95%] -rotate-3 items-center gap-0.5 truncate rounded-neo border-[2px] border-neo-black bg-neo-yellow px-1 py-0.5 font-neo-display text-[0.55rem] font-black uppercase leading-none text-neo-black shadow-hard-sm lg:text-[0.65rem]"
        >
          <Sparkles className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
          {recommendedLabel}
        </span>
      )}
      <span className="relative block aspect-square w-full overflow-hidden rounded-neo border-[2px] border-neo-cream bg-neo-navy lg:aspect-[5/4]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the catalog */}
        <img
          data-testid="mode-card-cover"
          src={mode.cover}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className={cn(
            'pointer-events-none h-full w-full select-none object-cover object-[50%_28%] transition-transform duration-200 ease-out',
            selected ? 'scale-105' : 'motion-safe:group-hover:scale-105'
          )}
        />
      </span>
      <span className="line-clamp-2 min-h-[2.1em] font-neo-display text-[0.72rem] font-black uppercase leading-[1.05] lg:text-sm">
        {name}
      </span>
      <span
        className={cn(
          'mx-auto inline-flex items-center gap-1 whitespace-nowrap rounded-full border-[2px] px-1.5 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-none lg:text-xs',
          selected ? 'border-neo-black bg-neo-cream text-neo-black' : 'border-neo-cream/70 text-neo-cream'
        )}
      >
        <Clock className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
        {minutesLabel}
      </span>
      {deliveryTag ? <span className="flex justify-center">{deliveryTag}</span> : null}
    </button>
  );
}

export default ClassroomModeCatalogueCard;
