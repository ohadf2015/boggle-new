'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { getMascotImagePath, MASCOT_IMAGES } from '@/components/ui/mascotData';
import { selectStudentRankFraming } from '@/lib/education/studentRankFraming';
import { selectStudentMascotCue } from '@/lib/education/studentMascotCue';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { TranslationFn } from '@/components/game/in-game/types';
import { cn } from '@/lib/utils';

/**
 * The classroom student's in-round HUD — what replaces "#24 / 28".
 *
 * Two things sit here, and nothing else:
 *
 *  1. My own score and word count. Not comparative to anybody, and the half a
 *     student in the bottom of the class can still move.
 *  2. ONE nearby classmate and the points between us. Relative/local rank is
 *     the documented alternative to an absolute board: it keeps the pull of a
 *     rival without publishing a position whose whole effect runs through
 *     competence frustration (research.md §1).
 *
 * Deliberately absent, and each absence is the point:
 *  - No rank number and no class size. `selectStudentRankFraming` cannot even
 *    produce them.
 *  - No "{name} passed you!" alert. `MobileRankIndicator` fires that in
 *    `bg-neo-red` with `role="alert"` on every overtake, which is a live,
 *    social demotion cue aimed squarely at the student the research protects.
 *    Public multiplayer keeps it; a class session does not.
 *  - No full standings list. The teacher's projector still shows the room.
 *
 * The mascot is the third thing — the Duolingo mechanic rather than the Kahoot
 * one: continuous micro-feedback from one character, so that a correct word, a
 * lesson word and a miss each land as a small reaction instead of a number
 * ticking. Its face is chosen by `selectStudentMascotCue`; this file only
 * renders it.
 *
 * Surface rules: dark ground is hardcoded `bg-neo-navy-light` (the
 * `bg-neo-cream dark:bg-neo-navy` pair flashes cream before the dark class
 * resolves), borders on navy are cream/40 rather than black (black measures
 * 1.23:1 there), and the only motion is a short transient on the message chip —
 * through `AdaptiveMotion`, so reduced-motion and low-end devices get it static.
 */

interface RankedEntry {
  username: string;
  score: number;
}

interface StudentRankRailProps {
  leaderboard: ReadonlyArray<RankedEntry>;
  currentUsername: string;
  /** Words I have found this round — my own progress, nobody else's. */
  wordsFound: number;
  /** Last word event; drives the mascot. */
  feedback?: WordFeedback | null;
  /** The round is over — the mascot stops reacting and celebrates. */
  roundOver?: boolean;
  t: TranslationFn;
  dir?: 'ltr' | 'rtl';
}

/** Reaction frames, warmed once so the first miss is not a blank box. */
const PRELOADED_VARIANTS = [
  MASCOT_IMAGES.celebration,
  MASCOT_IMAGES.oops,
] as const;

const RIVAL_CHIP_STYLE = {
  // Bright fills carry BLACK text and a black border (~20:1 both ways).
  ahead: 'bg-neo-cyan text-neo-black border-neo-black',
  behind: 'bg-neo-lime text-neo-black border-neo-black',
  tie: 'bg-neo-cream text-neo-black border-neo-black',
} as const;

const RIVAL_ICON = {
  ahead: ChevronUp,
  behind: ChevronDown,
  tie: Minus,
} as const;

const RIVAL_LABEL_KEY = {
  ahead: 'education.student.feel.rival.toCatch',
  behind: 'education.student.feel.rival.ahead',
  tie: 'education.student.feel.rival.tied',
} as const;

const MESSAGE_TONE = {
  ok: 'bg-neo-lime/15 border-neo-lime text-neo-lime',
  info: 'bg-neo-cyan/15 border-neo-cyan text-neo-cyan',
  muted: 'bg-neo-cream/10 border-neo-cream/40 text-neo-cream',
} as const;

