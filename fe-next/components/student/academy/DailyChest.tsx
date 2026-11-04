'use client';

/**
 * Daily chest — a reason to come back tomorrow. Tap → the chest rattles, bursts
 * open under a light fan with a coin fountain and confetti, and +XP counts up.
 *
 * The reveal is laid out, hidden, while the student looks at the hub, so the
 * tap only flips its phase: no portal, burst or reward card mounts on the
 * frames a celebration has to stay smooth on.
 */

import Image from 'next/image';
import { startTransition, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCountUp } from '@/hooks/useCountUp';
import { ChestBurst } from '@/components/education/motion/ChestBurst';
import { ITEM } from '@/components/wordTowerV2/estate/estateArt';
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

const RATTLE_MS = Math.round(KEY_MOMENTS.chest.transition.duration * 1000);
/** Fallback when the browser has no idle callback (Safari): after the hub's entrance. */
const ARM_FALLBACK_MS = 1200;
const OPEN_BURST = {
  animate: { scale: [0.9, 1.25, 1.1], y: [0, -18, 0] },
  transition: { duration: 0.4, ease: EDU_EASE.outQuint },
};

/** Its own component so the count-up's per-frame updates re-render one number, not the reveal. */
function ChestXp({ counting, reducedMotion }: { counting: boolean; reducedMotion: boolean }) {
  const shown = useCountUp({ target: counting ? DAILY_CHEST_XP : 0, duration: 900, startDelay: 250, immediate: reducedMotion });
  return <span dir="ltr">{`+${shown}`}</span>;
}

function useArmWhenIdle(enabled: boolean): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!enabled || armed) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setArmed(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(() => setArmed(true), ARM_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [enabled, armed]);
  return armed;
}

