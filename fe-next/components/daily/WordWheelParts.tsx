'use client';

import React, { useRef } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { HOLD_SUBMIT_MS } from '@/hooks/useHoldToSubmit';

// ==========================================
// Hold-to-submit progress ring
// Functional feedback for a timed gesture, so it animates regardless of
// prefers-reduced-motion (WCAG 2.3.3 "Essential" exception).
// ==========================================

const RING_CIRCUMFERENCE = 2 * Math.PI * 46; // r=46 in the 100x100 viewBox

const HoldRing: React.FC = () => (
  <svg
    className="absolute inset-[-4px] pointer-events-none -rotate-90"
    viewBox="0 0 100 100"
    fill="none"
    aria-hidden
    data-testid="hold-ring"
  >
    <circle cx={50} cy={50} r={46} stroke="rgba(0,0,0,0.45)" strokeWidth={8} />
    <m.circle
      cx={50}
      cy={50}
      r={46}
      stroke="#BFFF00"
      strokeWidth={6}
      strokeLinecap="round"
      strokeDasharray={RING_CIRCUMFERENCE}
      initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
      animate={{ strokeDashoffset: 0 }}
      transition={{ duration: HOLD_SUBMIT_MS / 1000, ease: 'linear' }}
      style={{ filter: 'drop-shadow(0 0 4px rgba(191,255,0,0.85))' }}
    />
  </svg>
);

// ==========================================
// Interactive Wheel Letter
// ==========================================

export interface WheelLetterProps {
  letter: string;
  isCenter: boolean;
  angle?: number;
  radius?: number;
  onPress: (letter: string, index: number, el: HTMLButtonElement) => void;
  isUsed: boolean;
  index: number;
  /** When true, disables the breathing/pulse loop on the center letter (WCAG 2.3.3). */
  reducedMotion?: boolean;
  /** Render the hold-to-submit progress ring around this letter. */
  showHoldRing?: boolean;
  /** Fires on pointerdown — drives hold-to-submit timing. */
  onHoldStart?: (letter: string, index: number, el: HTMLButtonElement) => void;
  /** Fires on pointerup / cancel / leave — cancels an in-flight hold. */
  onHoldEnd?: () => void;
}