export function StudentRankRail({
  leaderboard,
  currentUsername,
  wordsFound,
  feedback = null,
  roundOver = false,
  t,
  dir = 'ltr',
}: StudentRankRailProps) {
  // Warm the two reaction frames. They are animated WebPs of a few hundred KB;
  // decoded on first use they pop in blank on a school phone, which reads as a
  // broken cue rather than a late one.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    PRELOADED_VARIANTS.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  const framing = useMemo(
    () => selectStudentRankFraming(leaderboard, currentUsername),
    [leaderboard, currentUsername],
  );

  const cue = useMemo(
    () => selectStudentMascotCue(feedback, { roundOver }),
    [feedback, roundOver],
  );

  // Not on the board yet (joined late, no score recorded). A zero here would
  // read as "you have nothing", which is the opposite of the intent.
  if (!framing) return null;

  const { myScore, rival } = framing;
  const RivalIcon = rival ? RIVAL_ICON[rival.direction] : null;

  return (
    <div className="block lg:hidden relative" dir={dir}>
      <div className="flex items-center justify-center gap-1.5">
        {/* The mascot. Always present — continuity is the mechanic; only its
            face changes. Sized small: this rail sits above a game board. */}
        <span
          className={cn(
            'shrink-0 overflow-hidden rounded-full border-neo border-neo-cream/40',
            'h-9 w-9 bg-neo-navy',
          )}
        >
          <Image
            data-testid="student-mascot"
            src={getMascotImagePath(cue.variant)}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            unoptimized
            className="h-full w-full object-cover"
          />
        </span>

        {/* My own progress. Score first — it is the number that moves when I
            find a word, and it belongs to nobody else. */}
        <div
          data-testid="student-own-progress"
          className={cn(
            'flex items-center gap-1.5 rounded-neo border-neo border-neo-cream/40 px-3 py-1',
            'bg-neo-navy-light font-neo-display text-neo-cream shadow-hard-sm select-none',
          )}
          role="status"
          aria-live="polite"
        >
          <span className="text-base font-black tabular-nums leading-none">{myScore}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
            {t('education.student.feel.points')}
          </span>
          <span className="opacity-40" aria-hidden="true">
            ·
          </span>
          <span className="text-sm font-black tabular-nums leading-none">{wordsFound}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
            {t('education.student.feel.words')}
          </span>
        </div>

        {/* One classmate. Direction is carried by an icon AND a word, never by
            the fill alone — colour-vision deficiency must not lose the meaning. */}
        {rival && RivalIcon && (
          <div
            data-testid="student-rival-chip"
            className={cn(
              'flex max-w-[9rem] items-center gap-1 rounded-neo border-neo px-2 py-1',
              'font-neo-display shadow-hard-sm select-none',
              RIVAL_CHIP_STYLE[rival.direction],
            )}
            role="status"
            aria-live="polite"
          >
            <RivalIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate text-xs font-black">{rival.name}</span>
            {rival.direction !== 'tie' && (
              <span className="text-xs font-black tabular-nums">{rival.gap}</span>
            )}
            <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">
              {t(RIVAL_LABEL_KEY[rival.direction])}
            </span>
          </div>
        )}
      </div>

      {/* The reaction line. Small, transient, and keyed on the feedback id so a
          second correct word re-fires it instead of sitting there. */}
      <AnimatePresence mode="wait">
        {cue.messageKey && (
          <AdaptiveMotion.div
            key={feedback?.id ?? cue.mood}
            data-testid="student-mascot-message"
            initial={{ opacity: 0, y: -4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className={cn(
              'absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap',
              'flex items-center gap-1 rounded-neo border-neo px-2.5 py-1',
              'font-neo-display text-[11px] font-black',
              MESSAGE_TONE[cue.tone],
            )}
            role="status"
            aria-live="polite"
          >
            <span>
              {t(
                cue.messageKey,
                undefined,
                cue.lessonBonus !== null ? { bonus: cue.lessonBonus } : undefined,
              )}
            </span>
            {cue.points !== null && cue.points > 0 && (
              <span className="tabular-nums">{`+${cue.points}`}</span>
            )}
          </AdaptiveMotion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentRankRail;
