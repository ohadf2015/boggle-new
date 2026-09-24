'use client';

/**
 * Word Workshop intro — a head-to-head VS splash: the student on one side,
 * Baron Buildaword on the other, a lightning seam and a VS badge between
 * them, the stakes (the lesson words are gold) and one glowing BATTLE button.
 * Warm gold/pink palette — deliberately nothing like the Review vault intro.
 */

import { useId, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Coins, Swords } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { claimIntroEntrance } from '@/lib/education/introEntrance';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import type { Taunt } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';
import type { AcademyPlayer } from './AcademyChrome';
import { WorkshopRival } from './WorkshopRival';

const INTRO_TAUNT: Taunt = { key: 'academy.modes.workshop.rival.intro', en: 'Think you can out-build me?' };

function useReduce(): boolean {
  const prefers = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  return Boolean(prefers) || reducedEffects;
}

/** The student's portrait: a big medallion. The initial sits underneath so the frame is never empty while the avatar loads. */
function PlayerMedallion({ player, fallbackName }: { player?: AcademyPlayer; fallbackName: string }) {
  const name = player?.name ?? fallbackName;
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid place-items-center overflow-hidden rounded-full border-[5px] border-neo-cyan bg-neo-navy-elevated"
        style={{ width: 'min(42vw, 23vh, 22rem)', height: 'min(42vw, 23vh, 22rem)', boxShadow: '6px 6px 0 #000, 0 0 36px rgba(0,255,255,0.55)' }}
      >
        <span aria-hidden className="absolute font-neo-display text-6xl font-black uppercase text-neo-cyan/50 lg:text-9xl">
          {name.slice(0, 1)}
        </span>
        <span className="relative lg:scale-[1.9]">
          <Avatar customAvatar={player?.avatarConfig ?? null} userId={player?.userId ?? name} pixelSize={150} disableEffects />
        </span>
      </div>
      <span
        data-testid="academy-player"
        className="z-10 -mt-4 max-w-[40vw] truncate rounded-neo border-[3px] border-black bg-neo-cyan px-3 py-0.5 font-neo-display text-base font-black uppercase text-black shadow-hard lg:max-w-none lg:text-2xl"
      >
        {name}
      </span>
    </div>
  );
}

