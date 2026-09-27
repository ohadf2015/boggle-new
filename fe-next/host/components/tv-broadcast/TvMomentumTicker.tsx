'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';

interface TvMomentumTickerProps {
  playerScores: Record<string, number>;
  playerWordCounts: Record<string, number>;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const ROTATION_INTERVAL = 8000;

/**
 * TvMomentumTicker - Auto-commentary strip for TV broadcast
 * Generates and rotates contextual messages about the game state
 */
const TvMomentumTicker = memo<TvMomentumTickerProps>(({
  playerScores,
  playerWordCounts,
  t,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);

  const messages = useMemo(() => {
    const entries = Object.entries(playerScores).sort(([, a], [, b]) => b - a);

    if (entries.length === 0) {
      return [t('tvBroadcast.noActivityYet')];
    }

    const msgs: string[] = [];
    const [leaderName, leaderScore] = entries[0];

    // Leader message
    msgs.push(t('tvBroadcast.leadsWithPts', { player: leaderName, score: leaderScore }));

    // Close race message
    if (entries.length >= 2) {
      const minScore = entries[entries.length - 1][1];
      const gap = leaderScore - minScore;
      const closeEntries = entries.filter(([, s]) => leaderScore - s <= Math.max(gap * 0.3, 20));
      if (closeEntries.length >= 2) {
        const closeGap = leaderScore - closeEntries[closeEntries.length - 1][1];
        msgs.push(t('tvBroadcast.playersWithinPts', { count: closeEntries.length, gap: closeGap }));
      }
    }

    // Word count messages for high word counts
    for (const [name, _score] of entries) {
      const wc = playerWordCounts[name] || 0;
      if (wc >= 8) {
        msgs.push(t('tvBroadcast.wordsAndCounting', { player: name, count: wc }));
        break; // Only one word count message
      }
    }

    // Filler messages
    if (entries.length >= 2) {
      msgs.push(t('tvBroadcast.raceHeatingUp'));
    }
    if (entries.length >= 3) {
      msgs.push(t('tvBroadcast.anyonesGame'));
    }

    return msgs;
  }, [playerScores, playerWordCounts, t]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [messages.length]);

  // Reset index when messages change
  useEffect(() => {
    setMessageIndex(0);
  }, [messages]);

  const currentMessage = messages[messageIndex % messages.length] || '';

  return (
    <div
      data-testid="momentum-ticker"
      className="w-full bg-neo-black/90 border-y-3 border-neo-yellow py-2 px-4 overflow-hidden"
    >
      <AnimatePresence mode="wait">
        <m.div
          key={currentMessage}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center font-black text-neo-yellow text-sm uppercase tracking-wide"
        >
          {currentMessage}
        </m.div>
      </AnimatePresence>
    </div>
  );
});

TvMomentumTicker.displayName = 'TvMomentumTicker';

export default TvMomentumTicker;
