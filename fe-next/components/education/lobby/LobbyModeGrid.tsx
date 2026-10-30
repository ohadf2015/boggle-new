'use client';

import { Check, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherGameMode } from '@/lib/education/gameModes';
import { CATALOGUE_CATEGORIES, catalogueKeys, catalogueModes, type CatalogueMode } from '../ClassroomModeCatalogueData';
import { DeliveryTag } from '../DeliveryTag';

type T = (key: string, params?: Record<string, string | number>) => string;

export interface LobbyModeGridProps {
  selected: CatalogueMode['id'];
  recommended?: CatalogueMode['id'] | null;
  /** The one mode the teacher has not tried lately; its tile gets a small New tag. */
  suggested?: CatalogueMode['id'] | null;
  /** The configured round for the selected card; other cards use the room's answer or the catalogue estimate. */
  selectedMinutes?: number;
  minutesFor?: (id: CatalogueMode['id']) => number;
  busy?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
  t: T;
}

/** Every game in one compact grid; a tile only selects, GO LIVE lives in the ready panel. */
export function LobbyModeGrid({ selected, recommended = null, suggested = null, selectedMinutes, minutesFor, busy, onPick, t }: LobbyModeGridProps) {
  const modes = catalogueModes();
  return (
    <div role="radiogroup" aria-label={t('eg2Modes.title')} data-testid="lobby-mode-grid" className="@container">
      <div data-testid="lobby-mode-cells" className="grid grid-cols-2 gap-1.5 p-1 @2xl:grid-cols-4 @2xl:gap-3">
        {CATALOGUE_CATEGORIES.map((category) => (
          <section key={category} data-testid={`mode-group-${category}`} className="contents">
            <h2 className="sr-only">{t(`eg2Modes.category.${category}`)}</h2>
            {modes
              .filter((m) => m.category === category)
              .map((mode) => {
                const isOn = mode.id === selected;
                const minutes = isOn && selectedMinutes !== undefined
                  ? selectedMinutes
                  : (minutesFor?.(mode.id) ?? teacherGameMode(mode.launch.gameMode)?.minutes ?? 3);
                return (
                  <ModeTile
                    key={mode.id}
                    mode={mode}
                    name={t(catalogueKeys(mode).name)}
                    minutesLabel={t('education.modePicker.minutes', { count: minutes })}
                    recommendedLabel={recommended === mode.id ? t('education.modePicker.recommended') : null}
                    newLabel={suggested === mode.id && !isOn ? t('landing.badge.new') : null}
                    selected={isOn}
                    busy={busy}
                    onPick={onPick}
                    t={t}
                  />
                );
              })}
          </section>
        ))}
      </div>
    </div>
  );
}

const STICKER =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-neo-cream/40 bg-neo-navy px-1.5 py-0.5 font-neo-body text-[0.65rem] font-bold leading-none text-neo-cream';

function ModeTile({
  mode,
  name,
  minutesLabel,
  recommendedLabel,
  newLabel,
  selected,
  busy,
  onPick,
  t,
}: {
  mode: CatalogueMode;
  name: string;
  minutesLabel: string;
  recommendedLabel: string | null;
  newLabel: string | null;
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
        'group relative flex min-w-0 items-center gap-2 overflow-hidden rounded-neo border-2 bg-neo-navy-light p-1.5 text-start text-neo-cream',
        '@2xl:flex-col @2xl:items-stretch @2xl:gap-0 @2xl:p-0',
        'transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy disabled:cursor-wait',
        selected
          ? 'border-neo-lime ring-2 ring-neo-lime ring-offset-2 ring-offset-neo-navy'
          : 'border-neo-cream/35 [@media(hover:hover)]:hover:border-neo-cream/50',
      )}
    >
      <span className="relative block size-12 shrink-0 overflow-hidden rounded-[6px] @2xl:aspect-[16/9] @2xl:[@media(max-height:800px)]:aspect-[2/1] @2xl:size-auto @2xl:w-full @2xl:rounded-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the catalogue */}
        <img
          data-testid="mode-card-cover"
          src={mode.cover}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="pointer-events-none h-full w-full select-none object-cover object-[50%_28%]"
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
      <span className="flex min-w-0 flex-1 flex-col gap-1 @2xl:px-2.5 @2xl:py-2">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="font-neo-display text-sm font-bold leading-tight @2xl:text-base">{name}</span>
          {newLabel ? (
            <span data-testid="mode-suggestion" data-mode={mode.id} className={STICKER}>
              <Sparkles className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              {newLabel}
            </span>
          ) : null}
          {recommendedLabel ? (
            <span data-testid="mode-recommended" className={STICKER}>
              {recommendedLabel}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-neo-body text-xs font-bold text-neo-cream/70">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {minutesLabel}
          </span>
          <DeliveryTag delivery={mode.delivery} t={t} className="hidden bg-transparent p-0 text-xs text-neo-cream/70 @2xl:inline-flex" />
        </span>
      </span>
    </button>
  );
}

export default LobbyModeGrid;
