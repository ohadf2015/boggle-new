'use client';

/**
 * Loot chest: wobbles shut until tapped, then bursts open with a light spill
 * and hands its rewards out. `onOpened` fires once, on the tap.
 */
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { CHEST_CLOSED_ART, CHEST_OPEN_ART } from './art';
import type { LevelLoot } from './runSummary';
import RewardChips from './RewardChips';

interface Props {
  loot: LevelLoot;
  onOpened?: () => void;
}

export default function ChestOpen({ loot, onOpened }: Props) {
  const { t } = useLanguageSafe();
  const { playChestOpenSound } = useSoundEffects();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  const openIt = () => {
    if (open) return;
    setOpen(true);
    playChestOpenSound?.();
    onOpened?.();
  };

  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={openIt} disabled={open} data-testid="loot-chest"
        aria-label={open ? t('adventurePlay.loot.chestTitle') : t('adventurePlay.loot.tapToOpen')}
        className="relative grid h-40 w-40 place-items-center disabled:cursor-default">
        {open && (
          <>
            {/* light spill: rotating rays + glow */}
            <motion.span aria-hidden className="absolute inset-[-40%] rounded-full"
              style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,230,120,0.55) 0deg 10deg, transparent 10deg 30deg)', maskImage: 'radial-gradient(circle, #000 20%, transparent 68%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 68%)' }}
              initial={{ opacity: 0, scale: 0.4, rotate: 0 }}
              animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, rotate: 360 }}
              transition={reduce ? { duration: 0 } : { opacity: { duration: 0.3 }, scale: { duration: 0.4 }, rotate: { duration: 14, repeat: Infinity, ease: 'linear' } }} />
            <motion.span aria-hidden className="absolute inset-4 rounded-full bg-[radial-gradient(circle,rgba(255,244,180,0.95)_0%,rgba(255,214,0,0.35)_45%,transparent_70%)]"
              initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} />
          </>
        )}
        <motion.img
          key={open ? 'open' : 'closed'}
          src={open ? CHEST_OPEN_ART : CHEST_CLOSED_ART}
          alt=""
          draggable={false}
          className="relative h-36 w-36 object-contain drop-shadow-[4px_4px_0_#000]"
          initial={open && !reduce ? { scale: 0.7, y: 10 } : false}
          animate={open || reduce ? { scale: 1, y: 0 } : { rotate: [0, -6, 6, -4, 4, 0], y: [0, -4, 0] }}
          transition={open ? { type: 'spring', stiffness: 500, damping: 14 } : { duration: 0.9, repeat: Infinity, repeatDelay: 0.8 }}
        />
        {!open && (
          <span className="absolute -bottom-1 rounded-full border-[3px] border-black bg-neo-lime px-3 py-0.5 font-neo-display text-sm font-bold text-black shadow-[3px_3px_0_#000] motion-safe:animate-bounce">
            {t('adventurePlay.loot.tapToOpen')}
          </span>
        )}
      </button>
      {open && <div className="mt-3 min-h-10"><RewardChips loot={loot} delay={0.2} /></div>}
    </div>
  );
}
