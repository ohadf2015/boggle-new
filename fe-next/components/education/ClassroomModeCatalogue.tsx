'use client';

// A card only selects; GO LIVE launches and names the mode, so the two cannot disagree (Class 3).

import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import type { PlayStyle } from '@/shared/utils/teamBattle';
import { ClassroomModeCatalogueCard } from './ClassroomModeCatalogueCard';
import { ClassroomModeSpotlight } from './ClassroomModeSpotlight';
import {
  CATALOGUE_CATEGORIES,
  catalogueEntry,
  catalogueKeys,
  catalogueModes,
  modeStyleFor,
  type CatalogueMode,
} from './ClassroomModeCatalogueData';
import { teacherGameMode } from '@/lib/education/gameModes';
import { DeliveryTag } from './DeliveryTag';
import { ModeSuggestion } from './lobby/ModeSuggestion';

export interface ClassroomModeCatalogueProps {
  selected: CatalogueMode['id'];
  recommended: CatalogueMode['id'] | null;
  /** The configured round length for the selected mode — never a catalog guess. */
  minutes: number;
  /** The same room-settings answer for any other card; falls back to the catalog estimate. */
  minutesFor?: (id: CatalogueMode['id']) => number;
  playStyle: PlayStyle;
  busy?: boolean;
  blockedKey: string | null;
  onPick: (id: CatalogueMode['id']) => void;
  onGoLive: () => void;
  /** False when the host lays the card row out itself, e.g. inside its scroll region. */
  withCardRow?: boolean;
  /** Set by the host lobby: modes it would grey out, so the "try something new" chip never offers one. */
  isModeBlocked?: (id: CatalogueMode['id']) => boolean;
}

export function ClassroomModeCatalogue({
  selected,
  recommended,
  minutes,
  minutesFor,
  playStyle,
  busy,
  blockedKey,
  onPick,
  onGoLive,
  withCardRow = true,
  isModeBlocked,
}: ClassroomModeCatalogueProps) {
  const { t, language, dir } = useLanguage();
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  const live = catalogueEntry(selected) ?? catalogueModes()[0];

  return (
    <div data-testid="lobby-go-live-panel" className="flex flex-col gap-2.5 lg:gap-4">
      <ClassroomModeSpotlight
        mode={live}
        keys={catalogueKeys(live, modeStyleFor(live, playStyle))}
        minutes={minutes}
        language={language}
        dir={dir}
        busy={busy}
        blockedKey={blockedKey}
        onGoLive={onGoLive}
        t={tt}
      />

      {isModeBlocked && <ModeSuggestion selected={live.id} isBlocked={isModeBlocked} onPick={onPick} t={tt} />}

      {withCardRow && (
        <ClassroomModeCardRow
          selected={live.id}
          recommended={recommended}
          selectedMinutes={minutes}
          minutesFor={minutesFor}
          busy={busy}
          onPick={onPick}
          dir={dir}
          t={tt}
        />
      )}
    </div>
  );
}

type T = (key: string, params?: Record<string, string | number>) => string;

export interface ClassroomModeCardRowProps {
  selected: CatalogueMode['id'];
  recommended?: CatalogueMode['id'] | null;
  /** Minutes for the selected card (the room's configured round). */
  selectedMinutes?: number;
  minutesFor?: (id: CatalogueMode['id']) => number;
  busy?: boolean;
  onPick: (id: CatalogueMode['id']) => void;
  /** Page direction; omitted, the row reads it from the nearest `dir` ancestor. */
  dir?: 'rtl' | 'ltr';
  t: T;
}

