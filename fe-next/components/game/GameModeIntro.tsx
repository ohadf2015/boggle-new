'use client';

import { useEffect } from 'react';
import { m } from 'framer-motion';
import type { GameMode } from '@/shared/types/game';

const MODE_ICONS: Record<GameMode, string> = {
  'classic': '📝',
  'blast': '💥',
  'word-hunt': '🎯',
  'wheel-rush': '🎡',
  'word-tower': '🏗️',
  'shiritori': '🔗',
  'sealed-bid': '🔨',
  'crossword': '📰',
  'wordcraft': '🧩',
};

/** Translation key mapping for each mode */
const MODE_TRANSLATION_KEYS: Record<GameMode, { name: string; description: string }> = {
  'classic': { name: 'gameModes.classic.name', description: 'gameModes.classic.description' },
  'blast': { name: 'gameModes.blast.name', description: 'gameModes.blast.description' },
  'word-hunt': { name: 'gameModes.wordHunt.name', description: 'gameModes.wordHunt.description' },
  'wheel-rush': { name: 'gameModes.wheelRush.name', description: 'gameModes.wheelRush.description' },
  'word-tower': { name: 'wordTower.cardTitle', description: 'wordTower.cardDesc' },
  'shiritori': { name: 'gameModes.shiritori.name', description: 'gameModes.shiritori.description' },
  'sealed-bid': { name: 'gameModes.sealedBid.name', description: 'gameModes.sealedBid.description' },
  'crossword': { name: 'gameModes.crossword.name', description: 'gameModes.crossword.description' },
  'wordcraft': { name: 'wordcraft.title', description: 'wordcraft.modeDesc' },
};

const RADIAL_GRADIENT_STYLE = { background: 'radial-gradient(circle, var(--tw-gradient-stops))' } as const;

/** Mode-specific accent colors for the radial burst */
const MODE_COLORS: Record<GameMode, { from: string; via: string }> = {
  'classic': { from: 'from-neo-cyan/30', via: 'via-neo-cyan/5' },
  'blast': { from: 'from-neo-orange/30', via: 'via-neo-orange/5' },
  'word-hunt': { from: 'from-neo-pink/30', via: 'via-neo-pink/5' },
  'wheel-rush': { from: 'from-neo-purple/30', via: 'via-neo-purple/5' },
  'word-tower': { from: 'from-neo-purple/30', via: 'via-neo-purple/5' },
  'shiritori': { from: 'from-neo-cyan/30', via: 'via-neo-cyan/5' },
  'sealed-bid': { from: 'from-neo-pink/30', via: 'via-neo-pink/5' },
  'crossword': { from: 'from-neo-cyan/30', via: 'via-neo-cyan/5' },
  'wordcraft': { from: 'from-neo-purple/30', via: 'via-neo-purple/5' },
};

interface GameModeIntroProps {
  mode: GameMode;
  t: (key: string) => string;
  onComplete: () => void;
  /** Duration in ms before onComplete fires (default: 3000) */
  duration?: number;
  /** TV broadcast mode — larger text, no interaction */
  isTv?: boolean;
}

export function GameModeIntro({
  mode,
  t,
  onComplete,
  duration = 3000,
  isTv = false,
}: GameModeIntroProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  const keys = MODE_TRANSLATION_KEYS[mode];
  const icon = MODE_ICONS[mode];
  const colors = MODE_COLORS[mode];

  return (
    <div
      data-testid="game-mode-intro"
      data-mode={mode}
      data-tv={isTv ? 'true' : undefined}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neo-navy/95 animate-in fade-in-0 duration-300 ${
        isTv ? 'gap-8' : 'gap-4'
      }`}
    >
      {/* Radial burst background in mode color */}
      <m.div
        className={`absolute inset-0 bg-radial-gradient ${colors.from} ${colors.via} to-transparent pointer-events-none`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 2.5, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' as const }}
        style={RADIAL_GRADIENT_STYLE}
      />

      {/* Ring burst effect */}
      <m.div
        className="absolute w-40 h-40 rounded-full border-2 border-neo-cream/20 pointer-events-none"
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 6, opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' as const, delay: 0.2 }}
      />

      {/* Icon with dramatic spring entrance + continuous float */}
      <m.div
        className={isTv ? 'text-8xl' : 'text-7xl'}
        initial={{ scale: 0, rotate: -30, y: 40 }}
        animate={{
          scale: 1,
          rotate: 0,
          y: [0, -6, 0],
        }}
        transition={{
          scale: { type: 'spring' as const, stiffness: 250, damping: 15, delay: 0.1 },
          rotate: { type: 'spring' as const, stiffness: 200, damping: 12, delay: 0.1 },
          y: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.8 },
        }}
      >
        {icon}
      </m.div>

      {/* Title with scale + fade */}
      <m.h1
        className={`font-neo-display font-bold text-neo-white ${
          isTv ? 'text-6xl' : 'text-4xl'
        }`}
        initial={{ y: 30, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{
          type: 'spring' as const,
          stiffness: 200,
          damping: 20,
          delay: 0.25,
        }}
      >
        {t(keys.name)}
      </m.h1>

      {/* Description */}
      <m.p
        className={`text-neo-white max-w-md text-center ${
          isTv ? 'text-3xl' : 'text-lg'
        }`}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45, duration: 0.5 }}
      >
        {t(keys.description)}
      </m.p>

      {/* Decorative bottom line */}
      <m.div
        className="h-1 bg-linear-to-r from-transparent via-neo-cream/30 to-transparent rounded-full"
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: isTv ? 300 : 200, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' as const }}
      />
    </div>
  );
}
