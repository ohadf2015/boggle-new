'use client';

/**
 * Daily chest — a reason to come back tomorrow. Tap → the chest rattles, bursts
 * open under god-rays with a coin fountain and confetti, and +XP counts up
 * (WT2 ChestReveal language, reusing its GodRays/CoinFountain).
 */

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCountUp } from '@/hooks/useCountUp';
import { GodRays } from '@/components/wordTowerV2/rewards/GodRays';
import { NEO_HEX } from '@/components/education/economy/neoHex';
import { CoinFountain } from '@/components/wordTowerV2/rewards/CoinFountain';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';
import { cn } from '@/lib/utils';
import RewardChipRow, { XpIcon } from '@/components/education/rewards/RewardChipRow';
import { EDU_EASE } from '@/lib/education/motion/tokens';
import { KEY_MOMENTS } from '@/lib/education/motion/keyMoments';
import { toneStyle } from './chrome';
import { canOpenChest, markChestOpened, clearChestOpened, claimDailyChestXp, DAILY_CHEST_XP } from './dailyChestStore';

interface Props {
  userId: string;
  reducedMotion: boolean;
  /** New lifetime XP from the server, when it says so. */
  onGranted: (newTotalXp: number | null) => void;
  /** Badge size: small on a phone (a badge, not a billboard), a touch larger on desktop. */
  size?: 'sm' | 'md';
  /** The full-screen reveal is up (true) or gone (false). */
  onRevealChange?: (covering: boolean) => void;
}

type Phase = 'idle' | 'rattle' | 'open';

const LAYER_GAP_MS = 32;
const RATTLE_MS = Math.round(KEY_MOMENTS.chest.transition.duration * 1000);
const OPEN_BURST = {
  animate: { scale: [0.9, 1.25, 1.1], y: [0, -18, 0] },
  transition: { duration: 0.4, ease: EDU_EASE.outQuint },
};

