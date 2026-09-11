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

import { useEffect, useRef } from 'react';
import { Check, X, EyeOff, Sparkles } from 'lucide-react';
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
  t,
}: WordCoverageGlanceProps) {
  const projector = size === 'projector';
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

  return (
    <section className={projector ? '' : 'mb-4'}>
      <div className="flex items-end gap-3 mb-2">
        <span
          className={cn(
            'font-neo-display font-black leading-none tabular-nums',
            // Gold is reserved for celebration, and a full sweep is the only
            // thing on this card that earns it.
            swept ? 'text-neo-yellow' : 'text-neo-lime',
            projector ? 'text-7xl' : 'text-4xl'
          )}
        >
          {found}
          <span className={cn('text-neo-white/50', projector ? 'text-4xl' : 'text-2xl')}>
            /{total}
          </span>
        </span>
        <p
          className={cn(
            'flex-1 text-neo-white font-neo-body font-bold leading-tight pb-1',
            projector ? 'text-2xl' : 'text-sm'
          )}
        >
          {isTeacher
            ? t('education.results.classCoverage', { found, total })
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
          'w-full rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated overflow-hidden mb-3',
          projector ? 'h-8' : 'h-4'
        )}
      >
        <div
          data-testid="coverage-fill"
          className={cn(
            'h-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
            swept ? 'bg-neo-yellow' : 'bg-neo-lime'
          )}
          style={{ width: `${fill ? pct : 0}%` }}
        />
      </div>

      <ul className="flex flex-wrap gap-2">
        {summary.coverage.map((entry) => {
          const hit = isTeacher ? entry.foundBy.length > 0 : foundByMe(entry);
          const unplaced = !hit && neverPlaced.has(entry.word.toLowerCase());
          return (
            <li
              key={entry.word}
              data-testid={`lesson-word-${entry.word}`}
              data-found={String(hit)}
              data-placed={unplaced ? 'false' : 'true'}
              className={cn(
                'flex items-center gap-1.5 rounded-neo font-bold',
                projector ? 'px-4 py-2.5 text-2xl' : 'px-3 py-1.5 text-sm',
                hit && 'border-[2px] border-neo-black bg-neo-lime text-neo-black shadow-hard-sm',
                !hit && !unplaced && 'border-[2px] border-neo-black bg-neo-navy-light text-neo-white/60',
                unplaced && 'border-2 border-dashed border-neo-white/40 text-neo-white/50'
              )}
            >
              {hit ? (
                <Check className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
              ) : unplaced ? (
                <EyeOff className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
              ) : (
                <X className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
              )}
              <span>{entry.word}</span>
              {isTeacher && entry.foundBy.length > 0 && (
                <span className={cn('ms-1 opacity-70', projector ? 'text-lg' : 'text-xs')}>
                  {entry.foundBy.length}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default WordCoverageGlance;
