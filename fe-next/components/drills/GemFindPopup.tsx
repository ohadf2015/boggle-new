'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Gem, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CelebrationLevel } from '@/lib/drills/rareGems';

// Gem-tier → swatch colour (UI only).
const RARITY_COLORS: Record<string, string> = {
  common: 'bg-gray-400',
  uncommon: 'bg-neo-green',
  rare: 'bg-neo-purple',
  legendary: 'bg-neo-lime',
};

// Bigger gem → bigger pop. Keyed by lib `CelebrationLevel`.
const WORD_POP_SCALE: Record<CelebrationLevel, number> = {
  small: 1,
  medium: 1.06,
  big: 1.16,
  epic: 1.32,
};

export interface GemFind {
  word: string;
  rarity: string;
  points: number;
  celebration: CelebrationLevel;
}

/**
 * GemFindPopup — the escalating find ceremony. A bigger/rarer gem pops bigger,
 * legendary finds get a sparkle flank. Extracted from RareGems.tsx for the
 * 500-line cap and to keep the juice testable in isolation.
 */
export default function GemFindPopup({ find }: { find: GemFind | null }) {
  return (
    <AdaptiveAnimatePresence>
      {find && (
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: WORD_POP_SCALE[find.celebration] }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 360, damping: 16 }}
          data-testid="gem-find-popup"
          data-celebration={find.celebration}
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'flex items-center gap-2 px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard',
            find.celebration === 'epic' && 'shadow-hard-lg',
            RARITY_COLORS[find.rarity],
          )}
        >
          {find.celebration === 'epic' && (
            <Sparkles className="w-5 h-5 text-neo-black motion-safe:animate-neo-wobble" />
          )}
          {find.rarity === 'legendary' && <Star className="w-5 h-5 text-neo-black" />}
          {find.rarity === 'rare' && <Gem className="w-5 h-5 text-neo-black" />}
          <span className="font-black text-neo-black">{find.word}</span>
          <span className="font-bold text-neo-black">+{find.points}</span>
          {find.celebration === 'epic' && (
            <Sparkles className="w-5 h-5 text-neo-black motion-safe:animate-neo-wobble" />
          )}
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
