'use client';

/**
 * Missed Words Review intro — a vault heist: the round steel vault door with
 * the chest of books locked in its centre, the missed words as five gems
 * orbiting it, and one glowing "Crack the vault" button. Cold steel, cyan and
 * purple — deliberately nothing like the Workshop's gold VS splash.
 */

import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { claimIntroEntrance } from '@/lib/education/introEntrance';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { REVIEW_MASCOT_ART } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';
import { ACADEMY_ART } from './AcademyChrome';
import { INTRO_COPY, INTRO_CTA, INTRO_HERO, INTRO_KICKER, INTRO_LAYOUT, INTRO_TITLE } from './introLayout';
import { useIsHydrating } from './useIsHydrating';

const GEMS = ['#00ffff', '#c084fc', '#ff4fb0', '#bfff00', '#ffe135'] as const;
const GEM_SHAPE = 'polygon(50% 0, 100% 32%, 82% 100%, 18% 100%, 0 32%)';

function useReduce(): boolean {
  const prefers = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  return Boolean(prefers) || reducedEffects;
}

function Gem({ word, color }: { word: string; color: string }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span
        aria-hidden
        className="block h-[min(1.75rem+2cqmin,4.5rem)] w-[min(2rem+2.4cqmin,5.25rem)]"
        style={{
          clipPath: GEM_SHAPE,
          background: `linear-gradient(135deg, #fff 0%, ${color} 35%, ${color} 60%, rgba(0,0,0,0.55) 100%)`,
          filter: `drop-shadow(0 0 10px ${color})`,
        }}
      />
      <span
        className="whitespace-nowrap rounded-full border-2 border-black px-[0.6em] font-neo-display text-[clamp(0.7rem,3.2cqmin,2.1rem)] font-black text-black"
        style={{ background: color, boxShadow: '2px 2px 0 #000' }}
      >
        {word}
      </span>
    </span>
  );
}

