'use client';

import { ResultsSocialSlot } from '@/components/results/ResultsSocialSlot';
import React, { useEffect, useRef, useState } from 'react';
import { m, animate as fmAnimate } from 'framer-motion';
import { Check, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyPlayedStatus } from '@/hooks/useDailyPlayedStatus';
import { DAILY_MODES, type DailyModeDef, type DailyModeId } from '@/lib/dailyModes';
import { SPRING_PRESETS } from '@/lib/animation/presets';
import { fireConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { useAuth } from '@/contexts/AuthContext';
import { useHeroCheer } from '@/lib/quickPlay/useHeroCheer';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { ResultsAvatarStage } from '@/components/results/stage/ResultsAvatarStage';
import { useDailyReveal, useMountedAfterReveal } from './reveal/DailyRevealContext';
import { REVEAL, useRevealSequence, type RevealStage } from './reveal/revealSequence';

export interface DailyResultsStat {
  value: React.ReactNode;
  label: string;
}

export interface DailyResultsHeroProps {
  mode: DailyModeId;
  outcome: 'win' | 'loss' | 'done';
  headline: string;
  /** Small line above the headline, e.g. the puzzle number or the solved word. */
  eyebrow?: React.ReactNode;
  score?: number;
  scoreLabel?: string;
  stats?: DailyResultsStat[];
  /** Mode-specific strip under the headline (rank ladder, answer tiles). */
  meter?: React.ReactNode;
  /** True only on the first view right after finishing: plays the entrance + confetti. */
  celebrate?: boolean;
  /** Footer row inside the card (share buttons). */
  children?: React.ReactNode;
  className?: string;
}

/* Full class strings: Tailwind emits nothing for `text-neo-${accent}`. */
const ACCENT = {
  orange: { text: 'text-neo-orange', bg: 'bg-neo-orange', ring: 'ring-neo-orange' },
  yellow: { text: 'text-neo-yellow', bg: 'bg-neo-yellow', ring: 'ring-neo-yellow' },
  cyan: { text: 'text-neo-cyan', bg: 'bg-neo-cyan', ring: 'ring-neo-cyan' },
  purple: { text: 'text-neo-purple', bg: 'bg-neo-purple', ring: 'ring-neo-purple' },
} as const;

const ACCENT_HEX: Record<keyof typeof ACCENT, string> = {
  orange: '#ff6b35',
  yellow: '#ffe135',
  cyan: '#00ffff',
  purple: '#8b5cf6',
};

const PLAYED_KEY: Record<DailyModeId, 'wordWheel' | 'wordHunt' | 'connections' | 'wordTower'> = {
  'word-wheel': 'wordWheel',
  'word-hunt': 'wordHunt',
  connections: 'connections',
  'word-tower': 'wordTower',
};

const RESULTS_REFRESH_MS = 1500;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The top of every daily results screen. Mode art, accent, the day's quest
 * trail and the streak all come from the same registry and played-status hook
 * the hub reads, so finishing any mode looks and reads the same.
 */
export function DailyResultsHero({
  mode, outcome, headline, eyebrow, score, scoreLabel, stats, meter, celebrate = false, children, className,
}: DailyResultsHeroProps) {
  const { t } = useLanguage();
  const played = useDailyPlayedStatus();
  const def = DAILY_MODES.find(d => d.id === mode) as DailyModeDef;
  const accent = ACCENT[def.accent];
  const [reduced] = useState(prefersReducedMotion);
  const shared = useDailyReveal();
  const local = useRevealSequence(!shared.inProvider && celebrate && !reduced);
  const seq = shared.inProvider ? shared : local;
  const late = useMountedAfterReveal();
  const animateIn = celebrate && !reduced && !late && (!shared.inProvider || shared.active);
  const [shown, setShown] = useState(animateIn ? 0 : score ?? 0);
  const celebrated = useRef(false);
  const { user, profile } = useAuth();
  const [guestAvatar] = useState(() => (user ? null : getOrCreateStoredCustomAvatar()));
  const cheering = outcome !== 'loss';
  const mood = useHeroCheer(cheering, !reduced);
  const scoreGo = seq.stage >= REVEAL.score;

  useEffect(() => {
    if (score == null) return;
    if (!animateIn || score === 0 || seq.skipped) { setShown(score); return; }
    if (!scoreGo) return;
    const controls = fmAnimate(0, score, {
      duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: v => setShown(Math.round(v)),
    });
    return () => controls?.stop?.();
  }, [score, animateIn, scoreGo, seq.skipped]);

  // The mode's score post is fire-and-forget; re-ask once it has likely landed
  // (silent revalidation — the trail and streak update in place, no skeleton).
  const refreshPlayed = useRef(played.refresh);
  refreshPlayed.current = played.refresh;
  useEffect(() => {
    const id = setTimeout(() => { void refreshPlayed.current(); }, RESULTS_REFRESH_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!celebrate || late || outcome !== 'win' || celebrated.current) return;
    // Marked inside the timer: StrictMode's effect re-run clears the first one.
    const id = setTimeout(() => {
      celebrated.current = true;
      if (shared.claimCelebration()) fireConfetti({ particleCount: 90, spread: 100, origin: { y: 0.3 } });
    }, 450);
    return () => clearTimeout(id);
  }, [celebrate, late, outcome, shared]);

  const doneCount = DAILY_MODES.filter(d => d.id === mode || played.today[PLAYED_KEY[d.id]]).length;
  const streak = played.streak?.current ?? 0;
  const pop = (delay: number) => (animateIn
    ? { initial: { scale: 0.6, y: 10 }, animate: { scale: 1, y: 0 }, transition: { ...SPRING_PRESETS.bouncy, delay } }
    : {});
  // Stage-gated pose: held at `from` until the beat, then springs home. Space is reserved from the first frame.
  const beat = (stage: RevealStage, from: Record<string, number>, delay = 0) => {
    if (!animateIn) return {};
    const home = Object.fromEntries(Object.keys(from).map(k => [k, k.startsWith('scale') ? 1 : 0]));
    return {
      initial: from,
      animate: seq.stage >= stage ? home : from,
      transition: seq.skipped ? { duration: 0 } : { ...SPRING_PRESETS.bouncy, delay },
    };
  };
  const tapFeel = { whileTap: { scale: 0.88 }, onPointerDown: () => { triggerHaptic('light'); } };
  const skipping = animateIn && !seq.done;

  return (
    <section
      data-testid="daily-results-hero"
      data-mode={mode}
      data-outcome={outcome}
      data-reveal={seq.done ? 'done' : 'playing'}
      onClick={skipping ? seq.skip : undefined}
      className={cn('relative w-full rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-lg overflow-hidden', className)}
    >

      <span aria-hidden className={cn('absolute inset-x-0 top-0 z-10 h-1.5', accent.bg)} />

      <div className="relative z-10 flex items-center gap-2 px-4 pt-4" data-testid="daily-trail">
        <ol aria-label={t('daily.results.heroDaily')} className="flex items-center gap-1.5 shrink-0">
          {DAILY_MODES.map((d, i) => {
            const isThis = d.id === mode;
            // This screen IS the finish: don't wait for the score post to mark it done.
            const isDone = isThis || played.today[PLAYED_KEY[d.id]];
            return (
              <li
                key={d.id}
                data-testid={`daily-trail-${d.id}`}
                data-state={isDone ? 'done' : 'todo'}
                className={cn(
                  'relative w-7 h-7 rounded-full border-2 border-neo-black overflow-hidden bg-neo-navy',
                  isThis && cn('ring-2 ring-offset-1 ring-offset-neo-navy-light', accent.ring),
                  !isDone && 'opacity-50',
                )}
              >
                <m.span className="block w-full h-full" {...pop(0.15 + i * 0.06)}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 28px decorative thumb */}
                  <img src={d.art} alt="" className="w-full h-full object-cover" draggable={false} />
                </m.span>
                {isDone && (
                  <span className="absolute inset-0 grid place-items-center bg-neo-lime/60">
                    <Check className="w-4 h-4 text-neo-black" strokeWidth={4} aria-hidden />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <span data-testid="daily-trail-count" className="text-xs font-black text-neo-white/80 tabular-nums whitespace-nowrap min-w-0 truncate">
          {skipping ? <span className="text-neo-white/50">{t('blastProgress.tapToSkip')}</span> : t('daily.results.trailCount', { n: doneCount, total: DAILY_MODES.length })}
        </span>
        {streak > 0 && (
          <span
            data-testid="daily-results-streak"
            aria-label={t('daily.results.heroStreak', { n: streak })}
            className="ms-auto flex items-center gap-1 px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-orange text-neo-black text-sm font-black tabular-nums"
          >
            <Flame className="w-4 h-4" strokeWidth={2.75} aria-hidden />
            {streak}
          </span>
        )}
      </div>

      <ResultsAvatarStage
        compact
        avatar={{ userId: user?.id ?? 'guest', customAvatar: profile?.avatar_config ?? guestAvatar }}
        mood={mood}
        accentHex={ACCENT_HEX[def.accent]}
        animate={!reduced}
        cheering={cheering}
        confettiCount={0}
      />

      <div className="relative z-10 flex items-center gap-4 px-4 pt-1 pb-3">
        <m.div
          className={cn('relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-3 border-neo-black overflow-hidden shadow-hard', outcome === 'loss' && 'grayscale-[35%]')}
          {...(animateIn
            ? { initial: { scale: 0.4, rotate: -12 }, animate: { scale: 1, rotate: 0 }, transition: { ...SPRING_PRESETS.bouncy, delay: 0.05 } }
            : {})}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative mode art */}
          <img src={def.art} alt="" className="w-full h-full object-cover" draggable={false} />
        </m.div>
        <div className="min-w-0 flex-1">
          <span className={cn('block text-xs font-black uppercase tracking-[0.18em]', accent.text)}>
            {t(def.titleKey)}{eyebrow != null && <span className="text-neo-white/60"> · {eyebrow}</span>}
          </span>
          <m.h2
            className="font-neo-display font-black text-3xl sm:text-4xl text-neo-white leading-tight origin-[0%_60%] rtl:origin-[100%_60%]"
            {...beat(REVEAL.stamp, { scale: 0, rotate: -10 })}
          >
            {headline}
          </m.h2>
          {score != null && (
            <m.div className="flex items-baseline gap-1.5 mt-0.5 w-fit cursor-pointer select-none" {...pop(0.3)} {...tapFeel}>
              <span data-testid="daily-results-score" className={cn('font-neo-display font-black text-4xl tabular-nums leading-none', accent.text)}>
                {shown}
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-neo-white/65">{scoreLabel ?? t('daily.results.heroScore')}</span>
            </m.div>
          )}
        </div>
      </div>

      {meter && <m.div className="px-4 pb-3" {...beat(REVEAL.stamp, { y: 10 }, 0.1)}>{meter}</m.div>}

      {stats && stats.length > 0 && (
        <div
          className="grid border-t-3 border-neo-black divide-x-3 rtl:divide-x-reverse divide-neo-black"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
        >
          {stats.map((s, i) => (
            <m.div
              key={s.label}
              data-testid="daily-results-stat"
              className="px-2 py-3 flex flex-col items-center gap-0.5 min-w-0 cursor-pointer select-none"
              {...beat(REVEAL.stats, { scale: 0, y: 14 }, i * 0.08)}
              {...tapFeel}
            >
              <span dir="auto" className="font-neo-display font-black text-2xl text-neo-white tabular-nums leading-none truncate max-w-full">
                {s.value}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-neo-white/65 text-center">{s.label}</span>
            </m.div>
          ))}
        </div>
      )}

      {children && (
        <div className="border-t-3 border-neo-black bg-neo-black/20 p-3">
          <m.div {...beat(REVEAL.details, { y: 16, scale: 0.94 })}>{children}</m.div>
        </div>
      )}
      <div className="border-t-3 border-neo-black p-3"><ResultsSocialSlot mode="daily" score={score} subMode={mode} /></div>
    </section>
  );
}

export default DailyResultsHero;
