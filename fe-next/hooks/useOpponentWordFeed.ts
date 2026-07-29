/**
 * useOpponentWordFeed - Real-time feed of opponent word finds in multiplayer
 * Listens for opponentWordFound socket events and maintains a display queue
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

    const handler = (data: OpponentWordFeedEvent) => {
      if (!isEnabled()) return;
      if (data.playerName === currentPlayerName) return;
      // Suppress the opponent-word flood while the player is mid-drag building a
      // word. In busy MP classic rooms (esp. with bots) opponentWordFound fires
      // several times/sec; each enqueue re-renders the feed + runs framer-motion
      // enter/exit animations, and that paint steals the drag's frame budget
      // ("MP classic feels slow when selecting"). The feed is ephemeral
      // (auto-removes in 3s) so opponent pops dropped during a sub-2s drag are
      // imperceptible. Mirrors useFrozenWhileSelecting for the leaderboard.
      if (useSelectionStore.getState().letterCount > 0) return;

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: OpponentWordFeedItem = {
        id,
        playerId: data.playerId,
        playerName: data.playerName,
        wordLength: data.wordLength,
        firstLetter: data.firstLetter,
        lastLetter: data.lastLetter,
        score: data.score,
        isLongWord: data.wordLength >= LONG_WORD_THRESHOLD,
        timestamp: Date.now(),
      };

      setFeedItems(prev => {
        const next = [...prev, item];
        // FIFO: drop oldest if over max
        return next.length > MAX_QUEUE_SIZE ? next.slice(next.length - MAX_QUEUE_SIZE) : next;
      });

      const timer = setTimeout(() => removeItem(id), AUTO_REMOVE_MS);
      timersRef.current.set(id, timer);
    };

    socket.on('opponentWordFound', handler);

    const timers = timersRef.current;
    return () => {
      socket.off('opponentWordFound', handler);
      // Clean up all timers
      timers.forEach(timer => clearTimeout(timer));
      timers.clear();
    };
  }, [socket, currentPlayerName, isEnabled, removeItem]);

  return { feedItems };
}
