/**
 * One mode, as a poster you want to tap.
 *
 * Blooket's tile is a name on a flat field — the mechanic, the length and the
 * fit for your own material all live behind a second tap. The HERO tile here
 * carries all four on its face: the mascot in character for that game on a
 * full-bleed accent field, the name, one line of what a student actually DOES,
 * a minute chip, and (when the lesson earns it) a "best fit" flag.
 *
 * TWO SIZES, AND ONLY ONE OF THEM IS LOUD. Round 1 put five equally coloured
 * posters on screen at once and handed the ranking back to the teacher. The bar
 * (design card `education/03-mode-tiles`) shows one hero and folds the rest
 * away; when they are unfolded they are NEUTRAL — navy fill, cream edge, a navy
 * poster well — so exactly one accent colour is ever on the screen. Compact
 * tiles deliberately carry no how-it-plays line and no minute chip: they are a
 * menu of five names, not five specs to read standing in front of a class.
 *
 * CONTRAST. On a navy surface the edge is the mode's accent or cream, never
 * black (measured: black on navy = 1.23:1, cream on navy = 16.8:1). Labels on
 * an accent fill are BLACK (cream on lime = 1.2:1, cream on pink = 3.6:1).
 * Widths are written `border-[3px]`/`border-[4px]` next to the colour class,
 * never the `border-neo` utility, which tailwind-merge collapses into the
 * colour class and leaves the control with no border at all.
 *
 * Dark-only surface: `bg-neo-navy*` is hardcoded, never the cream/dark pair,
 * which flashes cream on a lazy mount (recurring pitfall class 5). The resting
 * state is fully painted; the only motion is a hover/active lift that
 * `motion-reduce:` drops.
 */

'use client';

import Image from 'next/image';
import { Clock, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ModeAccent, TeacherGameMode } from '@/lib/education/gameModes';

/**
 * Literal class strings, not `bg-neo-${accent}`: Tailwind generates a utility
 * only from a class that appears verbatim in the source (v4 behaviour we have
 * been bitten by before), so an interpolated accent would ship unstyled.
 *
 * No yellow and no orange anywhere — those are reserved for celebration/gold
 * and streak/fire, and a game mode is neither.
 */
const ACCENT_FIELD: Record<ModeAccent, string> = {
  cyan: 'bg-neo-cyan',
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  purple: 'bg-neo-purple',
};

/** Black on every accent: white on `--neo-purple` measures 4.29:1 and fails AA. */
const ACCENT_BAR: Record<ModeAccent, string> = {
  cyan: 'bg-neo-cyan text-black',
  lime: 'bg-neo-lime text-black',
  pink: 'bg-neo-pink text-black',
  purple: 'bg-neo-purple text-black',
};

const ACCENT_EDGE: Record<ModeAccent, string> = {
  cyan: 'border-neo-cyan',
  lime: 'border-neo-lime',
  pink: 'border-neo-pink',
  purple: 'border-neo-purple',
};

export type ModeTileSize = 'hero' | 'compact';

export interface ModePosterTileProps {
  mode: TeacherGameMode;
  selected: boolean;
  recommended: boolean;
  /** 'hero' is the single promoted tile; every alternate is 'compact'. */
  size: ModeTileSize;
  /** A room is already being created — taps would mint a second one. */
  busy?: boolean;
  onPick: (id: TeacherGameMode['id']) => void;
  /** Hero only: the fold's open state, mirrored onto the tile's aria. */
  expanded?: boolean;
  /**
   * Hero only. The big poster is not a radio — it is already the chosen mode —
   * so tapping it does the one thing a teacher could want from it: open the
   * list of the others. Same action as the "More modes" button beside it, so
   * the screen still offers ONE way to change the game, with two hit targets.
   */
  onOpenPicker?: () => void;
}

export function ModePosterTile({
  mode,
  selected,
  recommended,
  size,
  busy,
  onPick,
  expanded,
  onOpenPicker,
}: ModePosterTileProps) {
  const { t } = useLanguage();

  if (size === 'compact') {
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        data-testid={`mode-tile-${mode.id}`}
        data-size="compact"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          onPick(mode.id);
        }}
        className={cn(
          'flex min-w-0 flex-col items-center gap-1.5 rounded-neo border-[3px] border-neo-cream',
          'bg-neo-navy-light p-2 shadow-hard-sm',
          'transition-[transform,box-shadow] duration-150 motion-reduce:transition-none',
          'motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-hard motion-safe:active:translate-y-0.5',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          'disabled:cursor-wait'
        )}
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-neo border-[2px] border-black bg-neo-navy">
          <Image
            src={mode.poster}
            alt=""
            width={160}
            height={160}
            className="size-10 select-none object-contain"
            sizes="48px"
          />
        </span>
        <span className="w-full truncate text-center font-neo-display text-[0.7rem] font-black uppercase leading-tight text-neo-cream">
          {t(mode.nameKey)}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-testid={`mode-tile-${mode.id}`}
      data-size="hero"
      data-selected={selected ? 'true' : 'false'}
      aria-expanded={!!expanded}
      aria-label={t('education.modePicker.change')}
      disabled={busy}
      onClick={onOpenPicker}
      className={cn(
        'flex w-full items-stretch overflow-hidden rounded-neo border-[4px] text-start shadow-hard-lg',
        ACCENT_EDGE[mode.accent],
        'bg-neo-navy-light',
        'transition-[transform,box-shadow] duration-150 motion-reduce:transition-none',
        'motion-safe:active:translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        'disabled:cursor-wait'
      )}
    >
      <span
        className={cn(
          'relative grid w-24 shrink-0 place-items-center self-stretch border-e-[2px] border-black sm:w-32',
          ACCENT_FIELD[mode.accent]
        )}
      >
        <Image
          src={mode.poster}
          alt=""
          width={320}
          height={320}
          className="size-20 select-none object-contain sm:size-28"
          sizes="(max-width: 640px) 96px, 128px"
          priority
        />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'flex items-center justify-between gap-2 border-b-[2px] border-black px-2.5 py-1',
            ACCENT_BAR[mode.accent]
          )}
        >
          <span className="truncate font-neo-display text-base font-black uppercase leading-tight sm:text-xl">
            {t(mode.nameKey)}
          </span>
          {recommended && (
            <span
              data-testid="mode-recommended"
              className="inline-flex shrink-0 items-center gap-1 rounded-neo border-[2px] border-black bg-neo-navy px-1.5 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-tight text-neo-cream"
            >
              <Sparkles className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
              {t('education.modePicker.recommended')}
            </span>
          )}
        </span>

        <span className="flex-1 px-2.5 py-1.5 font-neo-body text-[0.8rem] font-bold leading-snug text-neo-cream sm:text-sm">
          {t(mode.howKey)}
        </span>

        <span className="flex items-center gap-1.5 px-2.5 pb-1.5">
          <span className="inline-flex items-center gap-1 rounded-neo border-[2px] border-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[0.65rem] font-black uppercase leading-tight text-black">
            <Clock className="size-3 shrink-0" strokeWidth={3} aria-hidden="true" />
            {t('education.modePicker.minutes', { count: mode.minutes })}
          </span>
        </span>
      </span>
    </button>
  );
}

export default ModePosterTile;