export const WheelLetter: React.FC<WheelLetterProps> = ({
  letter, isCenter, angle = 0, radius = 0, onPress, isUsed, index, reducedMotion = false,
  showHoldRing = false, onHoldStart, onHoldEnd,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { t } = useLanguage();

  // Position outer letters using CSS transform (stable, no Framer Motion fighting).
  // Center letter stays at origin (inset-0 m-auto centers it).
  const rad = ((angle || 0) * Math.PI) / 180;
  const offsetX = isCenter ? 0 : Math.sin(rad) * radius;
  const offsetY = isCenter ? 0 : -Math.cos(rad) * radius;

  return (
    <m.button
      ref={btnRef}
      type="button"
      // `translate="no"` (+ notranslate) stops browser auto-translation from
      // rewriting a single letter into a word in the target language — e.g.
      // Google Translate turning the tile "I" into Indonesian "saya".
      translate="no"
      className={cn(
        'notranslate absolute inset-0 m-auto flex items-center justify-center font-neo-display font-black uppercase select-none touch-manipulation',
        // Invisible hit-area expander (≥48px WCAG AAA). Fixes rageclicks on Hebrew RTL wheel.
        'before:absolute before:-inset-2 before:content-[""]',
        'border-3 border-neo-black rounded-full transition-colors duration-150',
        // short: (≤600px height) shrinks letters so a height-capped wheel doesn't
        // collide center↔orbit. Landscape phones are short AND ≥sm/md wide, so the
        // short:sm/short:md compounds force the shrink to win over width breakpoints.
        isCenter
          ? 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 short:w-16 short:h-16 short:sm:w-16 short:sm:h-16 short:md:w-16 short:md:h-16 text-3xl sm:text-4xl md:text-5xl short:text-2xl short:sm:text-2xl short:md:text-2xl z-10'
          : 'w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] md:w-[68px] md:h-[68px] short:w-12 short:h-12 short:sm:w-12 short:sm:h-12 short:md:w-12 short:md:h-12 text-lg sm:text-xl md:text-2xl short:text-base short:sm:text-base short:md:text-base',
        isCenter
          ? isUsed
            ? 'bg-neo-lime/40 text-neo-black/40 shadow-hard-lg'
            : 'bg-neo-lime text-neo-black shadow-[3px_3px_0px_black,0_0_20px_rgba(191,255,0,0.5)]'
          : isUsed
            ? 'bg-neo-navy-light text-neo-white border-neo-cream/20 shadow-none'
            : 'bg-neo-white text-neo-navy shadow-[2px_2px_0px_black,0_0_8px_rgba(191,255,0,0.15)] hover:shadow-[2px_2px_0px_black,0_0_14px_rgba(191,255,0,0.35)] hover:bg-neo-cream active:bg-neo-lime/30',
        'cursor-pointer',
      )}
      onClick={() => {
        if (btnRef.current) onPress(letter, index, btnRef.current);
      }}
      onPointerDown={() => {
        if (onHoldStart && btnRef.current) onHoldStart(letter, index, btnRef.current);
      }}
      onPointerUp={() => onHoldEnd?.()}
      onPointerCancel={() => onHoldEnd?.()}
      onPointerLeave={() => onHoldEnd?.()}
      // Symmetric press: previous { scaleX: 1.12, scaleY: 0.82 } stretched the
      // button non-uniformly, which on slow Android frames reads as "danced
      // but didn't commit" → users re-tap. PostHog 2026-04-27 rage-clicks on
      // /he/daily/word-wheel were exclusively Mobile (he, ר, ש).
      whileTap={{ scale: 0.94 }}
      whileHover={!isCenter && !isUsed ? { scale: 1.1, boxShadow: '2px 2px 0px black, 0 0 18px rgba(191,255,0,0.5)' } : undefined}
      animate={{
        x: offsetX,
        y: offsetY,
        ...(isCenter && !isUsed && !reducedMotion
          ? { scale: [1, 1.06, 1], boxShadow: ['3px 3px 0px black, 0 0 20px rgba(191,255,0,0.5)', '3px 3px 0px black, 0 0 28px rgba(191,255,0,0.7)', '3px 3px 0px black, 0 0 20px rgba(191,255,0,0.5)'] }
          : { scale: isUsed ? 0.9 : 1 }),
      }}
      transition={isCenter && !isUsed && !reducedMotion
        ? { duration: 2, repeat: Infinity, ease: 'easeInOut', x: { type: 'spring', stiffness: 300, damping: 25 }, y: { type: 'spring', stiffness: 300, damping: 25 } }
        : { type: 'spring', stiffness: 400, damping: 22 }
      }
      aria-label={isUsed ? `${letter}. ${t('wordWheel.tapToRemove')}` : letter}
      aria-pressed={isUsed}
      data-wheel-letter={letter}
      data-wheel-index={index}
      data-wheel-used={isUsed ? 'true' : 'false'}
    >
      {showHoldRing && <HoldRing />}
      {letter}
    </m.button>
  );
};

// ==========================================
// Built Word Tile (tappable to remove)
// ==========================================

export interface WordTileProps {
  letter: string;
  index: number;
  onRemove: (index: number) => void;
  isCenter: boolean;
}

export const WordTile: React.FC<WordTileProps> = ({ letter, index, onRemove, isCenter }) => {
  const { t } = useLanguage();
  return (
  <m.button
    type="button"
    translate="no"
    className={cn(
      'notranslate group relative w-8 h-10 sm:w-10 sm:h-12 md:w-12 md:h-14 rounded-neo border-3 border-neo-black flex items-center justify-center touch-manipulation',
      'before:absolute before:-inset-2 before:content-[""]',
      'font-neo-display font-black text-base sm:text-lg md:text-xl cursor-pointer',
      'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
      isCenter
        ? 'bg-neo-lime text-neo-black shadow-[2px_2px_0px_black,0_0_12px_rgba(191,255,0,0.3)]'
        : 'bg-neo-white text-neo-navy shadow-[2px_2px_0px_black,0_0_6px_rgba(255,255,255,0.1)]',
    )}
    onClick={() => onRemove(index)}
    initial={{ scale: 0, y: 20 }}
    animate={{ scale: 1, y: 0 }}
    exit={{ scale: 0, y: -35, opacity: 0 }}
    transition={{
      scale: { type: 'spring', stiffness: 600, damping: 20 },
      y: { type: 'spring', stiffness: 600, damping: 20 },
    }}
    whileTap={{ scale: 0.85 }}
    aria-label={`${letter}. ${t('wordWheel.tapToRemove')}`}
    data-testid="built-letter-tile"
  >
    {letter}
    <span
      aria-hidden
      className="pointer-events-none absolute -top-1.5 -inset-e-1.5 w-4 h-4 rounded-full border-2 border-neo-black bg-neo-red text-neo-white text-[9px] leading-none flex items-center justify-center font-black shadow-hard-xs"
    >
      ×
    </span>
  </m.button>
  );
};
