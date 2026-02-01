/**
 * BossDialogue Component
 *
 * In-game boss taunt overlay that appears during boss battles.
 * Displays a small speech bubble with the boss's mini-avatar, name,
 * and current taunt text. Slides in/out using Framer Motion animations.
 *
 * Positioned near the top or bottom of the game area as a toast-like overlay.
 */

'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BossDialogueProps } from '@/types/boss';

// ==============================================
// CONSTANTS
// ==============================================

const AVATAR_SIZE = 32;

const SLIDE_VARIANTS = {
  top: {
    initial: { y: -60, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -60, opacity: 0 },
  },
  bottom: {
    initial: { y: 60, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 60, opacity: 0 },
  },
} as const;

const TRANSITION = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
};

// ==============================================
// COMPONENT
// ==============================================

const BossDialogue = memo<BossDialogueProps>(
  ({ boss, currentTaunt, isVisible, position = 'top' }) => {
    const { t } = useLanguage();

    // BUG-008: Add fallbacks for dynamic translation keys
    const translatedTaunt = t(currentTaunt, currentTaunt);
    const translatedName = t(boss.displayName, boss.displayName);
    const variants = SLIDE_VARIANTS[position];

    return (
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key="boss-dialogue"
            data-testid="boss-dialogue"
            className={cn(
              'absolute left-1/2 -translate-x-1/2 z-40',
              'pointer-events-none',
              'max-w-xs w-full px-2',
              position === 'top' ? 'top-4' : 'bottom-4'
            )}
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={TRANSITION}
          >
            {/* Speech bubble container */}
            <div
              data-testid="boss-speech-bubble"
              className={cn(
                'bg-neo-navy/95 border-neo border-neo-white/30',
                'rounded-neo shadow-hard',
                'p-3 flex items-start gap-2'
              )}
            >
              {/* Boss mini-avatar */}
              <Image
                src={boss.imagePath}
                alt={translatedName}
                width={AVATAR_SIZE}
                height={AVATAR_SIZE}
                className={cn(
                  'rounded-full border-2 border-neo-yellow',
                  'flex-shrink-0 object-cover'
                )}
              />

              {/* Name + taunt text */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  className={cn(
                    'text-xs font-bold text-neo-yellow',
                    'uppercase tracking-wide truncate'
                  )}
                >
                  {translatedName}
                </span>
                <p
                  className={cn(
                    'text-sm font-neo-body text-neo-white',
                    'leading-snug'
                  )}
                >
                  {translatedTaunt}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }
);

BossDialogue.displayName = 'BossDialogue';

export default BossDialogue;
