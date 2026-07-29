/**
 * BossDialogue Component
 *
 * In-game boss taunt overlay that appears during boss battles.
 * Displays a small speech bubble with the boss's mini-avatar, name,
 * and current taunt text. Slides in/out using Framer Motion animations.
 *
 * Exports:
 * - default BossDialogue: legacy interface (boss, currentTaunt, isVisible, position)
 * - named BossDialogue: new C2 interface (dialogue, bossAvatarUrl, bossName) with typewriter
 *
 * Positioned near the top or bottom of the game area as a toast-like overlay.
 */

'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';
import type { BossDialogueProps } from '@/types/boss';

// ==============================================
// CONSTANTS
// ==============================================

const AVATAR_SIZE = 32;
const NEW_AVATAR_SIZE = 48;
const TYPEWRITER_SPEED_MS = 45;

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
// LEGACY COMPONENT (default export)
// ==============================================

const LegacyBossDialogue = memo<BossDialogueProps>(
  ({ boss, currentTaunt, isVisible, position = 'top' }) => {
    const { t } = useLanguage();
    const bossFightTheme = useBossFightTheme();

    // BUG-008: Add fallbacks for dynamic translation keys
    const translatedTaunt = t(currentTaunt) || currentTaunt;
    const translatedName = t(boss.displayName) || boss.displayName;
    const variants = SLIDE_VARIANTS[position];

    return (
      <AdaptiveAnimatePresence mode="wait">
        {isVisible && (
          <AdaptiveMotion.div
            key="boss-dialogue"
            data-testid="boss-dialogue"
            className={cn(
              'fixed left-1/2 -translate-x-1/2 z-40',
              'pointer-events-none',
              'max-w-xs w-full px-2',
              // Position below header AND boss HUD strip (header 0-12, HUD 12-28)
              position === 'top' ? 'top-32 sm:top-36' : 'bottom-4'
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
                bossFightTheme.dialogueBg,
                'border-neo',
                bossFightTheme.dialogueBorder,
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
                  'shrink-0 object-cover'
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
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    );
  }
);

LegacyBossDialogue.displayName = 'LegacyBossDialogue';

export default LegacyBossDialogue;

// ==============================================
// NEW INTERFACE (C2 Task — inline, typewriter, 48px avatar)
// ==============================================

interface NewBossDialogueProps {
  dialogue: string | null;
  bossAvatarUrl: string;
  bossName: string;
  className?: string;
}

/**
 * Redesigned BossDialogue with typewriter effect, inline positioning, and 48px avatar.
 * Named export for new callers; default export retains legacy interface.
 */
export const BossDialogue = memo(function BossDialogue({
  dialogue,
  bossAvatarUrl,
  bossName,
  className,
}: NewBossDialogueProps) {
  const [displayed, setDisplayed] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  // Reset typewriter when dialogue changes
  useEffect(() => {
    setDisplayed('');
    setCharIndex(0);
  }, [dialogue]);

  // Typewriter tick — one character per TYPEWRITER_SPEED_MS
  useEffect(() => {
    if (!dialogue || charIndex >= dialogue.length) return;
    const timer = setTimeout(() => {
      setDisplayed(dialogue.slice(0, charIndex + 1));
      setCharIndex(i => i + 1);
    }, TYPEWRITER_SPEED_MS);
    return () => clearTimeout(timer);
  }, [dialogue, charIndex]);

  // Skip typewriter on tap
  const skipTypewriter = useCallback(() => {
    if (dialogue) {
      setDisplayed(dialogue);
      setCharIndex(dialogue.length);
    }
  }, [dialogue]);

  if (!dialogue) return null;

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        key={dialogue}
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={skipTypewriter}
        className={cn(
          'flex items-start gap-3 p-3 cursor-pointer',
          'bg-neo-navy backdrop-blur-xs',
          'border-3 border-neo-black rounded-neo shadow-hard',
          'max-w-sm w-full',
          className
        )}
      >
        {/* Avatar — 48px with glow ring */}
        <div className="shrink-0 w-12 h-12 rounded-full border-2 border-neo-yellow shadow-[0_0_10px_rgba(255,225,53,0.4)] overflow-hidden">
          <Image
            src={bossAvatarUrl}
            alt={bossName}
            width={NEW_AVATAR_SIZE}
            height={NEW_AVATAR_SIZE}
            className="object-cover w-full h-full"
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-neo-yellow uppercase tracking-wide mb-0.5">{bossName}</p>
          <p className="text-base font-bold text-neo-white leading-snug">
            <span data-testid="dialogue-text">{displayed}</span>
            {charIndex < (dialogue?.length ?? 0) && (
              <span className="animate-pulse">▋</span>
            )}
          </p>
        </div>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

BossDialogue.displayName = 'BossDialogue';
