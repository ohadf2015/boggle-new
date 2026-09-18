/**
 * Vocab Quiz Chest Flow
 *
 * Manages the treasure chest interaction:
 * 1. Shows picker after correct answer (chestPending=true)
 * 2. Emits openChest event when student picks
 * 3. Shows reveal when server responds
 * 4. Clears when moving to next question
 *
 * Housed in a separate component to keep VocabQuizView lean (max 500 lines).
 */

'use client';

import { useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { VOCAB_QUIZ_EVENTS, type TranslateFn, type TreasureChestState } from '@/shared/types/vocabQuiz';
import { TreasureChestPicker } from './TreasureChestPicker';
import { TreasureChestReveal } from './TreasureChestReveal';

export interface VocabQuizChestFlowProps {
  socket: Socket | null;
  chestPending: boolean;
  myChest: TreasureChestState | null;
  currentQuestionIndex: number;
  username: string;
  t: TranslateFn;
}

export function VocabQuizChestFlow({
  socket,
  chestPending,
  myChest,
  currentQuestionIndex,
  username,
  t,
}: VocabQuizChestFlowProps) {
  const handlePickChest = useCallback(
    (index: number) => {
      if (!socket) return;
      socket.emit(VOCAB_QUIZ_EVENTS.openChest, { index: currentQuestionIndex });
    },
    [socket, currentQuestionIndex]
  );

  // Show picker if chest pending and no result yet
  if (chestPending && !myChest) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-neo-navy/60 p-3">
        <div className="rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated p-4 max-w-sm">
          <TreasureChestPicker onPick={handlePickChest} t={t} />
        </div>
      </div>
    );
  }

  // Show reveal if result arrived and it's for this player
  if (myChest && myChest.actor === username) {
    return <TreasureChestReveal state={myChest} t={t} />;
  }

  return null;
}