export function ReviewVaultIntro({
  lessonName,
  words,
  onStart,
  loading = false,
}: {
  lessonName: string;
  words: string[];
  onStart: () => void;
  /** Still fetching the deck: the same vault with empty gem sockets and a disabled button (never a blank loader). */
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const reduce = useReduce();
  // Loader → loaded intro is a remount: play the entrance once, never a half-built replay.
  const mountId = useId();
  const [entrance] = useState(() => claimIntroEntrance('vault', Date.now(), mountId));
  // The server/hydration frame is the finished scene (chest drawn, door still): framer bakes `initial` into SSR HTML.
  const hydrating = useIsHydrating();
  const still = reduce || !entrance || hydrating;
  const gems = words.slice(0, 5);
  const sockets = loading ? 5 : gems.length;
  const bolts = Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2);

  return (
    <div className={INTRO_LAYOUT}>
      <div data-testid="review-hero" className={cn(INTRO_HERO, 'grid place-items-center')}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 48%, rgba(0,255,255,0.28), rgba(139,92,246,0.18) 35%, transparent 65%)' }} />
        <div className="relative [--door:min(72cqw,68cqh,62rem)]" style={{ width: 'var(--door)', height: 'var(--door)' }}>
          {/* The vault door: steel rim, 12 bolts, a recessed dial well holding the chest. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-full border-[4px] border-neo-cyan"
            style={{
              background: 'radial-gradient(circle at 38% 30%, #9fb0cc 0%, #5b6b86 38%, #2c3650 72%, #161d30 100%)',
              boxShadow: '8px 8px 0 #000, 0 0 50px rgba(0,255,255,0.45), inset 0 0 0 10px rgba(0,0,0,0.25)',
            }}
            initial={still ? false : { rotate: -90, scale: 0.7 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
          >
            {bolts.map((a, i) => (
              <span
                key={i}
                className="absolute h-[6%] w-[6%] rounded-full"
                style={{
                  left: `${50 + Math.cos(a) * 43 - 3}%`,
                  top: `${50 + Math.sin(a) * 43 - 3}%`,
                  background: 'radial-gradient(circle at 35% 30%, #e6edf7, #7d8aa3 60%, #3a4560)',
                  boxShadow: '1px 2px 0 #000',
                }}
              />
            ))}
            <span className="absolute inset-[16%] rounded-full" style={{ background: 'radial-gradient(circle at 50% 40%, #1f2a44, #0b1020 80%)', boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.8), 0 0 0 4px #000' }} />
          </motion.div>
          <motion.img
            src={ACADEMY_ART.chest}
            alt=""
            draggable={false}
            className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 object-contain"
            style={{ filter: 'drop-shadow(5px 5px 0 #000) drop-shadow(0 0 22px rgba(191,255,0,0.55))' }}
            initial={still ? false : { scale: 0 }}
            animate={reduce ? { scale: 1 } : { scale: 1, y: [0, -6, 0] }}
            transition={reduce ? undefined : { scale: { type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }, y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } }}
          />
          {/* Five word-gems orbiting the door. */}
          <motion.ul
            className="absolute inset-0"
            translate="no"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={reduce ? undefined : { duration: 40, repeat: Infinity, ease: 'linear' }}
          >
            {Array.from({ length: sockets }, (_, i) => {
              const w = gems[i];
              const a = (i / sockets) * Math.PI * 2 - Math.PI / 2;
              return (
                <li
                  key={w ?? `socket-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${50 + Math.cos(a) * 47}%`, top: `${50 + Math.sin(a) * 47}%` }}
                >
                  <motion.span
                    className="block"
                    animate={reduce ? undefined : { rotate: -360 }}
                    transition={reduce ? undefined : { duration: 40, repeat: Infinity, ease: 'linear' }}
                  >
                    {w ? (
                      <Gem word={w} color={GEMS[i % GEMS.length]} />
                    ) : (
                      <span aria-hidden className="block h-[min(1.75rem+2cqmin,4.5rem)] w-[min(2rem+2.4cqmin,5.25rem)] opacity-50" style={{ clipPath: GEM_SHAPE, background: 'linear-gradient(135deg, #9fb0cc, #2c3650)' }} />
                    )}
                  </motion.span>
                </li>
              );
            })}
          </motion.ul>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- static art */}
        <img
          src={REVIEW_MASCOT_ART.hello}
          alt=""
          draggable={false}
          className="absolute bottom-0 start-0 object-contain drop-shadow-[4px_4px_0_#000]"
          style={{ width: 'min(20cqw, 24cqh, 14rem)', height: 'min(20cqw, 24cqh, 14rem)' }}
        />
      </div>

      <motion.div
        initial={still ? false : { y: 30 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: reduce ? 0 : 0.15 }}
        className={INTRO_COPY}
      >
        <p className={cn(INTRO_KICKER, 'text-neo-cyan')}>{lessonName}</p>
        <h2 className={cn(INTRO_TITLE, 'mb-1 lg:text-[clamp(2.25rem,min(4.4vw,7.5vh),7rem)]')} style={{ textShadow: '3px 3px 0 #000' }}>
          {loading ? t('common.loading', 'Loading…') : t('academy.modes.review.vaultTitle', '{count} words locked in the vault', { count: words.length })}
        </h2>
        <p className="mb-3 font-neo-body text-sm text-neo-cream sm:text-base [@media(orientation:landscape)_and_(max-height:520px)]:mb-2! [@media(orientation:landscape)_and_(max-height:520px)]:text-sm! lg:mb-[clamp(1rem,3.5vh,2rem)] lg:text-[clamp(1rem,min(1.6vw,2.6vh),1.75rem)]">
          {t('academy.modes.review.introBody', '10 quick cards. Keep the streak alive, open the chest.')}
        </p>
        <motion.button
          type="button"
          data-testid={loading ? 'review-start-pending' : 'review-start'}
          disabled={loading}
          whileTap={{ scale: 0.95 }}
          onClick={onStart}
          animate={
            reduce || loading
              ? undefined
              : {
                  boxShadow: [
                    '6px 6px 0 #000, 0 0 16px rgba(0,255,255,0.4)',
                    '6px 6px 0 #000, 0 0 44px rgba(0,255,255,0.95)',
                    '6px 6px 0 #000, 0 0 16px rgba(0,255,255,0.4)',
                  ],
                }
          }
          transition={reduce ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            INTRO_CTA,
            'text-2xl [@media(orientation:landscape)_and_(max-height:520px)]:text-xl! lg:text-[clamp(1.5rem,min(3vw,5vh),4.25rem)]',
          )}
          style={{ background: 'linear-gradient(180deg, #b8ffff 0%, #00e5ff 45%, #8b5cf6 120%)', boxShadow: '6px 6px 0 #000, 0 0 28px rgba(0,255,255,0.7)' }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1 h-2 rounded-full bg-white/60" />
          <KeyRound className="relative h-[1.2em] w-[1.2em] shrink-0" aria-hidden />
          <span className="relative">{loading ? t('common.loading', 'Loading…') : t('academy.modes.review.crack', 'Crack the vault')}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
