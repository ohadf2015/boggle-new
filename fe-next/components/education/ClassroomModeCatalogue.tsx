'use client';

// A card only selects; GO LIVE launches and names the mode, so the two cannot disagree (Class 3).

import { ChevronsRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
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
}: ClassroomModeCatalogueProps) {
  const { t, language } = useLanguage();
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  const live = catalogueEntry(selected) ?? catalogueModes()[0];

  return (
    <div data-testid="lobby-go-live-panel" className="flex flex-col gap-2.5 lg:gap-4">
      <ClassroomModeSpotlight
        mode={live}
        keys={catalogueKeys(live, modeStyleFor(live, playStyle))}
        minutes={minutes}
        language={language}
        busy={busy}
        blockedKey={blockedKey}
        onGoLive={onGoLive}
        t={tt}
      />

      <ClassroomModeCardRow
        selected={live.id}
        recommended={recommended}
        selectedMinutes={minutes}
        minutesFor={minutesFor}
        busy={busy}
        onPick={onPick}
        t={tt}
      />
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
  t: T;
}

/** Every mode as a selectable card, grouped by category. Shared by the launch screen and the live-lobby switcher. */
export function ClassroomModeCardRow({ selected, recommended = null, selectedMinutes, minutesFor, busy, onPick, t }: ClassroomModeCardRowProps) {
  const modes = catalogueModes();
  return (
    <div className="flex flex-col">
    <p
      data-testid="mode-row-swipe-hint"
      className="lg:hidden flex items-center justify-end gap-1 px-0.5 font-neo-display text-[0.7rem] font-black uppercase tracking-wide text-neo-yellow"
    >
      {t('eg2Modes.swipeHint', { count: modes.length })}
      <DirectionalIcon icon={ChevronsRight} className="h-4 w-4" />
    </p>
    <div
      role="radiogroup"
      aria-label={t('eg2Modes.title')}
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-3 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0"
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
            <span className="flex items-center gap-1.5 px-0.5 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-neo-cream lg:text-sm">
              <span aria-hidden="true" className="h-[3px] w-3 bg-neo-cream" />
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
    </div>
  );
}

export default ClassroomModeCatalogue;
