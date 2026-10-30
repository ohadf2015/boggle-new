/**
 * The class's word coverage in one glance.
 *
 * A teacher standing at the back of the room gets one number and one bar; the
 * chips underneath answer "which ones" without a second screen. For the
 * teacher "found" means the class found it; for a student it means they did —
 * same list, different question.
 *
 * A word the board generator never embedded is drawn as an outline chip, not a
 * miss. It is a fact about the board, not about the class.
 *
 * THE SWEEP. 100% is the one celebration on this screen that belongs to
 * everyone in the room, including the child who came last, so the meter fills
 * and bursts: gold instead of lime, a tag, one short chime, one burst of
 * confetti. It fires once per mount (`celebrate`), and the gold state is
 * PAINTED even when the celebration is not armed — a reload, a screenshot or a
 * reduced-motion render still shows that the class swept it (Pitfall Class 5:
 * the resting state is the truthful one, never a frame waiting for a tween).
 *
 * The burst and the chime are two separate permissions (`celebrate`, `cue`).
 * The sweep belongs to everyone, so every phone bursts; the sound belongs to
 * the room, so only the room's screen makes it — and on a swept round it is the
 * ONLY sound the screen makes, the winner's sting standing down for it.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, X, EyeOff, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti, cleanupConfetti } from '@/utils/confettiUtils';
import { playRoundEndCue, CLASS_SWEEP_SOUND } from '@/lib/education/roundEndSound';
import type { ClassroomSummary } from '@/shared/types/classroom';

export interface WordCoverageGlanceProps {
  summary: ClassroomSummary;
  username: string;
  isTeacher: boolean;
  /** Lower-cased set of words the board never carried. */
  neverPlaced: Set<string>;
  /** `projector` scales the type for the back of a classroom. */
  size?: 'card' | 'projector';
  /**
   * Held at zero by the staged reveal until the meter's beat. Defaults to
   * TRUE: any caller that does not stage gets the real width on the first
   * frame, which is the state a capture has to be able to read.
   */
  fill?: boolean;
  /** Arm the 100% burst (confetti + chime). The gold state paints regardless. */
  celebrate?: boolean;
  /**
   * May THIS screen make the noise? Split from `celebrate` on purpose: the
   * confetti is everyone's — a class sweep belongs to the child who came last
   * as much as to the winner — but thirty phones chiming a third of a second
   * apart is noise, not a celebration. The room's screen says yes; a
   * classmate's phone bursts in silence.
   */
  cue?: boolean;
  /**
   * Did the CLASS find every lesson word? The sweep belongs to the room, so
   * this — not the viewer's own tally — is what arms the burst and what puts
   * the room's line on a student's phone. Omitted, the component falls back to
   * whatever the meter itself shows, which is the right answer on the teacher's
   * class-wide meter and on the projector.
   */
  classSwept?: boolean;
  /**
   * Print only the words still to teach. A projector is read from the back of
   * a room at a glance, and thirty green chips saying "yes we found house" is
   * a register, not a lesson — the meter above already gave that number. What
   * a teacher looks up for is the short list of what to do next. The phone
   * card keeps the full list, because it is held, and read.
   */
  missedOnly?: boolean;
  /**
   * Hard cap on printed chips, with the remainder counted in one more chip. A
   * class that found nothing of thirty must not push the one button off the
   * bottom of the wall (which is exactly what it did: scrollHeight 1202 in a
   * 595px viewport).
   */
  maxChips?: number;
  /** Replaces the found/total meter with a plain heading, for a round where that meter would read 0 beside real points. */
  heading?: string;
  /** Whether the empty missed list may say "all found". The wall passes the shared reteach verdict, which counts a word found by too few as still to teach. */
  allFoundLine?: boolean;
  /** Teacher wall: cream count and meter, smaller type, so Play again stays the one lime fill. */
  calm?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function WordCoverageGlance({
  summary,
  username,
  isTeacher,
  neverPlaced,
  size = 'card',
  fill = true,
  celebrate = false,
  cue = true,
  classSwept,
  missedOnly = false,
  maxChips,
  heading,
  allFoundLine = true,
  calm = false,
  t,
}: WordCoverageGlanceProps) {
  const projector = size === 'projector';
  // Under a heading the list shares its panel with other content, so it skips the 2xl wall upscale.
  const wallXL = projector && heading === undefined;
  const [expanded, setExpanded] = useState(false);
  const chipIcon = !projector
    ? 'w-4 h-4'
    : calm
      ? 'w-4 h-4 @[96rem]/results:w-6 @[96rem]/results:h-6'
      : cn('w-6 h-6', wallXL && '@[96rem]/results:w-8 @[96rem]/results:h-8');
  // A late joiner has no mastery row; treat them as having found nothing rather
  // than crashing or hiding the card.
  const mine = summary.masteryByPlayer[username] ?? { found: 0, total: summary.totalWords };
  const found = isTeacher ? summary.classFoundCount : mine.found;
  const total = isTeacher ? summary.totalWords : mine.total;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  // A lesson with no words is not a sweep, it is an empty lesson.
  const swept = total > 0 && found >= total;
  // The room's answer, which is not the same question as the meter's. A student
  // who found two of four still lives in a class that found all four.
  const roomSwept = classSwept ?? swept;
  // …and the room's line is only news on a screen whose meter is personal. The
  // teacher's meter IS the class's; its gold sweep tag already said it.
  const showClassLine = roomSwept && !swept;

  const { sfxMuted, sfxVolume } = useSoundEffects();
  const burstRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!celebrate || !roomSwept || burstRef.current) return;
    burstRef.current = true;
    // `fireVictoryConfetti` already refuses under prefers-reduced-motion.
    fireVictoryConfetti();
    // The burst is for every screen; the chime is for the room's.
    if (!cue) return;
    audioRef.current = playRoundEndCue(CLASS_SWEEP_SOUND, {
      unlocked: true,
      muted: sfxMuted,
      volume: sfxVolume,
    });
  }, [celebrate, roomSwept, cue, sfxMuted, sfxVolume]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
      cleanupConfetti();
    },
    []
  );

  const foundByMe = (word: { foundBy: string[] }) =>
    word.foundBy.some((n) => n.toLowerCase() === username.toLowerCase());

  const wasFound = (entry: { word: string; foundBy: string[] }) =>
    isTeacher ? entry.foundBy.length > 0 : foundByMe(entry);

  // Two independent trims, in this order: drop what is already learnt, then
  // cap what is left. Both are counted, never silently dropped — a teacher
  // reading "12 to reteach" off a wall that printed 12 of 30 would plan the
  // wrong lesson.
  const listed = missedOnly ? summary.coverage.filter((e) => !wasFound(e)) : summary.coverage;
  // The cap is the WALL's default, not a ceiling on what the room may read.
  // A count with no words behind it is a number a teacher cannot act on, and
  // the list region below is already the one scrollable area here, so the
  // expansion costs no layout that was not already paid for.
  const capped = typeof maxChips === 'number' ? listed.slice(0, maxChips) : listed;
  const shown = expanded ? listed : capped;
  const hidden = listed.length - capped.length;

  return (
    <section className={projector ? 'min-h-0 flex-1 flex flex-col' : 'mb-4'}>
      {heading !== undefined ? (
        <p
          data-testid="coverage-heading"
          dir="auto"
          className={cn('shrink-0 mb-2 font-neo-display text-neo-white/85', calm ? 'font-bold' : 'font-black uppercase tracking-wide', projector ? 'text-xl @[96rem]/results:text-2xl' : 'text-sm')}
        >
          {heading}
        </p>
      ) : (
        <>
          <div className={cn('shrink-0 flex items-end gap-3', calm ? 'mb-1.5' : 'mb-2')}>
            <span
              className={cn(
                'font-neo-display font-black leading-none tabular-nums',
                // Gold is reserved for celebration, and a full sweep is the only
                // thing on this card that earns it.
                swept ? 'text-neo-yellow' : calm ? 'text-neo-cream' : 'text-neo-lime',
                projector ? (calm ? 'text-5xl @[96rem]/results:text-7xl' : 'text-6xl @[96rem]/results:text-9xl') : calm ? 'text-3xl' : 'text-4xl'
              )}
            >
              {found}
              <span className={cn('text-neo-white/50', projector ? (calm ? 'text-2xl @[96rem]/results:text-4xl' : 'text-3xl @[96rem]/results:text-6xl') : calm ? 'text-xl' : 'text-2xl')}>
                /{total}
              </span>
            </span>
            <p
              className={cn(
                'flex-1 text-neo-white font-neo-body font-bold leading-tight pb-1',
                projector ? (calm ? 'text-lg @[96rem]/results:text-2xl' : 'text-xl @[96rem]/results:text-4xl') : 'text-sm'
              )}
            >
              {isTeacher
                ? // The wall prints the number beside this line in 9xl; saying it again in words was noise.
                  t(projector || calm ? 'eduResultsV3.coverageLabel' : 'education.results.classCoverage', { found, total })
                : t('education.results.yourMastery', { found, total })}
            </p>

            {swept && (
              <span
                data-testid="coverage-sweep"
                className={cn(
                  'shrink-0 flex items-center gap-1.5 rounded-neo border-[2px] border-neo-black shadow-hard-sm',
                  'bg-neo-yellow text-neo-black font-neo-display font-black uppercase tracking-wide',
                  // Transform-only wobble on a tag — nothing large, nothing faded.
                  'animate-neo-wobble motion-reduce:animate-none',
                  projector ? 'px-4 py-2 text-2xl' : 'px-2.5 py-1 text-xs'
                )}
              >
                <Sparkles className={projector ? 'w-6 h-6' : 'w-3.5 h-3.5'} aria-hidden />
                {t('education.results.moment.sweepTag')}
              </span>
            )}
          </div>

          {/* The room's line. A student who found two of four gets no gold on
              their own meter — and should not — but the class sweep is the one
              celebration on this screen that is theirs too, so it lands on their
              phone on the same beat it lands on the wall. Painted, never tweened. */}
          {showClassLine && (
            <p
              data-testid="class-sweep-tag"
              className={cn(
                'mb-2 flex items-center gap-2 rounded-neo border-[2px] border-neo-black shadow-hard-sm',
                'bg-neo-yellow text-neo-black font-neo-display font-black uppercase tracking-wide',
                projector ? 'px-4 py-2 text-2xl' : 'px-3 py-1.5 text-xs'
              )}
            >
              <Sparkles className={projector ? 'w-6 h-6 shrink-0' : 'w-4 h-4 shrink-0'} aria-hidden />
              {t('education.results.moment.classSweptTag', { total: summary.totalWords })}
            </p>
          )}

          <div
            data-testid="coverage-meter"
            role="progressbar"
            aria-valuenow={found}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label={t('education.results.coverageMeterLabel', { percent: pct })}
            className={cn(
              'w-full shrink-0 rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated overflow-hidden',
              calm ? 'mb-2' : 'mb-3',
              projector ? (calm ? 'h-4 @[96rem]/results:h-6' : 'h-6 @[96rem]/results:h-10') : calm ? 'h-3' : 'h-4'
            )}
          >
            <div
              data-testid="coverage-fill"
              className={cn(
                'h-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
                swept ? 'bg-neo-yellow' : calm ? 'bg-neo-cream/80' : 'bg-neo-lime'
              )}
              style={{ width: `${fill ? pct : 0}%` }}
            />
          </div>
        </>
      )}

      <ul
        data-testid="coverage-words"
        className={cn(
          'flex flex-wrap gap-2 content-start',
          // The ONE region on the projector that may overflow, and it is the
          // least important one. Everything a teacher acts on — the meter, the
          // podium, the button — is outside it and always on the wall.
          projector && 'min-h-0 flex-1 overflow-y-auto pb-1 @[96rem]/results:gap-3'
        )}
      >
        {shown.map((entry) => {
          const hit = wasFound(entry);
          const unplaced = !hit && neverPlaced.has(entry.word.toLowerCase());
          return (
            <li
              key={entry.word}
              data-testid={`lesson-word-${entry.word}`}
              data-found={String(hit)}
              data-placed={unplaced ? 'false' : 'true'}
              className={cn(
                'flex items-center gap-1.5 rounded-neo font-bold',
                projector
                  ? calm
                    ? 'px-2.5 py-1 text-base @[96rem]/results:px-3.5 @[96rem]/results:py-1.5 @[96rem]/results:text-2xl'
                    : cn('px-3 py-1.5 text-xl', wallXL && '@5xl/results:text-2xl @[96rem]/results:px-5 @[96rem]/results:py-2.5 @[96rem]/results:text-3xl')
                  : calm ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm',
                hit && 'border-[2px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm',
                !hit && !unplaced && 'border-[2px] border-neo-cream bg-neo-navy-light text-neo-white/60',
                // A word the board never carried is still a word a teacher
                // reads off a wall: the dash says "not the class's fault",
                // the 75% keeps it legible (50% measured 4.61:1 — over the
                // line, but only just, and this is read from six metres).
                unplaced && 'border-2 border-dashed border-neo-cream/70 text-neo-white/75'
              )}
            >
              {hit ? (
                <Check className={chipIcon} aria-hidden />
              ) : unplaced ? (
                <EyeOff className={chipIcon} aria-hidden />
              ) : (
                <X className={chipIcon} aria-hidden />
              )}
              <span>{entry.word}</span>
              {isTeacher && entry.foundBy.length > 0 && (
                <span className={cn('ms-1 opacity-70', projector ? cn('text-lg', wallXL && '@[96rem]/results:text-xl') : 'text-xs')}>
                  {entry.foundBy.length}
                </span>
              )}
            </li>
          );
        })}

        {/* A swept round empties this list by construction — and an empty
            bordered panel is the last thing the 100% screen should show. The
            sweep takes the space the misses had, which is the whole point. */}
        {missedOnly && allFoundLine && shown.length === 0 && (
          <li
            data-testid="coverage-all-found"
            className={cn(
              'w-full flex items-center gap-3 rounded-neo font-bold',
              'border-[2px] border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm',
              projector ? 'px-5 py-4 text-3xl' : 'px-3 py-2 text-sm'
            )}
          >
            <Sparkles className={projector ? 'w-8 h-8 shrink-0' : 'w-4 h-4 shrink-0'} aria-hidden />
            {t('education.results.allFound')}
          </li>
        )}

        {hidden > 0 && (
          <li className="flex">
            <button
              type="button"
              data-testid="coverage-more"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                'flex items-center gap-2 rounded-neo font-bold',
                // Cream edge on navy measures 16.8:1 — this has to read as a
                // control from six metres, not as one more grey chip.
                'border-[2px] border-neo-cream bg-neo-navy text-neo-cream',
                'hover:bg-neo-navy-light transition-colors',
                projector ? (calm ? 'px-2.5 py-1 text-base @[96rem]/results:text-2xl' : 'px-4 py-2.5 text-2xl') : calm ? 'px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm'
              )}
            >
              {expanded ? (
                <ChevronUp className={cn(chipIcon, 'shrink-0')} aria-hidden />
              ) : (
                <ChevronDown className={cn(chipIcon, 'shrink-0')} aria-hidden />
              )}
              {expanded
                ? t('education.results.fewerWords')
                : t('education.results.moreWords', { count: hidden })}
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}

export default WordCoverageGlance;