export function DailyChest({ userId, reducedMotion, onGranted, size = 'sm', onRevealChange }: Props) {
  const { t, dir } = useLanguage();
  const sfx = useSoundEffects();
  const [available, setAvailable] = useState(() => canOpenChest(userId, new Date()));
  const [phase, setPhase] = useState<Phase>('idle');
  const [claimFailed, setClaimFailed] = useState(false);
  const armed = useArmWhenIdle(available);

  const opening = useRef(false);
  // The hub re-renders on new XP; that waits until the reveal is collected, off the celebration's frames.
  const pendingXp = useRef<{ total: number | null } | null>(null);
  const shownRef = useRef(false);
  const grant = (total: number | null) => {
    if (shownRef.current) pendingXp.current = { total };
    else onGranted(total);
  };
  const open = () => {
    if (!available || phase !== 'idle' || opening.current) return;
    opening.current = true;
    shownRef.current = true;
    // Marker at open-time: a reload mid-reveal must not re-open it.
    markChestOpened(userId, new Date());
    // A transition: the reveal renders in slices instead of inside the tap's frame.
    startTransition(() => {
      setAvailable(false);
      setPhase(reducedMotion ? 'open' : 'rattle');
    });
    void claimDailyChestXp().then((res) => {
      if (res.ok) grant(res.newTotalXp ?? null);
      else {
        clearChestOpened(userId);
        opening.current = false;
        setAvailable(true);
        setClaimFailed(true);
      }
    });
  };

  const covering = phase !== 'idle';
  useEffect(() => {
    onRevealChange?.(covering);
    if (!covering) shownRef.current = false;
    if (!covering && pendingXp.current) {
      onGranted(pendingXp.current.total);
      pendingXp.current = null;
    }
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
  const isOpen = phase === 'open';
  // Under the reveal the badge keeps its look; it turns "opened" when the reveal goes, off the celebration's frames.
  const fresh = available || covering;
  const wiggle = available && !covering && !reducedMotion;
  const mounted = armed || covering;

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
        // Its own layer: the wiggle and the tap squash then never repaint the HUD and cards around it.
        className={cn('icon-only relative flex flex-col items-center will-change-transform', size === 'md' ? 'h-[72px] w-[72px]' : 'h-12 w-12', !available && 'cursor-default')}
        // Idle wiggle: a small, rare shake — it asks, it does not shout.
        animate={wiggle ? { rotate: [0, -6, 6, -3, 0] } : undefined}
        transition={wiggle ? { duration: 0.8, repeat: Infinity, repeatDelay: 3.2 } : undefined}
        whileTap={available ? { scale: 0.9 } : undefined}
      >
        <Image
          src="/images/education/chest-books.webp"
          alt=""
          aria-hidden="true"
          fill
          unoptimized
          sizes="96px"
          className={cn('object-contain drop-shadow-[3px_3px_0_#000]', !fresh && 'opacity-60 grayscale')}
        />
        <span
          dir="auto"
          className={cn(
            'absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 font-neo-display text-xs font-black uppercase leading-[14px]',
            size === 'md' ? 'px-1.5 tracking-wider' : 'px-1 tracking-normal',
            fresh ? 'border-neo-black bg-neo-yellow text-neo-black' : 'border-neo-cream bg-neo-navy text-neo-white/80',
          )}
          style={fresh ? toneStyle('gold', { shadow: 2, trim: 1 }) : undefined}
        >
          {fresh ? t('academy.student.chestTag', 'Free') : t('academy.student.chestDone', 'Opened')}
        </span>
      </m.button>

      {mounted && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal={covering ? 'true' : undefined}
          aria-hidden={covering ? undefined : 'true'}
          aria-label={t('academy.student.chestTitle', 'Daily chest')}
          data-testid="academy-chest-reveal"
          data-phase={phase}
          dir={dir}
          className={cn(
            // Opaque, so the compositor can skip everything under it.
            'fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-neo-navy px-6',
            !covering && 'invisible pointer-events-none',
          )}
        >
          <ChestBurst playing={isOpen} coinSrc={ITEM.coin} reduced={reducedMotion} />
          <m.div
            data-testid="academy-chest-art"
            className="relative h-48 w-48 sm:h-64 sm:w-64"
            animate={reducedMotion ? { scale: 1.1, y: 0 } : phase === 'rattle' ? KEY_MOMENTS.chest.animate : isOpen ? OPEN_BURST.animate : { scale: 1, y: 0 }}
            // Keyframes run as a tween: framer springs only take 2 keyframes.
            transition={reducedMotion || !covering ? { duration: 0 } : phase === 'rattle' ? KEY_MOMENTS.chest.transition : OPEN_BURST.transition}
          >
            <Image src="/images/education/chest-books.webp" alt="" aria-hidden="true" fill unoptimized sizes="256px" className="object-contain drop-shadow-[6px_6px_0_#000]" />
          </m.div>

          {/* Laid out with the reveal, so opening never moves the chest. */}
          <m.div
            data-testid="academy-chest-reward"
            aria-hidden={!isOpen}
            className={cn('relative z-10 mt-6 flex flex-col items-center gap-4 text-center', !isOpen && 'invisible')}
            initial={false}
            animate={isOpen || reducedMotion ? { y: 0, scale: 1 } : { y: 24, scale: 0.8 }}
            transition={isOpen && !reducedMotion ? { type: 'spring', stiffness: 300, damping: 18, delay: 0.15 } : { duration: 0 }}
          >
            <div className={cn('w-40', claimFailed && 'line-through opacity-60')}>
              <RewardChipRow
                label={t('academy.student.chestTitle', 'Daily chest')}
                reduced={reducedMotion}
                chips={[{ id: 'xp', icon: <XpIcon />, value: <ChestXp counting={isOpen} reducedMotion={reducedMotion} />, label: t('economy.chest.chip.xp') }]}
              />
            </div>
            <p className="font-neo-display text-lg font-black uppercase text-neo-white">
              {claimFailed
                ? t('academy.student.chestFailed', "Couldn't save your XP — tap the chest to try again")
                : t('academy.student.chestComeBack', 'Come back tomorrow for another chest')}
            </p>
            <button
              type="button"
              tabIndex={isOpen ? undefined : -1}
              onClick={() => setPhase('idle')}
              className="min-h-[48px] rounded-neo border-3 border-neo-black bg-neo-yellow px-8 font-neo-display text-lg font-black uppercase text-neo-black shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
            >
              {t('academy.student.chestCollect', 'Collect')}
            </button>
          </m.div>
        </div>,
        // Portaled: inside the map's z-20 chip layer the reveal would sit UNDER
        // the dock and CTA (a later z-20 sibling) and they would stay tappable.
        document.body,
      )}
    </>
  );
}
