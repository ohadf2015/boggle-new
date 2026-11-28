'use client';

import { Ban, Check, Clock, MonitorPlay, MonitorSmartphone, Smartphone, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherGameMode } from '@/lib/education/gameModes';
import { ARCADE_BLOCK, arcadeAccentAt, type ArcadeAccent } from '@/lib/education/arcadeAccent';
import { CATALOGUE_CATEGORIES, catalogueKeys, catalogueModes, deliveryKey, type CatalogueMode } from '../ClassroomModeCatalogueData';

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
  /** Shorter covers when the lesson run sheet takes a row above the grid. */
  dense?: boolean;
  /** Games this list cannot play, each with the translation key saying why; the card stays but cannot be picked. */
  blocked?: Partial<Record<CatalogueMode['id'], string>>;
  onPick: (id: CatalogueMode['id']) => void;
  t: T;
}

/** Accent by on-screen position so neighbouring tiles never share a color; the spotlight reuses it for the picked game. */
export function modeArcadeAccent(id: CatalogueMode['id']): ArcadeAccent {
  const order = CATALOGUE_CATEGORIES.flatMap((category) => catalogueModes().filter((m) => m.category === category));
  return arcadeAccentAt(Math.max(0, order.findIndex((m) => m.id === id)));
}

// Transform only (no opacity start: it flashes on the mobile renderer) and `backwards`, so the press scale still works after it.
const ENTRANCE_KEYFRAMES = '@keyframes lc-mode-in{from{transform:translateY(12px) scale(0.94)}to{transform:none}}';
const ENTRANCE_STAGGER_MS = 35;

const GROUP_SPAN: Record<(typeof CATALOGUE_CATEGORIES)[number], string> = {
  finish: 'col-span-2',
  together: 'col-span-2',
  board: 'col-span-2 @2xl:col-span-4',
};

