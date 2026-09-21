/**
 * ClassPulseCard — one class, readable at arm's length.
 *
 * This replaces `StudentsPresentStrip`, which printed `member_count` under
 * the copy "{count} students are in {classroom} right now". A teacher with 28
 * enrolled students and an empty room was told 28 were present, in the
 * loudest slab on the page. Enrolment, participation and absence are three
 * different facts and this card keeps them three different lines.
 *
 * Form carries the state, not just the sentence: each state has its own edge
 * stripe colour AND its own icon shape, so a teacher scanning a column reads
 * the edge, and the state survives a colourblind reader as colour alone
 * would not.
 *
 * Contrast: on `bg-neo-navy` a black border measures 1.23:1 and disappears.
 * `NeoPanel tone="navy"` carries the cream/40 edge (3.74:1); every stripe and
 * chip border is a SOLID accent (min 4.35:1). Guarded by
 * components/education/__tests__/educationBorderContrast.test.ts.
 *
 * Motion earns its place: nothing tweens on entrance (that opacity tween is
 * the mobile flash of pitfall class 5). The only animation is the roster
 * number reacting when it CHANGES — a student joining — and it is skipped
 * outright under `prefers-reduced-motion`.
 */

'use client';

import { useCallback } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, Rocket, UserPlus, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { NeoPanel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';
import type { ClassNextAction, ClassPulse, ClassPulseState } from '@/lib/education/classPulse';

/**
 * The per-state visual contract, as complete literal class strings.
 *
 * Tailwind v4 only generates a utility it can see verbatim, so these must
 * never be built by interpolation — a `bg-neo-${tone}` here compiles, renders
 * nothing, and the stripe silently vanishes.
 */
type StateVisual = { stripe: string; chip: string; icon: typeof Users; labelKey: string };

/**
 * The card's own "still reading" appearance — NOT a ClassPulseState.
 *
 * It is deliberately not in the derivation's state union: loading is a
 * property of this render, not a fact about the class. Keeping it out means
 * `deriveClassPulse` never has to know a component is mid-fetch.
 */
const LOADING_STYLE: StateVisual = {
  stripe: 'bg-neo-cream/40',
  chip: 'border-neo-cream/40 bg-neo-navy-light text-neo-white/70',
  icon: Loader2,
  labelKey: 'teacher.pulse.state.loading',
};

const STATE_STYLE: Record<ClassPulseState, StateVisual> = {
  noRoster: {
    stripe: 'bg-neo-purple',
    chip: 'border-neo-purple bg-neo-purple/10 text-neo-white',
    icon: UserPlus,
    labelKey: 'teacher.pulse.state.noRoster',
  },
  neverPlayed: {
    stripe: 'bg-neo-cyan',
    chip: 'border-neo-cyan bg-neo-cyan/10 text-neo-white',
    icon: Rocket,
    labelKey: 'teacher.pulse.state.neverPlayed',
  },
  needsReview: {
    stripe: 'bg-neo-pink',
    chip: 'border-neo-pink bg-neo-pink/10 text-neo-white',
    icon: AlertTriangle,
    labelKey: 'teacher.pulse.state.needsReview',
  },
  ready: {
    stripe: 'bg-neo-lime',
    chip: 'border-neo-lime bg-neo-lime/10 text-neo-white',
    icon: CheckCircle2,
    labelKey: 'teacher.pulse.state.ready',
  },
  // The read failed. Cream, not an accent: this is the card saying it does
  // not know, and it must not be mistaken for one of the four real states.
  unknown: {
    stripe: 'bg-neo-cream',
    chip: 'border-neo-cream bg-neo-cream/10 text-neo-white',
    icon: HelpCircle,
    labelKey: 'teacher.pulse.state.unknown',
  },
};

/** The action button's fill. Black text on every one of these clears ~20:1. */
const ACTION_STYLE: Record<ClassNextAction, string> = {
  invite: 'bg-neo-purple',
  play: 'bg-neo-lime',
  review: 'bg-neo-pink',
  playAgain: 'bg-neo-lime',
  retry: 'bg-neo-cream',
};

export interface ClassPulseCardProps {
  classroomName: string;
  pulse: ClassPulse;
  /** True while the last-game read is still open. */
  isLoading?: boolean;
  onAction?: (action: ClassNextAction) => void;
  /** Review hands the missed words up so the parent can seed a lesson. */
  onReviewWords?: (words: string[]) => void;
  /**
   * When true, suppresses the play/playAgain button because the primary
   * launch path is elsewhere (e.g., GO LIVE on the dashboard).
   * @default false — button is shown for all actions
   */
  hidePlayAction?: boolean;
  className?: string;
}

export function ClassPulseCard({
  classroomName,
  pulse,
  isLoading = false,
  onAction,
  onReviewWords,
  hidePlayAction = false,
  className,
}: ClassPulseCardProps) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion() ?? false;
  // While the read is open the card shows its own loading identity rather
  // than the derivation's. `deriveClassPulse` sees `lastGame: null` mid-fetch
  // and correctly says "neverPlayed"; publishing that as a finding is the
  // optimistic render a later source overwrites (pitfall class 1). Measured
  // live at 1920x1080: a class that HAD played rendered "NOT PLAYED YET" over
  // its own skeleton before flipping to "NEEDS REVIEW".
  const shownState: ClassPulseState | 'loading' = isLoading ? 'loading' : pulse.state;
  const style = isLoading ? LOADING_STYLE : STATE_STYLE[pulse.state];
  const StateIcon = style.icon;

  const handleAction = useCallback(() => {
    if (pulse.nextAction === 'review' && pulse.topMissedWords.length > 0) {
      onReviewWords?.(pulse.topMissedWords);
    }
    onAction?.(pulse.nextAction);
  }, [pulse.nextAction, pulse.topMissedWords, onAction, onReviewWords]);

  return (
    <NeoPanel
      tone="navy"
      shadow="md"
      data-testid="class-pulse"
      data-state={shownState}
      className={cn('flex overflow-hidden', className)}
    >
      {/* The non-textual carrier. Full-height solid accent: at a glance, down
          a column of classes, this is the only thing being read. */}
      <span
        data-testid="class-pulse-stripe"
        data-state={shownState}
        aria-hidden="true"
        className={cn('w-2 shrink-0 self-stretch', style.stripe)}
      />

      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* `basis-40` is doing real work: with `flex-1 truncate` alone the
              heading shrinks to fit beside the chip rather than wrapping it,
              and in the dashboard's 1/3 rail "Year 7 English" rendered as
              "YEAR 7 EN…". Demanding 10rem makes the chip drop to its own
              line instead of eating the class's name. */}
          <h3 className="min-w-0 flex-1 basis-40 truncate font-neo-display text-lg font-black uppercase tracking-tight text-neo-white">
            {classroomName}
          </h3>
          <span
            data-testid="class-pulse-chip"
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-neo border-2 px-2.5 py-1',
              'font-neo-display text-xs font-black uppercase tracking-wide',
              style.chip
            )}
          >
            <StateIcon
              className={cn('size-3.5 shrink-0', isLoading && 'animate-spin')}
              strokeWidth={3}
              aria-hidden="true"
            />
            {t(style.labelKey)}
          </span>
        </div>

        {isLoading ? (
          // Pessimistic until every source lands: a participation line rendered
          // now would flip its numbers a moment later (pitfall class 1).
          <div
            data-testid="class-pulse-loading"
            className="mt-3 h-14 animate-pulse rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light"
          />
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p data-testid="class-pulse-roster" className="font-neo-body text-sm font-bold text-neo-white/80">
                {/* Keyed on the value so a join makes the number react. Not an
                    entrance tween — this plays only when the count changes. */}
                <m.span
                  key={reduceMotion ? 'static' : pulse.rosterCount}
                  initial={reduceMotion ? false : { scale: 1.35 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                  className="inline-block font-neo-display text-2xl font-black text-neo-white"
                >
                  {pulse.rosterCount}
                </m.span>{' '}
                {t('teacher.pulse.enrolled', { count: pulse.rosterCount })}
              </p>

              {pulse.playedCount !== null && (
                <p data-testid="class-pulse-participation" className="font-neo-body text-sm font-bold text-neo-white/80">
                  {t('teacher.pulse.participation', {
                    played: pulse.playedCount,
                    // Against the roster the GAME had, so played + absent adds
                    // up on screen even when the class has grown since.
                    total: pulse.gameRosterCount ?? pulse.playedCount,
                    absent: pulse.absentCount ?? 0,
                  })}
                </p>
              )}
            </div>

            {pulse.daysSinceLastGame !== null && (
              <p data-testid="class-pulse-lastgame" className="mt-1 font-neo-body text-xs font-bold text-neo-white/60">
                {/* Two keys, not one with a 0 in it: "played 0d ago" is the
                    kind of phrasing that tells a teacher a machine wrote the
                    screen. Today is a word, not a number. */}
                {t(
                  pulse.daysSinceLastGame === 0
                    ? 'teacher.pulse.lastPlayedToday'
                    : pulse.daysSinceLastGame === 1
                      ? 'teacher.pulse.lastPlayedOneDay'
                      : 'teacher.pulse.lastPlayedDays',
                  {
                    days: pulse.daysSinceLastGame,
                    accuracy: pulse.averageAccuracyPct ?? 0,
                  }
                )}
              </p>
            )}

            {pulse.strugglingCount > 0 && (
              <p
                data-testid="class-pulse-struggling"
                className="mt-3 rounded-neo border-2 border-neo-pink bg-neo-pink/10 px-3 py-2 font-neo-body text-sm font-bold text-neo-white"
              >
                {/* One student gets its own key. `{{count}} מתקשים` renders as
                    "1 struggling" in the plural in Hebrew, and Swedish and
                    Spanish have the same problem — a number poured into a
                    plural template is only invisible in English. */}
                {t(
                  pulse.strugglingCount === 1
                    ? 'teacher.pulse.strugglingOne'
                    : 'teacher.pulse.struggling',
                  {
                    count: pulse.strugglingCount,
                    names: pulse.struggling.map((s) => s.name).join(', '),
                  }
                )}
              </p>
            )}

            {pulse.topMissedWords.length > 0 && (
              <ul data-testid="class-pulse-missed" className="mt-2 flex flex-wrap gap-1.5">
                {pulse.topMissedWords.map((word) => (
                  <li
                    key={word}
                    className="rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-2 py-0.5 font-neo-body text-xs font-bold text-neo-white"
                  >
                    {word}
                  </li>
                ))}
              </ul>
            )}

            {/* Exactly ONE next action. A class in one state has one obvious
                move; a row of buttons is the teacher doing the triage.

                When hidePlayAction is true and the action is 'play' or
                'playAgain', suppress the button because the primary action is
                elsewhere (e.g., GO LIVE on the dashboard). */}
            {!(hidePlayAction && (pulse.nextAction === 'play' || pulse.nextAction === 'playAgain')) && (
              <button
                type="button"
                data-testid="class-pulse-action"
                onClick={handleAction}
                className={cn(
                  'mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-neo border-3 border-black px-4 py-2',
                  'font-neo-display text-sm font-black uppercase tracking-wide text-black shadow-hard-sm',
                  'transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  ACTION_STYLE[pulse.nextAction]
                )}
              >
                {t(`teacher.pulse.action.${pulse.nextAction}`)}
              </button>
            )}
          </>
        )}
      </div>
    </NeoPanel>
  );
}

export default ClassPulseCard;
