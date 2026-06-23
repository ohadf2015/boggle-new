/**
 * useOpponentWordFeed - Real-time feed of opponent word finds in multiplayer
 * Listens for batched opponentWordsBatch socket events and maintains a display queue
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useSelectionStore } from './useSelectionStore';

export interface OpponentWordFeedItem {
  id: string;
  playerId: string;
  playerName: string;
  wordLength: number;
  firstLetter: string;
  lastLetter: string;
  score: number;
  isLongWord: boolean;
  timestamp: number;
}

interface OpponentWordFeedEvent {
  playerId: string;
  playerName: string;
  wordLength: number;
  firstLetter: string;
  lastLetter: string;
  score: number;
}

interface UseOpponentWordFeedOptions {
  socket: Socket | null;
  currentPlayerName: string;
}

const MAX_QUEUE_SIZE = 10;
const AUTO_REMOVE_MS = 3000;
const LONG_WORD_THRESHOLD = 6;
const STORAGE_KEY = 'lexiclash_opponent_feed_enabled';

export function useOpponentWordFeed({ socket, currentPlayerName }: UseOpponentWordFeedOptions) {
  const [feedItems, setFeedItems] = useState<OpponentWordFeedItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isEnabled = useCallback(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val !== 'false';
    } catch {
      return true;
    }
  }, []);

  const removeItem = useCallback((id: string) => {
    setFeedItems(prev => prev.filter(item => item.id !== id));
    timersRef.current.delete(id);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // The server coalesces per-word opponent finds into a single windowed
    // `opponentWordsBatch` broadcast (see backend/utils/opponentWordFeedBatcher).
    // Processing the whole batch in one setFeedItems = one re-render per window
    // instead of one per word — fewer paints in busy rooms.
    const handler = (data: { words: OpponentWordFeedEvent[] }) => {
      if (!isEnabled()) return;
      // Suppress the opponent-word flood while the player is mid-drag building a
      // word. In busy MP classic rooms (esp. with bots) batches arrive several
      // times/sec; each enqueue re-renders the feed + runs framer-motion
      // enter/exit animations, and that paint steals the drag's frame budget
      // ("MP classic feels slow when selecting"). The feed is ephemeral
      // (auto-removes in 3s) so pops dropped during a sub-2s drag are
      // imperceptible. Mirrors useFrozenWhileSelecting for the leaderboard.
      if (useSelectionStore.getState().letterCount > 0) return;

      const words = data?.words;
      if (!Array.isArray(words) || words.length === 0) return;

      const newItems: OpponentWordFeedItem[] = [];
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        if (!w || w.playerName === currentPlayerName) continue;
        const id = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
        newItems.push({
          id,
          playerId: w.playerId,
          playerName: w.playerName,
          wordLength: w.wordLength,
          firstLetter: w.firstLetter,
          lastLetter: w.lastLetter,
          score: w.score,
          isLongWord: w.wordLength >= LONG_WORD_THRESHOLD,
          timestamp: Date.now(),
        });
      }
      if (newItems.length === 0) return;

      setFeedItems(prev => {
        const next = [...prev, ...newItems];
        // FIFO: drop oldest if over max
        return next.length > MAX_QUEUE_SIZE ? next.slice(next.length - MAX_QUEUE_SIZE) : next;
      });

      for (const it of newItems) {
        const timer = setTimeout(() => removeItem(it.id), AUTO_REMOVE_MS);
        timersRef.current.set(it.id, timer);
      }
    };

    socket.on('opponentWordsBatch', handler);

    const timers = timersRef.current;
    return () => {
      socket.off('opponentWordsBatch', handler);
      // Clean up all timers
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, [socket, currentPlayerName, isEnabled, removeItem]);

  return { feedItems };
}
