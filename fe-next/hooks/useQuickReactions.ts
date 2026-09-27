import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { REACTIONS } from '@/components/game/QuickReactions';

export interface FloatingReactionData {
  id: string;
  emoji: string;
  username: string;
  x: number;
  y: number;
}

interface UseQuickReactionsOptions {
  socket: Socket | null;
  username: string;
}

interface QuickReactionEvent {
  reactionId: string;
  username: string;
}

export function useQuickReactions({ socket, username }: UseQuickReactionsOptions) {
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionData[]>([]);
  const idCounterRef = useRef(0);

  const addFloating = useCallback((reactionId: string, fromUsername: string) => {
    const reaction = REACTIONS.find(r => r.id === reactionId);
    if (!reaction) return;
    const id = `qr-${++idCounterRef.current}`;
    setFloatingReactions(prev => [
      ...prev,
      {
        id,
        emoji: reaction.emoji,
        username: fromUsername,
        x: 20 + Math.random() * 60,
        y: 30 + Math.random() * 40,
      },
    ]);
  }, []);

  const sendReaction = useCallback((reactionId: string) => {
    if (!socket) return;
    socket.emit('quickReaction', { reactionId, username });
    // Show own reaction locally immediately
    addFloating(reactionId, username);
  }, [socket, username, addFloating]);

  const dismissReaction = useCallback((id: string) => {
    setFloatingReactions(prev => prev.filter(r => r.id !== id));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: QuickReactionEvent) => {
      // Skip own reactions (already added locally in sendReaction)
      if (data.username === username) return;
      addFloating(data.reactionId, data.username);
    };
    socket.on('quickReaction', handler);
    return () => { socket.off('quickReaction', handler); };
  }, [socket, username, addFloating]);

  return { floatingReactions, sendReaction, dismissReaction };
}
