'use client';

/**
 * Missed Words Review stage pieces: the mascot that reacts to every answer
 * (thinking → cheering / oops → on fire at a 3+ streak) and the run ring —
 * one segment per card around the chest the student is playing for, glowing
 * hotter as the streak climbs.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { REVIEW_MASCOT_ART, type ReviewMascotMood } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';
import { ACADEMY_ART } from './AcademyChrome';

function useReduce(): boolean {
  const prefers = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  return Boolean(prefers) || reducedEffects;
}

const MOOD_LINE: Record<ReviewMascotMood, { key: string; en: string }> = {
  think: { key: 'academy.modes.review.mascot.think', en: 'You know this one!' },
  cheer: { key: 'academy.modes.review.mascot.cheer', en: 'Nailed it!' },
  fire: { key: 'academy.modes.review.mascot.fire', en: "You're on fire!" },
  oops: { key: 'academy.modes.review.mascot.oops', en: "Oops! We'll see it again soon." },
};

export function ReviewMascot({ mood, className, big }: { mood: ReviewMascotMood; className?: string; big?: boolean }) {
  const { t } = useLanguage();
  const reduce = useReduce();
  const line = MOOD_LINE[mood];
  return (
    <div data-testid="review-mascot" data-mood={mood} className={cn('pointer-events-none flex flex-col items-center gap-1', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={mood}
          role="status"
          initial={reduce ? false : { scale: 0.5, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={reduce ? undefined : { scale: 0.6 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
          className={cn(
            'max-w-[9.5rem] rounded-2xl border-[3px] border-black bg-neo-cream px-2 py-1 text-center font-neo-display font-black leading-tight text-black shadow-hard',
            big ? 'lg:max-w-[min(16rem,14vw)] lg:px-3 lg:py-2 lg:text-[clamp(0.9rem,1.5vw,1.5rem)] min-[2200px]:max-w-[22rem] min-[2200px]:text-3xl' : '',
            'text-xs sm:text-sm',
          )}
        >
          {t(line.key, line.en)}
        </motion.p>
      </AnimatePresence>
      <motion.img
        key={`m-${mood}`}
        src={REVIEW_MASCOT_ART[mood]}
        alt=""
        draggable={false}
        className={cn('object-contain', big ? 'h-28 w-28 sm:h-36 sm:w-36 [@media(orientation:landscape)_and_(max-height:520px)]:h-20! [@media(orientation:landscape)_and_(max-height:520px)]:w-20! lg:h-[min(22rem,30vh,13vw)] lg:w-[min(22rem,30vh,13vw)]' : 'h-24 w-24')}
        initial={reduce ? false : { scale: 0.7, rotate: mood === 'oops' ? 8 : -8 }}
        animate={
          reduce
            ? { scale: 1 }
            : mood === 'oops'
              ? { scale: 1, rotate: 0, x: [0, -8, 8, -4, 0] }
              : mood === 'think'
                ? { scale: 1, rotate: 0, y: [0, -6, 0] }
                : { scale: [1, 1.15, 1], rotate: 0, y: [0, -16, 0] }
        }
        transition={
          reduce
            ? undefined
            : mood === 'think'
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.55, ease: 'easeOut' }
        }
      />
    </div>
  );
}

/** Segmented ring around the chest: lime = right, pink = missed, cream = current. */
export function ReviewRing({ answers, index, total, streak, chestLabel, progressLabel }: { answers: boolean[]; index: number; total: number; streak: number; chestLabel: string; progressLabel: string }) {
  const reduce = useReduce();
  const R = 46;
  const C = 2 * Math.PI * R;
  const gap = total > 1 ? 1.6 : 0;
  const seg = C / Math.max(1, total) - gap;
  const heat = Math.min(streak, 6);
  return (
    <div
      data-testid="review-ring"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={answers.length}
      aria-label={progressLabel}
      className="relative aspect-square h-[min(30vh,54vw)] w-[min(30vh,54vw)] lg:h-[min(44vh,36rem,15vw)] lg:w-[min(44vh,36rem,15vw)]"
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="rgba(10,10,30,0.55)" stroke="#000" strokeWidth="9" />
        {Array.from({ length: total }, (_, i) => {
          const color = i < answers.length ? (answers[i] ? '#bfff00' : '#ff1493') : i === index ? '#fffef0' : 'rgba(255,254,240,0.18)';
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeDasharray={`${seg} ${C - seg}`}
              strokeDashoffset={-(i * (seg + gap))}
            />
          );
        })}
      </svg>
      <div className="absolute inset-[16%] grid place-items-center">
        <motion.img
          src={ACADEMY_ART.chest}
          alt=""
          draggable={false}
          className="h-full w-full object-contain"
          style={{ filter: `drop-shadow(4px 4px 0 #000) drop-shadow(0 0 ${6 + heat * 6}px rgba(255,214,0,${0.35 + heat * 0.1}))` }}
          animate={reduce ? undefined : { y: [0, -5, 0], rotate: streak >= 3 ? [0, -3, 3, 0] : 0 }}
          transition={reduce ? undefined : { duration: streak >= 3 ? 0.9 : 2.2, repeat: Infinity }}
        />
      </div>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-neo border-[3px] border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-black shadow-hard sm:text-sm lg:text-[clamp(0.85rem,1.3vw,1.75rem)]">
        {chestLabel}
      </span>
    </div>
  );
}
