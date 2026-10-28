'use client';

import { Check, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherGameMode } from '@/lib/education/gameModes';
import { ACCENT_FILL } from '../ClassroomModeCatalogueCard';
import { CATALOGUE_CATEGORIES, catalogueKeys, catalogueModes, type CatalogueMode } from '../ClassroomModeCatalogueData';
import { DeliveryTag } from '../DeliveryTag';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface LobbyModeGridProps {
  selected: CatalogueMode['id'];
  recommended?: CatalogueMode['id'] | null;
  /** The configured round for the selected card; other cards use the room's answer or the catalogue estimate. */
  selectedMinutes?: number;
  minutesFor?: (id: CatalogueMode['id']) => number;
  busy?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
  t: T;
}

/** Every game on one board, grouped by what it teaches. A card only selects; GO LIVE lives in the ready panel. */
export function LobbyModeGrid({ selected, recommended = null, selectedMinutes, minutesFor, busy, onPick, t }: LobbyModeGridProps) {
  const modes = catalogueModes();
  return (
    <div role="radiogroup" aria-label={t('eg2Modes.title')} data-testid="lobby-mode-grid" className="flex flex-col gap-4 lg:gap-5">
      {CATALOGUE_CATEGORIES.map((category) => (
        <section key={category} data-testid={`mode-group-${category}`} className="flex flex-col gap-2">
          <h2 className="px-0.5 font-neo-display text-sm font-black text-neo-cream/85 lg:text-base">
            {t(`eg2Modes.category.${category}`)}
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:gap-3">
            {modes
              .filter((m) => m.category === category)
              .map((mode) => {
                const isOn = mode.id === selected;
                const minutes = isOn && selectedMinutes !== undefined
                  ? selectedMinutes
                  : (minutesFor?.(mode.id) ?? teacherGameMode(mode.launch.gameMode)?.minutes ?? 3);
                return (
                  <ModeCard
                    key={mode.id}
                    mode={mode}
                    name={t(catalogueKeys(mode).name)}
                    minutesLabel={t('education.modePicker.minutes', { count: minutes })}
                    recommendedLabel={recommended === mode.id ? t('education.modePicker.recommended') : null}
                    selected={isOn}
                    busy={busy}
                    onPick={onPick}
                    t={t}
                  />
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ModeCard({
  mode,
  name,
  minutesLabel,
  recommendedLabel,
  selected,
  busy,
  onPick,
  t,
}: {
  mode: CatalogueMode;
  name: string;
  minutesLabel: string;
  recommendedLabel: string | null;
  selected: boolean;
  busy?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
  t: T;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`mode-tile-${mode.id}`}
      data-selected={selected ? 'true' : 'false'}
      disabled={busy}
      onClick={() => {
        if (!selected) onPick(mode.id);
      }}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-neo-lg border-[3px] text-start',
        'transition-[transform,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy disabled:cursor-wait',
        !selected
          ? 'border-neo-cream/70 bg-neo-navy-light text-neo-cream shadow-hard [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:border-neo-cream'
          : cn('-translate-y-1 border-neo-black text-neo-black shadow-hard-lg', ACCENT_FILL[mode.accent]),
      )}
    >
      <span
        className={cn(
          'relative block aspect-[16/10] w-full overflow-hidden border-b-[3px] lg:aspect-[2/1] lg:[@media(max-height:960px)]:aspect-[5/2]',
          selected ? 'border-neo-black' : 'border-neo-cream/40',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the catalogue */}
        <img
          data-testid="mode-card-cover"
          src={mode.cover}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="pointer-events-none h-full w-full select-none object-cover object-[50%_28%] transition-transform duration-200 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-105"
        />
        {recommendedLabel ? (
          <span
            data-testid="mode-recommended"
            className="absolute start-1.5 top-1.5 inline-flex max-w-[85%] items-center gap-1 truncate rounded-neo border-[2px] border-neo-black bg-neo-yellow px-1.5 py-0.5 font-neo-display text-[0.65rem] font-black uppercase leading-none text-neo-black shadow-hard-sm lg:text-xs"
          >
            <Sparkles className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
            {recommendedLabel}
          </span>
        ) : null}
        {selected ? (
          <span
            aria-hidden="true"
            className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full border-[3px] border-neo-black bg-neo-cream shadow-hard-sm"
          >
            <Check className="size-4 text-neo-black" strokeWidth={4} />
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 px-2.5 py-2 lg:px-3">
        <span className="truncate font-neo-display text-sm font-black uppercase leading-tight sm:text-base">{name}</span>
        <span className="flex shrink-0 flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 whitespace-nowrap rounded-full border-[2px] px-1.5 py-0.5 font-neo-display text-[0.65rem] font-black uppercase leading-none lg:text-xs',
              selected ? 'border-neo-black bg-neo-cream text-neo-black' : 'border-neo-cream/60 text-neo-cream',
            )}
          >
            <Clock className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
            {minutesLabel}
          </span>
          <DeliveryTag delivery={mode.delivery} t={t} />
        </span>
      </span>
    </button>
  );
}

export default LobbyModeGrid;
