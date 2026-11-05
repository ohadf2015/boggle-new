'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { m } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { AnimatedNumber, CelebrationBurst, EDU_MOTION, Reveal, Stagger, pressMotion, pressClasses, staggerDelay, useReducedMotionSafe } from '@/components/education/motion';
import { EDU_MASCOT } from '@/lib/education/mascotArt';
import { speakWord } from '@/lib/speech/textToSpeech';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

const BIG = 'font-neo-display font-black leading-none tabular-nums';
const HEADLINE = 'max-w-sm font-neo-display text-3xl font-black leading-tight text-neo-yellow drop-shadow-[2px_2px_0_rgb(var(--neo-black))] sm:text-4xl';

type Stat = 'points' | 'rank' | 'words';
const TONE: Record<Stat, { band: string; value: string }> = {
  points: { band: 'bg-neo-yellow', value: 'text-neo-yellow' },
  rank: { band: 'bg-neo-cyan', value: 'text-neo-cyan' },
  words: { band: 'bg-neo-lime', value: 'text-neo-lime' },
};

function StatTile({ stat, label, wide, beat = 0, children }: { stat: Stat; label: string; wide?: boolean; beat?: number; children: ReactNode }) {
  return (
    <Reveal delay={staggerDelay(beat)} className={cn('flex min-w-0 flex-1 basis-0', wide ? 'max-w-xs' : 'max-w-[13rem]')}>
      <div
        data-testid="results-stat-tile"
        data-stat={stat}
        className={cn('flex w-full min-w-0 flex-col rounded-neo border-3 border-neo-black p-[3px] pt-0 shadow-hard', TONE[stat].band)}
      >
        <p dir="auto" className="truncate px-2 py-1 text-center font-neo-display text-xs font-black uppercase tracking-[0.14em] text-neo-black">{label}</p>
        <div className={cn('flex min-h-[4.5rem] flex-1 flex-col items-center justify-center gap-2 rounded-neo-sm bg-neo-navy px-2 py-2', TONE[stat].value)}>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

function Mascot({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="pointer-events-none aspect-square h-full max-w-full select-none object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))]"
    />
  );
}

const BOB = { y: [0, -8, 0], rotate: [0, 2, 0] };

// The hero row takes only the height left over, so the art fills a TV, gives way on a short phone, and never overlaps the numbers.
const HERO_ROW = { full: 'grid-rows-[minmax(4.5rem,22rem)]', compact: 'grid-rows-[minmax(4.5rem,18rem)]' } as const;
const STEP_GRID = 'relative grid h-full min-h-0 w-full max-w-md content-center justify-items-center gap-3 text-center';

/** Pops up from below, cheers with a burst, then idles with a small bob; all transform, static under reduced motion. */
function CheerMascot({ src, cheer }: { src: string; cheer: boolean }) {
  const reduced = useReducedMotionSafe();
  const [landed, setLanded] = useState(false);
  const idle = landed && !reduced;
  return (
    <div data-testid="results-mascot" className="relative grid h-full min-h-0 w-full place-items-center">
      <m.div
        className="flex h-full min-h-0 justify-center"
        initial={reduced ? false : { scale: 0.55, y: 32, rotate: -12 }}
        animate={idle ? BOB : { scale: 1, y: 0, rotate: 0 }}
        transition={reduced ? { duration: 0 } : idle ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : EDU_MOTION.spring.pop}
        onAnimationComplete={() => setLanded(true)}
      >
        <Mascot src={src} />
      </m.div>
      {cheer && <CelebrationBurst playing={landed} burstKey={src} variant="confetti" count={12} />}
    </div>
  );
}

function useCanSpeak() {
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => {
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);
  return canSpeak;
}

function MissedRow({ word, wordLang, canSpeak, t }: { word: string; wordLang: string; canSpeak: boolean; t: T }) {
  const reduced = useReducedMotionSafe();
  return (
    <div
      data-testid="missed-word-row"
      data-word={word}
      className="flex min-h-12 items-center gap-3 rounded-neo border-3 border-neo-black bg-neo-cream px-3 py-1.5 text-neo-black shadow-hard-sm"
    >
      <bdi dir="auto" className="min-w-0 flex-1 truncate text-start font-neo-display text-xl font-black">{word}</bdi>
      {canSpeak && (
        <m.button
          type="button"
          {...pressMotion(reduced)}
          onClick={() => void speakWord(word, wordLang)}
          aria-label={t('education.results.steps.hear', { word })}
          className={cn(pressClasses(2), 'grid size-11 shrink-0 place-items-center rounded-full border-3 border-neo-black bg-neo-cyan text-neo-black')}
        >
          <Volume2 className="size-5" aria-hidden />
        </m.button>
      )}
    </div>
  );
}

const PREVIEW_ROWS = 3;

/** First-screen peek at the misses; the footer's REVIEW opens the full list. */
function MissedPreview({ words, wordLang, t }: { words: string[]; wordLang: string; t: T }) {
  const canSpeak = useCanSpeak();
  const shown = words.slice(0, PREVIEW_ROWS);
  const more = words.length - shown.length;
  return (
    <section data-testid="results-missed-preview" className="flex w-full flex-col gap-2 text-start">
      <h3 dir="auto" className="font-neo-display text-sm font-black uppercase tracking-[0.14em] text-neo-white">
        {t('education.results.steps.missedTitle', { count: words.length })}
      </h3>
      <Stagger className="grid gap-2" itemClassName="min-w-0">
        {shown.map((word) => <MissedRow key={word} word={word} wordLang={wordLang} canSpeak={canSpeak} t={t} />)}
      </Stagger>
      {more > 0 && (
        <p dir="auto" className="font-neo-body text-sm font-bold text-neo-white/80">{t('education.results.steps.moreWords', { count: more })}</p>
      )}
    </section>
  );
}

/** Lesson tally bar; grows by transform so it never reflows the step. */
function TallyBar({ pct, label }: { pct: number; label: string }) {
  const reduced = useReducedMotionSafe();
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className="relative block h-5 w-full max-w-xs overflow-hidden rounded-full border-3 border-neo-cream/50 bg-neo-black/50"
    >
      <m.span
        className="absolute inset-0 block origin-left rounded-full bg-neo-lime rtl:origin-right"
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: Math.max(0, Math.min(1, pct)) }}
        transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.settle, delay: 0.25 }}
      />
    </span>
  );
}

