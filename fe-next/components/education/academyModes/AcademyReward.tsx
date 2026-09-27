'use client';

/**
 * The end-of-round reward, shared by Word Workshop and Missed Words Review.
 *
 * Tap the chest-books → the lid blows: WT2's GodRays fan in the tier colour,
 * a shockwave ring, a burst of WT2 fx-stars (and bounded confetti where the
 * platform allows it), then the SERVER's XP counts up in big type and the
 * round's stats land as trophy numbers. WT2's ChestReveal/TierBurst are not
 * reused whole on purpose: they throw a CoinFountain, and an academy round
 * pays XP, never coins — showering currency the student doesn't get would lie.
 *
 * `academy-xp` always holds the real number as text (the animated counter is
 * an aria-hidden layer on top), so assistive tech and tests read the truth.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import { GodRays } from '@/components/wordTowerV2/rewards/GodRays';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';
import { countUpValue, rewardFx, type AcademyChestTier } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';
import { ACADEMY_ART } from './AcademyChrome';

export interface RewardStat {
  icon: ReactNode;
  value: string;
  /** Small trailing part of the number (e.g. "/10"), so the headline digit stays huge. */
  suffix?: string;
  label: string;
}

const COUNT_MS = 1100;
const CHEST_CLOSED = 'min(68vw, 38vh, 30rem)';
/** Phones: the opened chest steps back so the trophy numbers own the centre. Desktop keeps it big (side-by-side layout). */
const CHEST_OPEN = 'var(--chest-open)';

function spark(i: number, n: number, spread: number) {
  const angle = (i / n) * Math.PI * 2 + (i % 3) * 0.37;
  const reach = spread * 42 * (0.55 + ((i * 37) % 46) / 100);
  return {
    x: `${(Math.cos(angle) * reach).toFixed(1)}vmin`,
    y: `${(Math.sin(angle) * reach).toFixed(1)}vmin`,
    size: 14 + ((i * 17) % 22),
    spin: (i % 2 ? 1 : -1) * (160 + ((i * 29) % 220)),
    delay: ((i * 13) % 16) / 100,
  };
}

