'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

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
}

export const WheelLetter: React.FC<WheelLetterProps> = ({
  letter, isCenter, angle = 0, radius = 0, onPress, isUsed, index,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  // Position outer letters using CSS transform (stable, no Framer Motion fighting).
  // Center letter stays at origin (inset-0 m-auto centers it).
  const rad = ((angle || 0) * Math.PI) / 180;
  const offsetX = isCenter ? 0 : Math.sin(rad) * radius;
  const offsetY = isCenter ? 0 : -Math.cos(rad) * radius;

  return (
    <motion.button
      ref={btnRef}
      type="button"
      className={cn(
        'absolute inset-0 m-auto flex items-center justify-center font-neo-display font-black uppercase select-none',
        'border-3 border-neo-black rounded-full transition-colors duration-150',
        isCenter
          ? 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-2xl sm:text-3xl md:text-4xl z-10'
          : 'w-10 h-10 sm:w-[52px] sm:h-[52px] md:w-[60px] md:h-[60px] text-base sm:text-lg md:text-xl',
        isCenter
          ? isUsed
            ? 'bg-neo-lime/40 text-neo-black/40 shadow-hard-lg'
            : 'bg-neo-lime text-neo-black shadow-[3px_3px_0px_black,0_0_20px_rgba(191,255,0,0.5)]'
          : isUsed
            ? 'bg-neo-navy-light text-neo-cream/30 border-neo-cream/20 shadow-none'
            : 'bg-neo-white text-neo-navy shadow-[2px_2px_0px_black,0_0_8px_rgba(191,255,0,0.15)] hover:shadow-[2px_2px_0px_black,0_0_14px_rgba(191,255,0,0.35)] hover:bg-neo-cream active:bg-neo-lime/30',
        isUsed ? 'cursor-default' : 'cursor-pointer',
      )}
      onClick={() => {
        if (!isUsed && btnRef.current) onPress(letter, index, btnRef.current);
      }}
      whileTap={isUsed ? {} : { scaleX: 1.12, scaleY: 0.82 }}
      whileHover={!isCenter && !isUsed ? { scale: 1.1, boxShadow: '2px 2px 0px black, 0 0 18px rgba(191,255,0,0.5)' } : undefined}
      animate={{
        x: offsetX,
        y: offsetY,
        ...(isCenter && !isUsed
          ? { scale: [1, 1.06, 1], boxShadow: ['3px 3px 0px black, 0 0 20px rgba(191,255,0,0.5)', '3px 3px 0px black, 0 0 28px rgba(191,255,0,0.7)', '3px 3px 0px black, 0 0 20px rgba(191,255,0,0.5)'] }
          : { scale: isUsed ? 0.9 : 1 }),
      }}
      transition={isCenter && !isUsed
        ? { duration: 2, repeat: Infinity, ease: 'easeInOut', x: { type: 'spring', stiffness: 300, damping: 25 }, y: { type: 'spring', stiffness: 300, damping: 25 } }
        : { type: 'spring', stiffness: 400, damping: 22 }
      }
      disabled={isUsed}
      aria-label={letter}
    >
      {letter}
    </motion.button>
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

export const WordTile: React.FC<WordTileProps> = ({ letter, index, onRemove, isCenter }) => (
  <motion.button
    type="button"
    className={cn(
      'w-8 h-10 sm:w-10 sm:h-12 md:w-12 md:h-14 rounded-neo border-3 border-neo-black flex items-center justify-center',
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
    aria-label={`${letter}, tap to remove`}
  >
    {letter}
  </motion.button>
);
