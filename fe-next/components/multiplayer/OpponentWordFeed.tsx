'use client';

/**
 * OpponentWordFeed - Floating feed showing opponent word finds during MP games
 * Semi-transparent overlay with pointer-events-none to avoid blocking gameplay
 */

import React from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { OpponentWordFeedItem } from '@/hooks/useOpponentWordFeed';

const MAX_VISIBLE = 4;

interface OpponentWordFeedProps {
  feedItems: OpponentWordFeedItem[];
  t: (key: string, params?: Record<string, any>) => string;
}

export function OpponentWordFeed({ feedItems, t }: OpponentWordFeedProps) {
  const visibleItems = feedItems.slice(-MAX_VISIBLE);

  return (
    <div
      data-testid="opponent-word-feed"
      className="pointer-events-none fixed bottom-20 left-3 z-40 flex flex-col gap-1.5 max-w-[260px]"
    >
      <AdaptiveAnimatePresence>
        {visibleItems.map((item) => {
          const translationKey = item.isLongWord
            ? 'multiplayer.opponentFoundLongWord'
            : 'multiplayer.opponentFoundWord';

          return (
            <AdaptiveMotion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className={`rounded-neo border-neo border-black bg-neo-navy-light/80 px-3 py-1.5 backdrop-blur-sm ${
                item.isLongWord ? 'animate-neo-shake text-neo-lime font-bold text-sm' : 'text-neo-cream/90 text-xs'
              }`}
            >
              <span>{t(translationKey, { name: item.playerName, length: item.wordLength })}</span>
              <span className="ml-1.5 text-neo-lime font-bold">+{item.score}</span>
            </AdaptiveMotion.div>
          );
        })}
      </AdaptiveAnimatePresence>
    </div>
  );
}
