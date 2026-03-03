'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameMode } from '@/shared/types/game';

const MODE_ICONS: Record<GameMode, string> = {
  'classic': '📝',
  'blast': '💥',
  'word-hunt': '🎯',
};

/** Translation key mapping for each mode */
const MODE_TRANSLATION_KEYS: Record<GameMode, { name: string; description: string }> = {
  'classic': { name: 'gameModes.classic.name', description: 'gameModes.classic.description' },
  'blast': { name: 'gameModes.blast.name', description: 'gameModes.blast.description' },
  'word-hunt': { name: 'gameModes.wordHunt.name', description: 'gameModes.wordHunt.description' },
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

  return (
    <AnimatePresence>
      <motion.div
        data-testid="game-mode-intro"
        data-mode={mode}
        data-tv={isTv ? 'true' : undefined}
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-neo-navy/95 ${
          isTv ? 'gap-8' : 'gap-4'
        }`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className={isTv ? 'text-8xl' : 'text-6xl'}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          {icon}
        </motion.div>

        <motion.h1
          className={`font-neo-display font-bold text-neo-white ${
            isTv ? 'text-6xl' : 'text-4xl'
          }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {t(keys.name)}
        </motion.h1>

        <motion.p
          className={`text-neo-white/80 max-w-md text-center ${
            isTv ? 'text-3xl' : 'text-lg'
          }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {t(keys.description)}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