/** Every game in one grid of labelled groups; a tile only selects, GO LIVE lives in the ready panel. */
export function LobbyModeGrid({ selected, recommended = null, suggested = null, selectedMinutes, minutesFor, busy, dense = false, blocked = {}, onPick, t }: LobbyModeGridProps) {
  const modes = catalogueModes();
  let index = 0;
  return (
    <div role="radiogroup" aria-label={t('eg2Modes.title')} data-testid="lobby-mode-grid" className="@container">
      <style>{ENTRANCE_KEYFRAMES}</style>
      <div data-testid="lobby-mode-cells" className="grid grid-cols-2 gap-x-1.5 gap-y-2.5 p-1 @2xl:grid-cols-4 @2xl:gap-x-3 @2xl:gap-y-4">
        {CATALOGUE_CATEGORIES.map((category) => (
          <section key={category} data-testid={`mode-group-${category}`} className={cn('grid grid-cols-subgrid content-start gap-y-1.5', GROUP_SPAN[category])}>
            <h2 className="col-span-full flex items-center gap-1.5 px-0.5 font-neo-body text-xs font-bold leading-none text-edu-ink/80 @2xl:text-sm">
              <span aria-hidden="true" className="h-[3px] w-3 shrink-0 bg-edu-ink" />
              {t(`eg2Modes.category.${category}`)}
            </h2>
            {modes
              .filter((m) => m.category === category)
              .map((mode) => {
                const isOn = mode.id === selected;
                const minutes = isOn && selectedMinutes !== undefined
                  ? selectedMinutes
                  : (minutesFor?.(mode.id) ?? teacherGameMode(mode.launch.gameMode)?.minutes ?? 3);
                const hintKey = catalogueKeys(mode).hint;
                const blockedKey = blocked[mode.id];
                return (
                  <ModeTile
                    key={mode.id}
                    mode={mode}
                    accent={modeArcadeAccent(mode.id)}
                    name={t(catalogueKeys(mode).name)}
                    minutesLabel={t('education.modePicker.minutes', { count: minutes })}
                    hint={hintKey ? t(hintKey) : null}
                    blockedReason={blockedKey ? t(blockedKey) : null}
                    recommendedLabel={recommended === mode.id ? t('eduShell.host.bestForList') : null}
                    newLabel={suggested === mode.id && !isOn ? t('eduShell.host.untried') : null}
                    selected={isOn}
                    busy={busy}
                    dense={dense}
                    entranceDelayMs={index++ * ENTRANCE_STAGGER_MS}
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

const DELIVERY_ICON = { projector: MonitorPlay, phones: Smartphone, both: MonitorSmartphone } as const;

const STICKER =
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-edu-line bg-edu-surface px-1.5 py-0.5 font-neo-body text-xs font-bold leading-none text-edu-ink';

function ModeTile({
  mode,
  accent,
  name,
  minutesLabel,
  hint,
  blockedReason,
  recommendedLabel,
  newLabel,
  selected,
  busy,
  dense,
  entranceDelayMs,
  onPick,
  t,
}: {
  mode: CatalogueMode;
  accent: ArcadeAccent;
  name: string;
  minutesLabel: string;
  hint: string | null;
  blockedReason: string | null;
  entranceDelayMs: number;
  recommendedLabel: string | null;
  newLabel: string | null;
  selected: boolean;
  busy?: boolean;
  dense?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
  t: T;
}) {
  const DeliveryIcon = DELIVERY_ICON[mode.delivery];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={blockedReason ? true : undefined}
      data-testid={`mode-tile-${mode.id}`}
      data-selected={selected ? 'true' : 'false'}
      data-accent={accent}
      disabled={busy}
      style={{ animationDelay: `${entranceDelayMs}ms` }}
      onClick={() => {
        if (!selected && !blockedReason) onPick(mode.id);
      }}
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-neo-lg border-2 bg-edu-surface text-start text-edu-ink shadow-hard-sm',
        'motion-safe:animate-[lc-mode-in_360ms_cubic-bezier(0.23,1,0.32,1)_backwards]',
        mode.category === 'together' && 'col-span-2 @2xl:col-span-1',
        blockedReason && 'cursor-not-allowed border-dashed [&_img]:grayscale',
        'transition-[border-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface disabled:cursor-wait',
        selected
          ? 'border-neo-black ring-[3px] ring-neo-pink ring-offset-2 ring-offset-edu-page'
          : 'border-edu-line',
      )}
    >
      <span
        data-accent-decor
        className={cn(
          'relative w-full shrink-0 overflow-hidden border-b-2 border-neo-black',
          ARCADE_BLOCK[accent],
          dense ? 'h-20 @2xl:h-24' : 'h-24 @2xl:h-28',
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the catalogue */}
        <img
          data-testid="mode-card-cover"
          src={mode.sticker}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="pointer-events-none absolute inset-x-0 inset-y-[6%] mx-auto h-[88%] w-full select-none object-contain drop-shadow-[2px_3px_0_rgb(0_0_0/0.18)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] [@media(hover:hover)]:group-hover:-translate-y-1 [@media(hover:hover)]:group-hover:scale-105 motion-reduce:transition-none"
        />
        {selected ? (
          <span
            data-testid="mode-selected-check"
            aria-hidden="true"
            className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-full border-2 border-neo-black bg-edu-surface"
          >
            <Check className="size-4 text-edu-pink-ink" strokeWidth={4} />
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 px-2.5 py-2 @2xl:gap-1.5 @2xl:px-3 @2xl:py-2.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className="font-neo-display text-base font-bold leading-tight @2xl:text-lg">{name}</span>
          {newLabel ? (
            <span data-testid="mode-suggestion" data-mode={mode.id} title={t('eduShell.host.untriedHint')} className={STICKER}>
              <Sparkles className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
              {newLabel}
            </span>
          ) : null}
          {recommendedLabel ? (
            <span data-testid="mode-recommended" title={t('eduShell.host.bestForListHint')} className={STICKER}>
              {recommendedLabel}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-nowrap items-center gap-x-2 whitespace-nowrap font-neo-body text-xs font-bold text-edu-ink/70">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Clock className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {minutesLabel}
          </span>
          <span data-testid={`delivery-tag-${mode.delivery}`} title={t(deliveryKey(mode.delivery))} className="hidden items-center gap-1 @2xl:inline-flex">
            <DeliveryIcon className="size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {t(`eduShell.deliveryShort.${mode.delivery}`)}
          </span>
        </span>
        {blockedReason ? (
          <span data-testid="mode-blocked-reason" className="flex items-start gap-1 font-neo-body text-xs font-bold leading-snug text-edu-ink/85">
            <Ban className="mt-px size-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            {blockedReason}
          </span>
        ) : hint ? (
          <span data-testid="mode-hint" className={cn('font-neo-body text-xs leading-snug text-edu-ink/80', mode.category !== 'together' && 'hidden @2xl:block')}>
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default LobbyModeGrid;