function isRtl(el: HTMLElement): boolean {
  return el.closest('[dir]')?.getAttribute('dir') === 'rtl';
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Every mode as a selectable card, grouped by category, in a sideways carousel.
 * Shared by the launch screen and the live-lobby switcher.
 *
 * Below `lg` the row is a carousel: the selected card is scrolled to the
 * middle (half-row inline padding lets even the first and last card reach it)
 * and chevrons make the sideways scroll obvious on a tablet. From `lg` all
 * seven cards fit as an equal-width grid, so nothing scrolls, nothing is
 * clipped and the chevrons stand down — forcing a carousel there showed at
 * most 4 of 7 cards and could scroll the selected one out of view.
 */
export function ClassroomModeCardRow({ selected, recommended = null, selectedMinutes, minutesFor, busy, onPick, dir, t }: ClassroomModeCardRowProps) {
  const modes = catalogueModes();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const centredOnce = useRef(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const card = scroller?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
    if (!scroller || !card || typeof scroller.scrollBy !== 'function') return;
    // Rect deltas, not scrollLeft maths: scrollLeft is negative in RTL.
    const row = scroller.getBoundingClientRect();
    const box = card.getBoundingClientRect();
    // Rects are in zoomed pixels but scrollBy is not: on a wall the stage has
    // CSS `zoom: 1.3` (TV_STAGE_ZOOM_CLASS), which left the card 1/1.3 short.
    const zoom = scroller.offsetWidth > 0 ? row.width / scroller.offsetWidth : 1;
    const left = (box.left + box.width / 2 - (row.left + row.width / 2)) / zoom;
    const smooth = centredOnce.current && !prefersReducedMotion();
    centredOnce.current = true;
    if (Math.abs(left) > 1) scroller.scrollBy({ left, behavior: smooth ? 'smooth' : 'auto' });
  }, [selected]);

  const page = (forward: boolean) => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof scroller.scrollBy !== 'function') return;
    const step = Math.max(scroller.clientWidth * 0.6, 160);
    const towardRight = forward !== (dir ? dir === 'rtl' : isRtl(scroller));
    scroller.scrollBy({ left: towardRight ? step : -step, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const chevron =
    'absolute top-1/2 z-20 hidden size-10 -translate-y-1/2 place-items-center rounded-full border-[2px] border-neo-cream/40 bg-neo-navy/80 text-neo-cream backdrop-blur-sm transition-colors hover:border-neo-cream hover:bg-neo-navy focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan md:grid lg:hidden';

  return (
    <div className="flex flex-col" dir={dir}>
    <p
      data-testid="mode-row-swipe-hint"
      className="lg:hidden flex items-center justify-end gap-1 px-0.5 font-neo-display text-[0.7rem] font-black uppercase tracking-wide text-neo-yellow"
    >
      {t('eg2Modes.swipeHint', { count: modes.length })}
      <DirectionalIcon icon={ChevronsRight} className="h-4 w-4" />
    </p>
    <div className="relative">
    <button
      type="button"
      data-testid="mode-row-prev"
      aria-label={t('eg2Modes.scrollPrev')}
      onClick={() => page(false)}
      className={cn(chevron, 'start-0')}
    >
      <DirectionalIcon icon={ChevronLeft} className="size-6" />
    </button>
    <div
      ref={scrollerRef}
      data-testid="mode-row-scroller"
      role="radiogroup"
      aria-label={t('eg2Modes.title')}
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-[calc(50%-3.3rem)] pb-2 pt-3 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-2 lg:pb-1.5 [&::-webkit-scrollbar]:hidden"
    >
      {CATALOGUE_CATEGORIES.map((category) => {
        const group = modes.filter((m) => m.category === category);
        return (
          <div
            key={category}
            data-testid={`mode-group-${category}`}
            className="flex shrink-0 flex-col gap-1.5 lg:min-w-0 lg:shrink-0 lg:basis-[var(--group-basis)]"
            // Equal card widths across groups: n sevenths of the row minus its share of the gaps.
            style={{ ['--group-basis' as string]: `calc((100% - ${(modes.length - 1) * 12}px) * ${group.length} / ${modes.length} + ${(group.length - 1) * 12}px)` }}
          >
            <span className="flex items-center gap-1.5 px-0.5 text-start font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-neo-cream lg:text-sm">
              <span aria-hidden="true" className="h-[3px] w-3 shrink-0 bg-neo-cream" />
              {t(`eg2Modes.category.${category}`)}
            </span>
            <div className="flex gap-2 lg:grid lg:gap-3" style={{ gridTemplateColumns: `repeat(${group.length}, minmax(0, 1fr))` }}>
              {group.map((mode) => {
                const isLive = mode.id === selected;
                const catalogMinutes = teacherGameMode(mode.launch.gameMode)?.minutes ?? 3;
                const cardMinutes = isLive && selectedMinutes !== undefined ? selectedMinutes : (minutesFor?.(mode.id) ?? catalogMinutes);
                return (
                  <ClassroomModeCatalogueCard
                    key={mode.id}
                    mode={mode}
                    name={t(catalogueKeys(mode).name)}
                    minutesLabel={t('education.modePicker.minutes', { count: cardMinutes })}
                    recommendedLabel={recommended === mode.id ? t('education.modePicker.recommended') : null}
                    deliveryTag={<DeliveryTag delivery={mode.delivery} t={t} />}
                    selected={isLive}
                    busy={busy}
                    onPick={onPick}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
    <button
      type="button"
      data-testid="mode-row-next"
      aria-label={t('eg2Modes.scrollNext')}
      onClick={() => page(true)}
      className={cn(chevron, 'end-0')}
    >
      <DirectionalIcon icon={ChevronRight} className="size-6" />
    </button>
    </div>
    </div>
  );
}

export default ClassroomModeCatalogue;