export function WorkshopVsIntro({
  lessonName,
  chips,
  player,
  starting,
  startFailed,
  onPlay,
  loading = false,
}: {
  lessonName: string;
  chips: string[];
  player?: AcademyPlayer;
  starting: boolean;
  startFailed: boolean;
  onPlay: () => void;
  /** The route is still fetching the lesson: the same arena, a disabled "Loading…" button (never a blank loader). */
  loading?: boolean;
}) {
  const { t } = useLanguage();
  const reduce = useReduce();
  // Loader → loaded intro is a remount: play the entrance once, never a half-built replay.
  const mountId = useId();
  const [entrance] = useState(() => claimIntroEntrance('workshop', Date.now(), mountId));
  const still = reduce || !entrance;
  const spring = (delay: number) => ({ type: 'spring' as const, stiffness: 260, damping: 17, delay: reduce ? 0 : delay });

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center gap-2 lg:grid lg:max-w-[110rem] lg:grid-cols-2 lg:items-center lg:gap-12">
      {/* The arena: student top-start, Baron bottom-end, split by a lightning seam. */}
      <div data-testid="workshop-hero" className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[22px] border-[3px] border-neo-yellow lg:h-[80vh] lg:flex-none" style={{ boxShadow: '6px 6px 0 #000' }}>
        {/* Backdrop mirrors in RTL so the student's (start) corner always gets the deep half. */}
        <div aria-hidden className="absolute inset-0 rtl:-scale-x-100">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #0b5a6e 0%, #103a5c 45%, #3a1040 55%, #6b1238 100%)' }} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 60%)', background: 'radial-gradient(circle at 25% 25%, rgba(0,255,255,0.45), transparent 65%)' }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ clipPath: 'polygon(0 60%, 100% 40%, 100% 100%, 0 100%)', background: 'radial-gradient(circle at 75% 78%, rgba(255,20,147,0.5), rgba(255,140,0,0.18) 45%, transparent 75%)' }}
        />
        {/* Speed-burst behind each fighter. */}
        <div
          aria-hidden
          className="absolute -start-[20%] -top-[20%] h-[80%] w-[90%]"
          style={{ background: 'repeating-conic-gradient(from 0deg, rgba(0,255,255,0.22) 0 7deg, transparent 7deg 18deg)', maskImage: 'radial-gradient(circle, #000 20%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 68%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-[20%] -end-[20%] h-[80%] w-[90%]"
          style={{ background: 'repeating-conic-gradient(from 5deg, rgba(255,20,147,0.26) 0 7deg, transparent 7deg 18deg)', maskImage: 'radial-gradient(circle, #000 20%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 68%)' }}
        />
        <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polyline points="-2,61 22,55 30,60 50,50 70,44 78,48 102,39" fill="none" stroke="#000" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 12 }} />
          <polyline points="-2,61 22,55 30,60 50,50 70,44 78,48 102,39" fill="none" stroke="#ffe135" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 6 }} />
        </svg>
        </div>

        <motion.div
          className="absolute start-[5%] top-[5%] lg:start-[8%] lg:top-[7%]"
          initial={still ? false : { x: -120, rotate: -10 }}
          animate={{ x: 0, rotate: 0 }}
          transition={spring(0.05)}
        >
          <PlayerMedallion player={player} fallbackName={t('academy.modes.workshop.you', 'You')} />
        </motion.div>

        <motion.div
          className="absolute bottom-[2%] end-[1%] origin-bottom-right rtl:origin-bottom-left max-lg:scale-[1.12] lg:bottom-[4%] lg:end-[6%] lg:scale-[1.15]"
          initial={still ? false : { x: 140 }}
          animate={{ x: 0 }}
          transition={spring(0.2)}
        >
          <WorkshopRival mood="idle" taunt={null} size="hero" />
        </motion.div>

        {/* The Baron's taunt, pointing at him across the pink half. */}
        <motion.p
          data-testid="workshop-rival-taunt"
          className="absolute bottom-[24%] start-[5%] max-w-[46%] rounded-2xl border-[3px] border-black bg-neo-cream px-3 py-2 font-neo-display text-base font-black leading-tight text-black lg:bottom-[30%] lg:start-[8%] lg:max-w-[40%] lg:px-5 lg:text-3xl"
          style={{ boxShadow: '4px 4px 0 #000' }}
          initial={still ? false : { scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: -3 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22, delay: reduce ? 0 : 0.3 }}
        >
          {t(INTRO_TAUNT.key, INTRO_TAUNT.en)}
          <span aria-hidden className="absolute -end-3 bottom-3 h-5 w-5 rotate-45 border-e-[3px] border-t-[3px] border-black bg-neo-cream" />
        </motion.p>

        {/* VS badge on the seam */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center"
          initial={still ? false : { scale: 1.8, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 22, delay: reduce ? 0 : 0.2 }}
        >
          <span
            className="grid h-24 w-24 place-items-center bg-neo-pink lg:h-44 lg:w-44"
            style={{
              clipPath: 'polygon(50% 0, 61% 30%, 95% 20%, 72% 48%, 100% 72%, 64% 70%, 55% 100%, 42% 72%, 6% 86%, 28% 55%, 0 30%, 36% 32%)',
              filter: 'drop-shadow(0 0 18px rgba(255,20,147,0.9))',
            }}
          />
          <span
            className="absolute font-neo-display text-5xl font-black italic text-neo-yellow lg:text-8xl"
            style={{ WebkitTextStroke: '3px #000', textShadow: '4px 4px 0 #000' }}
          >
            {t('academy.modes.workshop.vs', 'VS')}
          </span>
        </motion.div>
      </div>

      {/* Stakes + the one hero button. */}
      <motion.div
        initial={still ? false : { y: 30 }}
        animate={{ y: 0 }}
        transition={spring(0.15)}
        className="flex w-full max-w-md shrink-0 flex-col items-center text-center sm:max-w-xl lg:max-w-none lg:items-start lg:text-start"
      >
        <p className="min-h-4 font-neo-display text-xs font-black uppercase tracking-widest text-neo-yellow lg:min-h-8 lg:text-2xl">{lessonName}</p>
        <h2 className="mb-2 font-neo-display text-3xl font-black uppercase leading-none text-neo-white sm:text-5xl lg:mb-5 lg:text-8xl" style={{ textShadow: '3px 3px 0 #000' }}>
          {t('academy.modes.workshop.introTitleBaron', 'Out-build the Baron')}
        </h2>
        {chips.length > 0 && (
          <div className="mb-3 flex w-full flex-col items-center gap-1.5 lg:mb-8 lg:items-start lg:gap-3">
            <span className="flex shrink-0 items-center gap-1 rounded-full border-[3px] border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-black shadow-hard lg:px-4 lg:py-1 lg:text-xl">
              <Coins className="h-4 w-4 lg:h-6 lg:w-6" aria-hidden />
              {t('academy.modes.workshop.stakes', 'Lesson words = gold')}
            </span>
            <ul className="flex max-h-[4.1rem] w-full flex-wrap justify-center gap-1.5 overflow-hidden lg:max-h-28 lg:justify-start lg:gap-3" translate="no">
              {chips.slice(0, 12).map((w) => (
                <li
                  key={w}
                  data-testid="workshop-lesson-word"
                  className="flex items-center gap-1 rounded-md border-[3px] border-black py-0.5 pe-2 ps-1 font-neo-display text-sm font-black text-black lg:gap-2 lg:pe-3 lg:ps-2 lg:text-2xl"
                  style={{ background: 'linear-gradient(180deg, #fff6c4 0%, #ffd23a 60%, #d9a400 100%)', boxShadow: 'inset 0 2px 0 #fff, inset 0 -3px 0 #a87b00, 2px 3px 0 #000' }}
                >
                  {/* Each word is literally a gold coin: the stakes read on the pill itself, not only in the label. */}
                  <Coins aria-hidden className="h-4 w-4 shrink-0 lg:h-6 lg:w-6" strokeWidth={2.75} />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
        {startFailed && (
          <p className="mb-2 font-neo-body text-sm text-neo-pink lg:text-xl">{t('academy.modes.startFailed', "Couldn't start. Check your connection and try again.")}</p>
        )}
        <motion.button
          type="button"
          data-testid={loading ? 'workshop-play-pending' : 'workshop-play'}
          disabled={starting || loading}
          onClick={onPlay}
          whileTap={{ scale: 0.95 }}
          animate={
            reduce || starting || loading
              ? undefined
              : {
                  boxShadow: [
                    '6px 6px 0 #000, 0 0 18px rgba(255,20,147,0.45)',
                    '6px 6px 0 #000, 0 0 46px rgba(255,20,147,0.95)',
                    '6px 6px 0 #000, 0 0 18px rgba(255,20,147,0.45)',
                  ],
                }
          }
          transition={reduce ? undefined : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'relative flex min-h-[4.25rem] w-full items-center justify-center gap-3 overflow-hidden rounded-neo border-[3px] border-black px-4',
            'font-neo-display text-3xl font-black uppercase tracking-wide text-black disabled:opacity-60 lg:min-h-28 lg:max-w-xl lg:text-5xl',
          )}
          style={{
            background: 'linear-gradient(180deg, #fff27a 0%, #ffc21a 45%, #ff8a00 100%)',
            boxShadow: '6px 6px 0 #000, 0 0 30px rgba(255,20,147,0.7)',
          }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1 h-2 rounded-full bg-white/60" />
          <Swords className="relative h-8 w-8 lg:h-12 lg:w-12" aria-hidden />
          <span className="relative">{loading ? t('common.loading', 'Loading…') : t('academy.modes.workshop.battle', 'Battle!')}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