export function DailyChest({ userId, reducedMotion, onGranted, size = 'sm', onRevealChange }: Props) {
  const { t, dir } = useLanguage();
  const sfx = useSoundEffects();
  const [available, setAvailable] = useState(() => canOpenChest(userId, new Date()));
  const [phase, setPhase] = useState<Phase>('idle');
  const [claimFailed, setClaimFailed] = useState(false);
  const shownXp = useCountUp({ target: phase === 'open' ? DAILY_CHEST_XP : 0, duration: 900, startDelay: 250, immediate: reducedMotion });

  const open = () => {
    if (!available || phase !== 'idle') return;
    // Marker at open-time: a reload mid-reveal must not re-open it.
    markChestOpened(userId, new Date());
    setAvailable(false);
    setPhase(reducedMotion ? 'open' : 'rattle');
    void claimDailyChestXp().then((res) => {
      if (res.ok) onGranted(res.newTotalXp ?? null);
      else {
        clearChestOpened(userId);
        setAvailable(true);
        setClaimFailed(true);
      }
    });
  };

  // One layer per couple of frames: mounting rays, coins and confetti in the same task as the burst cost a 4x-throttled frame 60-80ms.
  const [layers, setLayers] = useState(0);
  useEffect(() => {
    if (phase !== 'open') { setLayers(0); return; }
    const timers = [1, 2].map((n) => setTimeout(() => setLayers(n), n * LAYER_GAP_MS));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const covering = phase !== 'idle';
  useEffect(() => {
    onRevealChange?.(covering);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [covering]);

  useEffect(() => {
    if (phase !== 'rattle') return;
    const timer = setTimeout(() => setPhase('open'), RATTLE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'open') return;
    sfx.playChestOpenSound?.();
    const timer = setTimeout(() => sfx.playCoinCascadeSound?.(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const label = available
    ? t('academy.student.chestReady', 'Daily chest — tap to open')
    : t('academy.student.chestTomorrow', 'Next chest tomorrow');

  return (
    <>
      <m.button
        type="button"
        data-testid="academy-daily-chest"
        data-available={available}
        onClick={open}
        aria-label={label}
        title={label}
        disabled={!available}
        className={cn('icon-only relative flex flex-col items-center', size === 'md' ? 'h-[72px] w-[72px]' : 'h-12 w-12', !available && 'cursor-default')}
        // Idle wiggle: a small, rare shake — it asks, it does not shout.
        animate={available && !reducedMotion ? { rotate: [0, -6, 6, -3, 0] } : undefined}
        transition={available && !reducedMotion ? { duration: 0.8, repeat: Infinity, repeatDelay: 3.2 } : undefined}
        whileTap={available ? { scale: 0.9 } : undefined}
      >
        <Image
          src="/images/education/chest-books.webp"
          alt=""
          aria-hidden="true"
          fill
          unoptimized
          sizes="96px"
          className={cn('object-contain drop-shadow-[3px_3px_0_#000]', !available && 'opacity-60 grayscale')}
        />
        <span
          dir="auto"
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 px-1.5 font-neo-display text-xs font-black uppercase leading-[14px] tracking-wider',
            available ? 'border-neo-black bg-neo-yellow text-neo-black' : 'border-neo-cream bg-neo-navy text-neo-white/80',
          )}
          style={available ? toneStyle('gold', { shadow: 2, trim: 1 }) : undefined}
        >
          {available ? t('academy.student.chestTag', 'Free') : t('academy.student.chestDone', 'Opened')}
        </span>
      </m.button>

      {phase !== 'idle' && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('academy.student.chestTitle', 'Daily chest')}
            data-testid="academy-chest-reveal"
            dir={dir}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-neo-navy/95 px-6"
          >
            {phase === 'open' && layers >= 1 && <GodRays rays={12} hex={NEO_HEX.yellow} strength={0.75} reducedMotion={reducedMotion} />}
            {phase === 'open' && layers >= 2 && <CoinFountain count={14} spread={1} reducedMotion={reducedMotion} />}
            <BoundedConfettiBurst trigger={phase === 'open' && layers >= 2 && !reducedMotion} size="lg">
              <m.div
                data-testid="academy-chest-art"
                className="relative h-48 w-48 sm:h-64 sm:w-64"
                animate={reducedMotion ? { scale: 1.1, y: 0 } : phase === 'rattle' ? KEY_MOMENTS.chest.animate : OPEN_BURST.animate}
                // Keyframes run as a tween: framer springs only take 2 keyframes.
                transition={reducedMotion ? { duration: 0 } : phase === 'rattle' ? KEY_MOMENTS.chest.transition : OPEN_BURST.transition}
              >
                <Image src="/images/education/chest-books.webp" alt="" aria-hidden="true" fill unoptimized sizes="256px" className="object-contain drop-shadow-[6px_6px_0_#000]" priority />
              </m.div>
            </BoundedConfettiBurst>

            {phase === 'open' && (
              <m.div
                className="relative z-10 mt-6 flex flex-col items-center gap-4 text-center"
                initial={reducedMotion ? false : { y: 24, scale: 0.8 }}
                animate={{ y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.15 }}
              >
                <div className={cn('w-40', claimFailed && 'line-through opacity-60')}>
                  <RewardChipRow
                    label={t('academy.student.chestTitle', 'Daily chest')}
                    reduced={reducedMotion}
                    chips={[{ id: 'xp', icon: <XpIcon />, value: <span dir="ltr">{`+${shownXp}`}</span>, label: t('economy.chest.chip.xp') }]}
                  />
                </div>
                <p className="font-neo-display text-lg font-black uppercase text-neo-white">
                  {claimFailed
                    ? t('academy.student.chestFailed', "Couldn't save your XP — tap the chest to try again")
                    : t('academy.student.chestComeBack', 'Come back tomorrow for another chest')}
                </p>
                <button
                  type="button"
                  onClick={() => setPhase('idle')}
                  className="min-h-[48px] rounded-neo border-3 border-neo-black bg-neo-yellow px-8 font-neo-display text-lg font-black uppercase text-neo-black shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                >
                  {t('academy.student.chestCollect', 'Collect')}
                </button>
              </m.div>
            )}
          </div>
        </AnimatePresence>,
        // Portaled: inside the map's z-20 chip layer the reveal would sit UNDER
        // the dock and CTA (a later z-20 sibling) and they would stay tappable.
        document.body,
      )}
    </>
  );
}