export function ScoreStep({ score, rank, players, showRank, lessonName, missed = [], wordLang = 'en', t }: {
  score: number; rank: number; players: number; showRank: boolean; lessonName: string; missed?: string[]; wordLang?: string; t: T;
}) {
  const [landed, setLanded] = useState(false);
  const winner = showRank && rank === 1;
  return (
    <div data-testid="results-step-score" className={cn(STEP_GRID, missed.length > 0 ? HERO_ROW.compact : HERO_ROW.full)}>
      <CheerMascot src={winner ? EDU_MASCOT.podium : EDU_MASCOT.success} cheer />
      <Reveal delay={staggerDelay(1)} className="flex flex-col items-center gap-1">
        <h2 dir="auto" className={HEADLINE}>{t('education.results.steps.roundDone')}</h2>
        {lessonName && <p dir="auto" className="font-neo-body text-sm font-bold text-neo-white/70">{lessonName}</p>}
      </Reveal>
      <div className="flex w-full justify-center gap-3">
        <StatTile stat="points" beat={2} label={t('education.results.steps.tilePoints')}>
          <span className={cn(BIG, 'text-4xl')}>
            <AnimatedNumber to={score} from={0} onDone={() => setLanded(true)} />
          </span>
        </StatTile>
        {showRank && (
          <StatTile stat="rank" beat={3} label={t('education.results.steps.tileRank')}>
            <span data-testid="results-step-rank" className={cn(BIG, 'text-4xl')}>
              <span className="sr-only">{t('education.results.steps.place', { rank, players })}</span>
              <bdi aria-hidden="true">#{rank}<span className="text-2xl text-neo-white/60"> / {players}</span></bdi>
            </span>
          </StatTile>
        )}
      </div>
      {missed.length > 0 && <MissedPreview words={missed} wordLang={wordLang} t={t} />}
      <CelebrationBurst playing={landed} burstKey={score} variant="confetti" count={winner ? 16 : 10} />
    </div>
  );
}

