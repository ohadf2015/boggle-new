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
  dir: string;
}

export const WheelLetter: React.FC<WheelLetterProps> = ({
  letter, isCenter, angle = 0, radius = 0, onPress, isUsed, index, dir,
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  // Position letters using inset-0 + m-auto for centering (no transform needed),
  // then use Framer Motion x/y props for outer letter offsets.
  // This avoids conflicts between CSS transform centering and Framer Motion's
  // animate/scale which takes control of the transform property.
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
          ? 'w-20 h-20 sm:w-24 sm:h-24 text-3xl sm:text-4xl z-10'
          : 'w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] text-lg sm:text-xl',
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
      whileTap={isUsed ? {} : { scale: 0.85 }}
      animate={isCenter && !isUsed
        ? { x: offsetX, y: offsetY, scale: [1, 1.06, 1], boxShadow: ['3px 3px 0px black, 0 0 20px rgba(191,255,0,0.5)', '3px 3px 0px black, 0 0 28px rgba(191,255,0,0.7)', '3px 3px 0px black, 0 0 20px rgba(191,255,0,0.5)'] }
        : { x: offsetX, y: offsetY, scale: isUsed ? 0.9 : 1 }
      }
      transition={isCenter && !isUsed
        ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        : { type: 'spring', stiffness: 500, damping: 25 }
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
      'w-10 h-12 sm:w-12 sm:h-14 rounded-neo border-3 border-neo-black flex items-center justify-center',
      'font-neo-display font-black text-lg sm:text-xl cursor-pointer',
      'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
      isCenter
        ? 'bg-neo-lime text-neo-black shadow-[2px_2px_0px_black,0_0_12px_rgba(191,255,0,0.3)]'
        : 'bg-neo-white text-neo-navy shadow-[2px_2px_0px_black,0_0_6px_rgba(255,255,255,0.1)]',
    )}
    onClick={() => onRemove(index)}
    initial={{ scale: 0, y: 20 }}
    animate={{ scale: 1, y: [0, -3, 0] }}
    exit={{ scale: 0, y: -20, opacity: 0 }}
    transition={{
      scale: { type: 'spring', stiffness: 600, damping: 20 },
      y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.12 },
    }}
    whileTap={{ scale: 0.85 }}
    aria-label={`${letter}, tap to remove`}
  >
    {letter}
  </motion.button>
);