function XpCounter({ xp, reduce }: { xp: number; reduce: boolean }) {
  const { t } = useLanguage();
  const { playXpGainSound } = useSoundEffects();
  const [shown, setShown] = useState(reduce ? xp : 0);
  useEffect(() => {
    if (reduce || xp <= 0) {
      setShown(xp);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const v = countUpValue(xp, now - start, COUNT_MS);
      setShown(v);
      if (v < xp) raf = requestAnimationFrame(tick);
      else playXpGainSound?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [xp, reduce, playXpGainSound]);

  return (
    <motion.span
      data-testid="academy-xp"
      initial={reduce ? false : { scale: 0.5, rotate: -8 }}
      animate={{ scale: 1, rotate: -2 }}
      transition={{ type: 'spring', stiffness: 420, damping: 13 }}
      className="relative inline-flex items-center gap-2 rounded-neo border-[3px] border-black bg-neo-lime px-4 py-1 font-neo-display font-black text-black shadow-hard-lg"
    >
      <Sparkles className="h-7 w-7 lg:h-10 lg:w-10" aria-hidden />
      <span className="sr-only">{t('academy.modes.xpEarned', '+{xp} XP', { xp })}</span>
      <span aria-hidden dir="ltr" className="text-4xl tabular-nums leading-none sm:text-5xl lg:text-7xl">
        {t('academy.modes.xpEarned', '+{xp} XP', { xp: shown })}
      </span>
    </motion.span>
  );
}

export function AcademyReward({
  tier,
  headline,
  chestLabel,
  xp,
  stats,
  aside,
  note,
  actions,
}: {
  tier: AcademyChestTier;
  headline: string;
  chestLabel: string;
  /** Server XP; null = still recording. */
  xp: number | null;
  stats: RewardStat[];
  /** Extra art/content beside the chest (e.g. the defeated rival). */
  aside?: ReactNode;
  note?: ReactNode;
  actions: ReactNode;
}) {
  const { t } = useLanguage();
  const { playChestOpenSound, playEpicVictorySound } = useSoundEffects();
  const prefersReduced = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  const reduce = Boolean(prefersReduced) || reducedEffects;
  const [open, setOpen] = useState(false);
  const fx = rewardFx(tier);

  const onOpen = () => {
    if (open) return;
    setOpen(true);
    playChestOpenSound?.();
    if (tier === 'gold') playEpicVictorySound?.();
  };

  // One size for every trophy number: as big as the widest value lets a third of the row be.
  const widest = Math.max(2, ...stats.map((st) => [...st.value].length));
  const trophySize = `min(4.5rem, calc((min(100vw, 42rem) - 4.5rem) / 3 / ${(0.72 * widest).toFixed(2)}))`;

  return (
    <div
      data-testid="academy-reward"
      data-tier={tier}
      className={cn(
        'flex h-full min-h-0 w-full max-w-md flex-col items-center sm:max-w-2xl lg:max-w-none lg:flex-row lg:items-center lg:justify-center lg:gap-16',
        open ? 'justify-center gap-3' : 'gap-2',
      )}
    >
      {/* Chest stage — after the lid blows it shrinks up out of the way and the payout becomes the hero (phones). */}
      <div
        className={cn(
          'relative flex min-h-0 w-full flex-col items-center justify-center lg:h-full lg:max-w-[46rem] lg:flex-none lg:basis-1/2',
          open ? 'flex-none' : 'flex-1',
        )}
      >
        <motion.h2
          initial={reduce ? false : { y: -20, scale: 0.8 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          className="relative z-10 shrink-0 text-center font-neo-display text-3xl font-black uppercase leading-none text-neo-white sm:text-5xl lg:hidden"
          style={{ textShadow: '3px 3px 0 #000, 0 0 24px rgba(0,0,0,0.6)' }}
        >
          {headline}
        </motion.h2>
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <GodRays rays={open ? fx.rays : Math.max(4, fx.rays / 2)} hex={fx.hex} strength={open ? 0.8 : 0.35} reducedMotion={reduce} />
        </div>
        <BoundedConfettiBurst trigger={open && !reduce} size="lg">
          <div className={cn('relative grid min-h-0 place-items-center [--chest-open:min(40vw,16vh)] lg:p-10 lg:[--chest-open:min(30rem,44vh)]', open ? 'p-2' : 'p-6')}>
            <button
              type="button"
              data-testid="academy-chest"
              disabled={open}
              onClick={onOpen}
              aria-label={open ? chestLabel : t('academy.modes.tapToOpen', 'Tap to open')}
              className="relative grid place-items-center disabled:cursor-default"
              style={{
                width: open ? CHEST_OPEN : CHEST_CLOSED,
                height: open ? CHEST_OPEN : CHEST_CLOSED,
                transition: reduce ? undefined : 'width 450ms cubic-bezier(.3,1.4,.5,1), height 450ms cubic-bezier(.3,1.4,.5,1)',
              }}
            >
              {open && !reduce && (
                <motion.span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 rounded-full border-[6px]"
                  style={{ borderColor: fx.hex, width: '30%', height: '30%', marginLeft: '-15%', marginTop: '-15%' }}
                  initial={{ scale: 0.3, opacity: 0.95 }}
                  animate={{ scale: 5 * fx.spread, opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              )}
              <motion.img
                src={ACADEMY_ART.chest}
                alt=""
                draggable={false}
                className="relative h-full w-full object-contain"
                style={{ filter: `drop-shadow(6px 6px 0 #000) drop-shadow(0 0 ${open ? 22 : 12}px ${fx.hex})` }}
                animate={reduce ? undefined : open ? { scale: [0.8, 1.2, 1], y: [10, -16, 0] } : { rotate: [0, -6, 6, -4, 4, 0], y: [0, -6, 0] }}
                transition={reduce ? undefined : open ? { duration: 0.55 } : { duration: 0.9, repeat: Infinity, repeatDelay: 0.7 }}
              />
              {open && !reduce && (
                <span aria-hidden className="pointer-events-none absolute inset-0">
                  {Array.from({ length: fx.sparks }, (_, i) => {
                    const s = spark(i, fx.sparks, fx.spread);
                    return (
                      <motion.img
                        key={i}
                        src={ACADEMY_ART.star}
                        alt=""
                        className="absolute left-1/2 top-1/2"
                        style={{ width: s.size, height: s.size, marginLeft: -s.size / 2, marginTop: -s.size / 2 }}
                        initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                        animate={{ x: s.x, y: s.y, scale: [0.3, 1.2, 0.5], rotate: s.spin, opacity: [0, 1, 0] }}
                        transition={{ duration: 0.9 + fx.spread * 0.3, delay: s.delay, ease: 'easeOut' }}
                      />
                    );
                  })}
                </span>
              )}
              {!open && (
                <span className={cn('absolute -bottom-2 rounded-full border-[3px] border-black bg-neo-lime px-4 py-1 font-neo-display text-base font-black uppercase text-black shadow-hard lg:text-2xl', !reduce && 'motion-safe:animate-bounce')}>
                  {t('academy.modes.tapToOpen', 'Tap to open')}
                </span>
              )}
            </button>
          </div>
        </BoundedConfettiBurst>
        <span
          className="relative z-10 mt-1 shrink-0 -rotate-2 rounded-neo border-[3px] border-black px-3 py-0.5 font-neo-display text-sm font-black uppercase text-black shadow-hard lg:text-2xl"
          style={{ background: fx.hex }}
        >
          {chestLabel}
        </span>
        {aside}
      </div>

      {/* Payout + trophies + actions */}
      <div className={cn('flex w-full flex-col items-center gap-2 sm:gap-3 lg:max-w-[40rem] lg:flex-none lg:basis-1/2 lg:items-start lg:justify-center lg:gap-6', open ? 'shrink-0 gap-4' : 'shrink-0')}>
        <h2
          className="hidden font-neo-display text-7xl font-black uppercase leading-none text-neo-white lg:block"
          style={{ textShadow: '4px 4px 0 #000' }}
        >
          {headline}
        </h2>
        <div className="flex min-h-14 items-center justify-center lg:min-h-24">
          {!open ? (
              <p className="font-neo-display text-lg font-black uppercase text-neo-cream lg:text-3xl">
                {t('academy.modes.openForXp', 'Open the chest for your XP!')}
              </p>
            ) : xp === null ? (
              <span data-testid="academy-xp-pending" className="rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-4 py-2 font-neo-display text-lg font-bold text-neo-cream lg:text-3xl">
                {t('academy.modes.savingXp', 'Saving XP…')}
              </span>
            ) : (
              <XpCounter xp={xp} reduce={reduce} />
            )}
        </div>
        {note}
        <ul data-open={open ? 'true' : 'false'} className="grid w-full grid-cols-3 gap-2 lg:gap-4">
          {stats.map((s, i) => (
            <motion.li
              key={s.label}
              data-testid="academy-stat"
              initial={reduce ? false : { y: 24, scale: 0.8 }}
              animate={{ y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18, delay: reduce ? 0 : 0.15 + i * 0.1 }}
              className={cn(
                'relative flex flex-col items-center rounded-neo border-[3px] border-neo-yellow bg-neo-navy-elevated px-1 text-center shadow-hard lg:py-5',
                open ? 'min-h-[10rem] justify-center pb-3 pt-6 lg:min-h-0' : 'py-2',
                i === 0 && 'border-neo-lime',
              )}
              style={open ? { boxShadow: `4px 4px 0 #000, 0 0 26px ${i === 0 ? 'rgba(191,255,0,0.35)' : 'rgba(255,225,53,0.3)'}` } : undefined}
            >
              {/* Trophy medallion riding the tile's top edge once the payout is the hero. */}
              <span
                className={cn(
                  'grid place-items-center text-black [&>svg]:h-5 [&>svg]:w-5 lg:[&>svg]:h-9 lg:[&>svg]:w-9',
                  open ? 'absolute -top-5 h-10 w-10 rounded-full border-[3px] border-black lg:static lg:h-auto lg:w-auto lg:border-0 lg:!bg-transparent lg:text-neo-yellow' : 'text-neo-yellow',
                )}
                style={open ? { background: i === 0 ? '#bfff00' : '#ffe135', boxShadow: '2px 2px 0 #000' } : undefined}
                aria-hidden
              >
                {s.icon}
              </span>
              <span
                dir="ltr"
                className={cn(
                  'whitespace-nowrap font-neo-display font-black leading-none text-neo-white tabular-nums',
                  !open && (s.value.length > 5 ? 'text-2xl sm:text-3xl lg:text-5xl' : 'text-3xl sm:text-4xl lg:text-6xl'),
                  open && 'lg:text-6xl',
                )}
                style={open ? { textShadow: '3px 3px 0 #000', fontSize: trophySize } : undefined}
              >
                {s.value}
                {s.suffix && <span className="ms-0.5 align-baseline text-[0.42em] text-neo-cream">{s.suffix}</span>}
              </span>
              <span className="mt-1 line-clamp-1 font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-cream sm:text-xs lg:text-lg">{s.label}</span>
            </motion.li>
          ))}
        </ul>
        <div className="mt-1 flex w-full gap-2 lg:mt-2 lg:gap-4">{actions}</div>
      </div>
    </div>
  );
}