export function LessonStep({ found, total, t }: { found: number; total: number; t: T }) {
  const all = total > 0 && found >= total;
  const [landed, setLanded] = useState(false);
  const headline = all
    ? t('education.results.steps.allFound')
    : found === 0
      ? t('education.results.steps.noneFound')
      : t('education.results.steps.toGo', { left: total - found });
  return (
    <div data-testid="results-step-lesson" className={cn(STEP_GRID, HERO_ROW.full, 'gap-4')}>
      <CheerMascot src={all ? EDU_MASCOT.success : EDU_MASCOT.tip} cheer={false} />
      <Reveal delay={staggerDelay(1)}>
        <h2 dir="auto" className={HEADLINE}>{headline}</h2>
      </Reveal>
      <div className="flex w-full justify-center">
        <StatTile stat="words" wide beat={2} label={t('education.results.steps.lessonLabel')}>
          <p className={cn(BIG, 'text-4xl')} aria-label={t('education.results.steps.lessonCount', { found, total })}>
            <bdi>
              <AnimatedNumber to={found} from={0} onDone={() => setLanded(true)} />
              <span className="text-neo-white/60"> / {total}</span>
            </bdi>
          </p>
          <span className="sr-only">{t('education.results.steps.lessonCount', { found, total })}</span>
          <TallyBar pct={total ? found / total : 0} label={t('education.results.steps.lessonLabel')} />
        </StatTile>
      </div>
      <CelebrationBurst playing={landed && all} burstKey={found} count={14} />
    </div>
  );
}

/** Review mascot peeking up beside its speech bubble; transform-only entrance on two small elements. */
function ReviewCoach({ title, hint }: { title: string; hint?: string }) {
  const reduced = useReducedMotionSafe();
  return (
    <div className="flex items-end gap-2">
      <m.div
        className="shrink-0"
        initial={reduced ? false : { y: 28, rotate: -8 }}
        animate={{ y: 0, rotate: 0 }}
        transition={reduced ? { duration: 0 } : EDU_MOTION.spring.pop}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- mascot art map path, decorative */}
        <img
          src={EDU_MASCOT.reviewTest}
          alt=""
          aria-hidden="true"
          className="pointer-events-none size-[clamp(4.5rem,22cqh,10rem)] select-none object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))]"
        />
      </m.div>
      <m.div
        data-testid="missed-bubble"
        className="relative mb-3 min-w-0 flex-1 origin-left rounded-neo border-3 border-neo-black bg-neo-cream px-3 py-2.5 text-neo-black shadow-hard-sm rtl:origin-right"
        initial={reduced ? false : { scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={reduced ? { duration: 0 } : { ...EDU_MOTION.spring.pop, delay: 0.12 }}
      >
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-0 size-3.5 -translate-x-1/2 rotate-45 border-b-3 border-l-3 border-neo-black bg-neo-cream rtl:left-auto rtl:right-0 rtl:translate-x-1/2 rtl:rotate-[225deg]"
        />
        <h2 dir="auto" className="text-balance font-neo-display text-2xl font-black leading-tight sm:text-3xl">{title}</h2>
        {hint && <p dir="auto" className="mt-0.5 font-neo-body text-sm font-bold text-neo-black/70">{hint}</p>}
      </m.div>
    </div>
  );
}

export function MissedStep({ words, wordLang, t }: { words: string[]; wordLang: string; t: T }) {
  const canSpeak = useCanSpeak();
  return (
    <div data-testid="results-step-missed" className="flex w-full max-w-md flex-col gap-3">
      <ReviewCoach
        title={t('education.results.steps.missedTitle', { count: words.length })}
        hint={canSpeak ? t('education.results.steps.missedHint') : undefined}
      />
      <Stagger className="grid gap-2 sm:grid-cols-2">
        {words.map((word) => <MissedRow key={word} word={word} wordLang={wordLang} canSpeak={canSpeak} t={t} />)}
      </Stagger>
    </div>
  );
}
