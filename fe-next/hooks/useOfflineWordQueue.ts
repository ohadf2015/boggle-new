/**
 * useOfflineWordQueue - Queue word submissions when disconnected, replay on reconnect
 *
 * When the socket is disconnected, words are queued locally with timestamps
 * and unique submission IDs. On reconnection, queued words are replayed in
 * FIFO order via submitWord events. Idempotency IDs prevent duplicate scoring.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export interface QueuedWord {
  word: string;
  timestamp: number;
  submissionId: string;
}

export interface OfflineWordQueue {
  queueWord: (word: string) => boolean;
  queueSize: number;
  isReplaying: boolean;
  pendingWords: QueuedWord[];
}

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `oq-${Date.now()}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useOfflineWordQueue(
  socket: Socket | null,
  isConnected: boolean
): OfflineWordQueue {
  const [queue, setQueue] = useState<QueuedWord[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const prevConnectedRef = useRef(isConnected);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const queueWord = useCallback((word: string): boolean => {
    if (isConnected) return false;

    const entry: QueuedWord = {
      word,
      timestamp: Date.now(),
      submissionId: generateId(),
    };

    setQueue(prev => [...prev, entry]);
    return true;
  }, [isConnected]);

  // Replay queued words when connection is restored
  useEffect(() => {
    const wasDisconnected = !prevConnectedRef.current;
    prevConnectedRef.current = isConnected;

    if (!isConnected || !wasDisconnected) return;
    if (queueRef.current.length === 0) return;
    if (!socket) return;

    setIsReplaying(true);

    // Replay all queued words in FIFO order
    for (const entry of queueRef.current) {
      socket.emit('submitWord', {
        word: entry.word,
        submissionId: entry.submissionId,
      });
    }

    setQueue([]);
    setIsReplaying(false);
  }, [isConnected, socket]);

  return {
    queueWord,
    queueSize: queue.length,
    isReplaying,
    pendingWords: queue,
  };
}
