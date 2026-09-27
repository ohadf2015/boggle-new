'use client';

/**
 * Baron Buildaword — the Word Workshop's clockwork rival (the existing boss
 * art, one pose per mood). He lunges when he plays, reels when the student
 * builds a lesson word, and collapses when he loses. His taunt is a speech
 * bubble; the mood lives on `data-mood` so it is testable without pixels.
 */

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { RIVAL_ART, type RivalMood, type Taunt } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';

/** game = bubble only below 2xl (the scoreboard avatar is his face), full portrait in the 2xl side gutter. */
/** `arena` sizes itself from the VS arena's container (cq units): it must scale with the card, not the viewport. */
type Size = 'game' | 'hero' | 'arena';

const MOOD_MOTION: Record<RivalMood, { x?: number[]; rotate?: number[]; y?: number[]; scale?: number[] }> = {
  idle: {},
  attack: { x: [0, 18, -4, 0], scale: [1, 1.12, 1] },
  hurt: { x: [0, -10, 10, -6, 0], rotate: [0, -8, 6, 0] },
  enraged: { y: [0, -8, 0], scale: [1, 1.08, 1] },
  defeated: { rotate: [0, -12, -8], y: [0, 10, 6] },
};

export function WorkshopRival({
  mood,
  taunt,
  size = 'hero',
  className,
  bubbleSide = 'end',
}: {
  mood: RivalMood;
  taunt: Taunt | null;
  size?: Size;
  className?: string;
  bubbleSide?: 'end' | 'below';
}) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  const reduce = Boolean(prefersReduced) || reducedEffects;
  const name = t('academy.modes.workshop.rival.name', 'Baron Buildaword');
  const art = {
    game: 'hidden 2xl:block 2xl:h-64 2xl:w-64',
    hero: 'h-40 w-40 sm:h-52 sm:w-52 lg:h-80 lg:w-80',
    arena: 'h-[min(52cqw,52cqh)] w-[min(52cqw,52cqh)]',
  }[size];

  return (
    <div
      data-testid="workshop-rival"
      data-mood={mood}
      className={cn('pointer-events-none flex items-center gap-2', bubbleSide === 'below' && 'flex-col', className)}
    >
      <div className="relative flex shrink-0 flex-col items-center">
        <div className={cn('relative', art)}>
          <motion.img
            key={mood}
            src={RIVAL_ART[mood]}
            alt=""
            draggable={false}
            className="h-full w-full object-contain drop-shadow-[6px_6px_0_#000]"
            initial={reduce ? false : { scale: 0.85 }}
            animate={reduce ? { scale: 1 } : { scale: 1, ...MOOD_MOTION[mood] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {mood === 'idle' && !reduce && (
            <motion.span
              aria-hidden
              className="absolute inset-x-[20%] bottom-0 h-3 rounded-full bg-black/40"
              animate={{ scaleX: [1, 0.85, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <span
          className={cn(
            'z-10 -rotate-2 whitespace-nowrap rounded-neo border-[3px] border-black bg-neo-pink px-2 py-0.5 font-neo-display font-black uppercase text-black shadow-hard',
            size === 'game'
              ? 'sr-only 2xl:not-sr-only 2xl:-mt-4 2xl:text-xl'
              : size === 'arena'
                ? '-mt-[3cqmin] px-[1.6cqmin] text-[clamp(0.7rem,3.6cqmin,1.6rem)]'
                : '-mt-4 text-sm lg:text-xl',
          )}
        >
          {name}
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {taunt && (
          <motion.p
            key={taunt.key}
            data-testid="workshop-rival-taunt"
            role="status"
            initial={reduce ? false : { scale: 0.5, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={reduce ? undefined : { scale: 0.7 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            className={cn(
              'relative max-w-[13rem] rounded-2xl border-[3px] border-black bg-neo-cream px-3 py-1.5 font-neo-display font-black leading-tight text-black shadow-hard',
              size === 'game' ? 'text-sm 2xl:text-lg' : 'text-base lg:text-lg',
            )}
          >
            {t(taunt.key, taunt.en)}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
