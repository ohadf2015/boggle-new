'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDisableFireRoundLights, useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { MOTION } from '@/components/motion/tokens';
import { cn } from '@/lib/utils';

/** Every in-game HUD row marks where the fire chip goes; the chip never floats over the board. */
export const HUD_FIRE_SLOT = 'data-hud-fire-slot';

interface FireRoundIndicatorProps {
  isActive: boolean;
  remainingSeconds: number;
}

export const FireRoundIndicator: React.FC<FireRoundIndicatorProps> = ({ isActive, remainingSeconds }) => {
  const { t } = useLanguage();
  const noLights = useDisableFireRoundLights();
  const reduceMotion = useShouldReduceMotion();
  const still = noLights || reduceMotion;
  const [slot, setSlot] = useState<Element | null>(null);

  useEffect(() => {
    if (!isActive) { setSlot(null); return; }
    const slots = [...document.querySelectorAll(`[${HUD_FIRE_SLOT}]`)];
    setSlot(slots.find((el) => el.getClientRects().length > 0) ?? slots[0] ?? null);
  }, [isActive]);

  if (!isActive || !slot) return null;

  const urgent = remainingSeconds > 0 && remainingSeconds <= 5;
  return createPortal(
    <m.span
      role="status"
      aria-live="polite"
      aria-label={`${t('earthquake.fireRound')} - ${remainingSeconds}s`}
      data-testid="fire-round-chip"
      initial={still ? false : { scale: 0.6 }}
      animate={{ scale: 1 }}
      transition={MOTION.pop}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-orange ps-1.5 pe-1 font-neo-display text-xs font-bold uppercase leading-none text-neo-black shadow-[0_3px_0_rgb(var(--neo-black))]',
        urgent && !still && 'animate-pulse',
      )}
    >
      <Flame aria-hidden className="h-4 w-4 fill-neo-yellow" strokeWidth={2.5} />
      <span className="hidden sm:inline">{t('earthquake.fireChip')}</span>
      <span className="sr-only">{t('earthquake.effect')}</span>
      <span dir="ltr" className="rounded-full bg-neo-black px-1.5 py-0.5 normal-case tabular-nums text-neo-yellow">{remainingSeconds}s</span>
    </m.span>,
    slot,
  );
};
