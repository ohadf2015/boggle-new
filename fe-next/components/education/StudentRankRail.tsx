'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import LiveClassroomLeaderboard from '@/components/education/duels/LiveClassroomLeaderboard';
import { ScoreSparkBurst } from '@/components/education/duels/ScoreSparkBurst';
import { useModeSting } from '@/hooks/useModeSting';
import { useGameMode } from '@/hooks/gameState/selectors';
import type { ClassroomGameMode } from '@/shared/types/vocabQuiz';
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
 *  2. Me between the classmate just above and just below (the phone variant
 *     of LiveClassroomLeaderboard, fed the server's board). Relative/local
 *     rank is the documented alternative to an absolute board: it keeps the
 *     pull of a rival without publishing a position whose whole effect runs
 *     through competence frustration (research.md §1).
 *
 * A correct word lands on my own score instantly: a bounded spark burst, a
 * "+N" pop and the mode sting, keyed on the accepted word's id.
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
  /** The projecting teacher — never one of my neighbours. */
  isHost?: boolean;
}

/** How long the "+N" off my own score stays up. */
const SCORE_POP_MS = 900;

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
    () => selectStudentRankFraming(leaderboard.filter((e) => !e.isHost), currentUsername),
    [leaderboard, currentUsername],
  );

  const cue = useMemo(
    () => selectStudentMascotCue(feedback, { roundOver }),
    [feedback, roundOver],
  );

  // A correct word lands on MY score the instant the server accepts it —
  // before the (throttled) leaderboard broadcast moves the strip below.
  const gameMode = useGameMode();
  const { playModeSound } = useModeSting();
  const lastAcceptedRef = useRef<string | null>(null);
  const [scorePop, setScorePop] = useState<{ id: string; points: number } | null>(null);
  useEffect(() => {
    if (!feedback || feedback.type !== 'accepted' || roundOver) return;
    if (lastAcceptedRef.current === feedback.id) return;
    lastAcceptedRef.current = feedback.id;
    setScorePop({ id: feedback.id, points: feedback.score ?? 0 });
    if (gameMode && gameMode !== 'random') playModeSound(gameMode as ClassroomGameMode, 'start');
  }, [feedback, roundOver, gameMode, playModeSound]);
  useEffect(() => {
    if (!scorePop) return;
    const timer = setTimeout(() => setScorePop(null), SCORE_POP_MS);
    return () => clearTimeout(timer);
  }, [scorePop]);

  const neighbours = useMemo(() => leaderboard.filter((e) => !e.isHost), [leaderboard]);

  // Not on the board yet (joined late, no score recorded). A zero here would
  // read as "you have nothing", which is the opposite of the intent.
  if (!framing) return null;

  const { myScore } = framing;

  // My own progress. Score first — it is the number that moves when I find a
  // word, and it belongs to nobody else. It rides in MY slot of the strip.
  const ownProgress = (
    <div
      data-testid="student-own-progress"
      className={cn(
        'relative flex items-center gap-1 rounded-neo border-neo border-neo-cream/40 px-2 py-1',
        'bg-neo-navy-light font-neo-display text-neo-cream shadow-hard-sm select-none',
      )}
      role="status"
      aria-live="polite"
    >
      {scorePop && <ScoreSparkBurst id={scorePop.id} testId="student-score-burst" />}
      <AdaptiveMotion.span
        animate={{ scale: scorePop ? [1, 1.5, 1] : 1 }}
        transition={{ duration: 0.35 }}
        className="relative text-base font-black tabular-nums leading-none"
      >
        {myScore}
      </AdaptiveMotion.span>
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
      {scorePop && scorePop.points > 0 && (
        <AdaptiveMotion.span
          key={scorePop.id}
          data-testid="student-score-pop"
          aria-hidden="true"
          initial={{ y: 4, scale: 0.6 }}
          animate={{ y: -14, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          className={cn(
            'pointer-events-none absolute -top-2 start-1 z-10 rounded-neo border-2 border-neo-black',
            'bg-neo-lime px-1 text-[11px] font-black leading-tight text-neo-black tabular-nums',
          )}
        >
          {`+${scorePop.points}`}
        </AdaptiveMotion.span>
      )}
    </div>
  );

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

        {/* Me between the classmate just above and just below — the server's
            board, re-sorted live; direction is an icon, never a place number.
            MY slot is my own progress chip, so the whole HUD stays one row. */}
        <LiveClassroomLeaderboard
          variant="phone"
          leaderboard={neighbours}
          currentPlayer={currentUsername}
          renderMe={() => ownProgress}
        />
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
