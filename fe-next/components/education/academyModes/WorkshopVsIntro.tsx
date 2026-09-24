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
import { useIsHydrating } from './useIsHydrating';
import type { Taunt } from '@/lib/education/academyReactions';
import { cn } from '@/lib/utils';
import type { AcademyPlayer } from './AcademyChrome';
import { WorkshopRival } from './WorkshopRival';
import { INTRO_COPY, INTRO_CTA, INTRO_HERO, INTRO_KICKER, INTRO_LAYOUT, INTRO_TITLE } from './introLayout';

const INTRO_TAUNT: Taunt = { key: 'academy.modes.workshop.rival.intro', en: 'Think you can out-build me?' };

function useReduce(): boolean {
  const prefers = useReducedMotion();
  const [reducedEffects] = useReducedEffects();
  return Boolean(prefers) || reducedEffects;
}

/** The student's portrait: a big medallion sized from the arena (cq units). The initial sits underneath so the frame is never empty while the avatar loads. */
function PlayerMedallion({ player, fallbackName }: { player?: AcademyPlayer; fallbackName: string }) {
  const name = player?.name ?? fallbackName;
  return (
    <div className="flex flex-col items-center">
      <div
        className="relative grid h-[min(40cqw,34cqh)] w-[min(40cqw,34cqh)] place-items-center overflow-hidden rounded-full border-[clamp(3px,1cqmin,6px)] border-neo-cyan bg-neo-navy-elevated"
        style={{ boxShadow: '6px 6px 0 #000, 0 0 36px rgba(0,255,255,0.55)' }}
      >
        <span aria-hidden className="absolute font-neo-display text-[min(24cqw,20cqh)] font-black uppercase leading-none text-neo-cyan/50">
          {name.slice(0, 1)}
        </span>
        <Avatar customAvatar={player?.avatarConfig ?? null} userId={player?.userId ?? name} pixelSize={256} disableEffects className="relative !h-full !w-full" />
      </div>
      <span
        data-testid="academy-player"
        className="z-10 -mt-[3cqmin] max-w-[40cqw] truncate rounded-neo border-[3px] border-black bg-neo-cyan px-[1.6cqmin] py-0.5 font-neo-display text-[clamp(0.75rem,4cqmin,1.75rem)] font-black uppercase text-black shadow-hard"
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
  // The server/hydration frame is the finished scene: framer bakes `initial` into SSR HTML, and a slow phone shows it for seconds.
  const hydrating = useIsHydrating();
  const still = reduce || !entrance || hydrating;
  const spring = (delay: number) => ({ type: 'spring' as const, stiffness: 260, damping: 17, delay: reduce ? 0 : delay });

  return (
    <div className={INTRO_LAYOUT}>
      {/* The arena: student top-start, Baron bottom-end, split by a lightning seam. */}
      <div data-testid="workshop-hero" className={cn(INTRO_HERO, 'overflow-hidden rounded-[22px] border-[3px] border-neo-yellow lg:max-h-[80rem]')} style={{ boxShadow: '6px 6px 0 #000' }}>
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
          className="absolute start-[5cqw] top-[5cqh]"
          initial={still ? false : { x: -120, rotate: -10 }}
          animate={{ x: 0, rotate: 0 }}
          transition={spring(0.05)}
        >
          <PlayerMedallion player={player} fallbackName={t('academy.modes.workshop.you', 'You')} />
        </motion.div>

        <motion.div
          className="absolute bottom-[3cqh] end-[3cqw]"
          initial={still ? false : { x: 140 }}
          animate={{ x: 0 }}
          transition={spring(0.2)}
        >
          <WorkshopRival mood="idle" taunt={null} size="arena" />
        </motion.div>

        {/* The Baron's taunt, pointing at him across the pink half. */}
        <motion.p
          data-testid="workshop-rival-taunt"
          className="absolute bottom-[8cqh] start-[4cqw] max-w-[42cqw] rounded-2xl border-[3px] border-black bg-neo-cream px-[2.4cqmin] py-[1.6cqmin] font-neo-display text-[clamp(0.75rem,4.4cqmin,2.25rem)] font-black leading-tight text-black"
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
            className="grid h-[24cqmin] w-[24cqmin] place-items-center bg-neo-pink"
            style={{
              clipPath: 'polygon(50% 0, 61% 30%, 95% 20%, 72% 48%, 100% 72%, 64% 70%, 55% 100%, 42% 72%, 6% 86%, 28% 55%, 0 30%, 36% 32%)',
              filter: 'drop-shadow(0 0 18px rgba(255,20,147,0.9))',
            }}
          />
          <span
            className="absolute font-neo-display text-[11cqmin] font-black italic leading-none text-neo-yellow"
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
        className={INTRO_COPY}
      >
        <p className={cn(INTRO_KICKER, 'text-neo-yellow')}>{lessonName}</p>
        <h2 className={cn(INTRO_TITLE, 'lg:text-[clamp(2.5rem,min(5vw,8.5vh),8rem)]')} style={{ textShadow: '3px 3px 0 #000' }}>
          {t('academy.modes.workshop.introTitleBaron', 'Out-build the Baron')}
        </h2>
        {chips.length > 0 && (
          <div className="mb-3 flex w-full flex-col items-center gap-1.5 [--chip-fs:0.875rem] [--chip-gap:6px] [@media(orientation:landscape)_and_(max-height:520px)]:mb-2 [@media(orientation:landscape)_and_(max-height:520px)]:items-start [@media(orientation:landscape)_and_(max-height:520px)]:[--chip-fs:0.8rem] lg:mb-[clamp(0.75rem,3vh,2rem)] lg:items-start lg:gap-[clamp(0.4rem,1.2vh,0.75rem)] lg:[--chip-fs:clamp(0.95rem,min(1.6vw,2.6vh),2.4rem)] lg:[--chip-gap:clamp(8px,1.2vh,12px)]">
            <span className="flex shrink-0 items-center gap-1 rounded-full border-[3px] border-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-black shadow-hard lg:px-[0.8em] lg:text-[clamp(0.85rem,min(1.4vw,2.3vh),2rem)]">
              <Coins className="h-[1.25em] w-[1.25em]" aria-hidden />
              {t('academy.modes.workshop.stakes', 'Lesson words = gold')}
            </span>
            {/* Exactly two rows of coins: the box is sized from the pill height, so a third row is hidden whole, never sliced. */}
            <ul className="flex max-h-[calc((var(--chip-fs)*1.25+10px)*2+var(--chip-gap)+4px)] w-full flex-wrap justify-center gap-[var(--chip-gap)] overflow-hidden [@media(orientation:landscape)_and_(max-height:520px)]:justify-start lg:justify-start" translate="no">
              {chips.slice(0, 12).map((w) => (
                <li
                  key={w}
                  data-testid="workshop-lesson-word"
                  className="flex h-[calc(var(--chip-fs)*1.25+10px)] items-center gap-[0.3em] rounded-md border-[3px] border-black pe-[0.55em] ps-[0.3em] font-neo-display text-[length:var(--chip-fs)] font-black leading-[1.25] text-black"
                  style={{ background: 'linear-gradient(180deg, #fff6c4 0%, #ffd23a 60%, #d9a400 100%)', boxShadow: 'inset 0 2px 0 #fff, inset 0 -3px 0 #a87b00, 2px 3px 0 #000' }}
                >
                  {/* Each word is literally a gold coin: the stakes read on the pill itself, not only in the label. */}
                  <Coins aria-hidden className="h-[1.1em] w-[1.1em] shrink-0" strokeWidth={2.75} />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
        {startFailed && (
          <p className="mb-2 font-neo-body text-sm text-neo-pink lg:text-[clamp(1rem,1.4vw,1.25rem)]">{t('academy.modes.startFailed', "Couldn't start. Check your connection and try again.")}</p>
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
            INTRO_CTA,
            'text-3xl [@media(orientation:landscape)_and_(max-height:520px)]:text-2xl! lg:text-[clamp(1.75rem,min(3.4vw,5.5vh),4.5rem)]',
          )}
          style={{
            background: 'linear-gradient(180deg, #fff27a 0%, #ffc21a 45%, #ff8a00 100%)',
            boxShadow: '6px 6px 0 #000, 0 0 30px rgba(255,20,147,0.7)',
          }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-2 top-1 h-2 rounded-full bg-white/60" />
          <Swords className="relative h-[1.1em] w-[1.1em] shrink-0" aria-hidden />
          <span className="relative">{loading ? t('common.loading', 'Loading…') : t('academy.modes.workshop.battle', 'Battle!')}</span>
        </motion.button>
      </motion.div>
    </div>
  );
}
