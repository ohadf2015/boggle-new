'use client';

import React, { useRef } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { DISC, letterPoint } from '@/lib/wordWheel/discGeometry';
import { HoldRing } from '../WordWheelParts';

export interface WheelDiscLetterProps {
  letter: string;
  index: number;
  /** Outer letters on the ring, to place this one. */
  outerCount?: number;
  isUsed: boolean;
  /** A finger is down on it but it has not joined the word yet. */
  isPressed?: boolean;
  onPress: (letter: string, index: number, el: HTMLButtonElement) => void;
  onHoldStart?: (letter: string, index: number, el: HTMLButtonElement) => void;
  onHoldEnd?: () => void;
  showHoldRing?: boolean;
  /** Position in a just-accepted word: the letter flashes lime in place, staggered by order. */
  cheerOrder?: number | null;
  tileSkin?: string | null;
  reducedMotion?: boolean;
}

const POP = { type: 'spring' as const, stiffness: 520, damping: 17 };

/** One letter on the disc: a cream keycap on the ring, or the inked hub with its lime ring. */
const WheelDiscLetter: React.FC<WheelDiscLetterProps> = ({
  letter, index, outerCount = 6, isUsed, isPressed = false, onPress, onHoldStart, onHoldEnd, showHoldRing = false,
  cheerOrder = null, tileSkin, reducedMotion = false,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();
  const isHub = index === -1;
  const size = isHub ? DISC.center : DISC.outer;
  const skin = !isHub && !isUsed && tileSkin ? tileSkin.replace('tile-', '') : null;
  const at = letterPoint(index, outerCount);
  const lit = isUsed || isPressed;

  return (
    <m.button
      ref={btnRef}
      type="button"
      translate="no"
      className={cn(
        'wheel-letter-skinnable notranslate absolute pointer-events-auto flex items-center justify-center rounded-full',
        'border-[3px] border-neo-black font-neo-display font-black uppercase leading-none select-none touch-manipulation cursor-pointer',
        isHub ? 'text-[13cqw]' : 'text-[10cqw]',
        lit
          ? 'bg-neo-lime text-neo-black shadow-[inset_0_-4px_0_rgba(0,0,0,0.18),4px_5px_0_#000,0_0_0_5px_rgba(191,255,0,0.3)]'
          : isHub
            ? 'bg-[#0b1530] text-neo-lime shadow-[inset_0_0_0_0.9cqw_#bfff00,4px_5px_0_#000,0_0_0_6px_rgba(191,255,0,0.16)]'
            : 'bg-neo-cream text-neo-black shadow-[inset_0_-4px_0_rgba(0,0,0,0.14),3px_4px_0_#000] hover:bg-neo-white',
      )}
      style={{
        width: `${size}%`,
        height: `${size}%`,
        left: `${at.x - size / 2}%`,
        top: `${at.y - size / 2}%`,
        zIndex: isHub ? 3 : 2,
        ...(cheerOrder !== null && { '--ww-order': String(cheerOrder) }),
      } as React.CSSProperties}
      initial={false}
      animate={{ scale: lit ? 1.12 : 1 }}
      transition={POP}
      whileTap={isUsed ? { scale: 0.92 } : undefined}
      whileHover={!lit && !reducedMotion ? { scale: 1.06 } : undefined}
      onClick={() => { if (btnRef.current) onPress(letter, index, btnRef.current); }}
      onPointerDown={() => { if (onHoldStart && btnRef.current) onHoldStart(letter, index, btnRef.current); }}
      onPointerUp={() => onHoldEnd?.()}
      onPointerCancel={() => onHoldEnd?.()}
      onPointerLeave={() => onHoldEnd?.()}
      aria-label={isUsed ? `${letter}. ${t('wordWheel.tapToRemove')}` : letter}
      aria-pressed={isUsed}
      draggable={false}
      data-wheel-letter={letter}
      data-wheel-index={index}
      data-wheel-used={isUsed ? 'true' : 'false'}
      data-wheel-pressed={isPressed && !isUsed ? 'true' : 'false'}
      {...(cheerOrder !== null && { 'data-wheel-celebrate': 'true' })}
      {...(skin && { 'data-tile-skin': skin })}
    >
      {isHub && !lit && !reducedMotion && (
        <m.span
          aria-hidden
          className="absolute -inset-[14%] rounded-full border-[0.7cqw] border-neo-lime/70 pointer-events-none"
          animate={{ scale: [1, 1.16, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {lit && !reducedMotion && (
        <m.span
          aria-hidden
          className="absolute -inset-[3px] rounded-full border-[0.8cqw] border-neo-lime pointer-events-none"
          initial={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 1.75, opacity: 0 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        />
      )}
      {showHoldRing && <HoldRing />}
      <span className="relative">{letter}</span>
    </m.button>
  );
};

export default WheelDiscLetter;
