/**
 * Vocab Quiz Chest Flow — the student's side of the Gold-Quest chest loop.
 *
 * 1. Correct answer → `chestPending` → three chests.
 * 2. Tap → emit `openChest {index, chest}` → every chest locks (single choice).
 * 3. Private `treasureChestResult` → reveal overlay, auto-dismissed.
 * 4. A steal/swap landing on this student → kind banner, non-blocking.
 *
 * Every number comes from the server; this component only sequences them.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  VOCAB_QUIZ_EVENTS,
  type TranslateFn,
  type TreasureChestHit,
  type TreasureChestState,
} from '@/shared/types/vocabQuiz';
import { TreasureChestPicker } from './TreasureChestPicker';
import { TreasureChestReveal } from './TreasureChestReveal';

export interface VocabQuizChestFlowProps {
  socket: Socket | null;
  chestPending: boolean;
  myChest: TreasureChestState | null;
  chestHit: TreasureChestHit | null;
  /** Zero-based index of the question on screen. */
  questionIndex: number;
  ended: boolean;
  username: string;
  t: TranslateFn;
}

const REVEAL_MS = 3200;
const HIT_BANNER_MS = 4000;

export function VocabQuizChestFlow({
  socket,
  chestPending,
  myChest,
  chestHit,
  questionIndex,
  ended,
  username,
  t,
}: VocabQuizChestFlowProps) {
  // Local UI state is keyed by the question it belongs to, so a new question
  // resets it without an effect.
  const [picked, setPicked] = useState<{ q: number; chest: number } | null>(null);
  const [dismissedQ, setDismissedQ] = useState<number | null>(null);
  const [hiddenHit, setHiddenHit] = useState<TreasureChestHit | null>(null);

  const pickedChest = picked?.q === questionIndex ? picked.chest : null;
  const ownChest = myChest && myChest.actor === username ? myChest : null;
  const showReveal = !!ownChest && dismissedQ !== questionIndex;
  const showHit = !!chestHit && chestHit !== hiddenHit;

  const handlePick = useCallback(
    (chest: number) => {
      if (!socket || pickedChest !== null) return;
      setPicked({ q: questionIndex, chest });
      socket.emit(VOCAB_QUIZ_EVENTS.openChest, { index: questionIndex, chest });
    },
    [socket, pickedChest, questionIndex]
  );

  const dismissReveal = useCallback(() => setDismissedQ(questionIndex), [questionIndex]);

  useEffect(() => {
    if (!showReveal) return;
    const id = setTimeout(dismissReveal, REVEAL_MS);
    return () => clearTimeout(id);
  }, [showReveal, dismissReveal]);

  useEffect(() => {
    if (!chestHit) return;
    const id = setTimeout(() => setHiddenHit(chestHit), HIT_BANNER_MS);
    return () => clearTimeout(id);
  }, [chestHit]);

  if (ended) return null;

  const hitBanner = showHit && chestHit && (
    <div
      role="status"
      className="fixed top-3 start-4 end-16 z-[60] mx-auto max-w-sm rounded-neo border-[3px] border-neo-cyan bg-neo-navy-elevated p-3 text-center shadow-hard"
    >
      <p className="font-neo-display font-bold text-neo-white">
        {chestHit.outcome === 'steal'
          ? t('vocabQuiz.treasure.hitSteal', { actor: chestHit.actor, amount: chestHit.amount })
          : t('vocabQuiz.treasure.hitSwap', { actor: chestHit.actor })}
      </p>
    </div>
  );

  if (showReveal && ownChest) {
    return (
      <>
        <TreasureChestReveal state={ownChest} t={t} onDismiss={dismissReveal} />
        {hitBanner}
      </>
    );
  }

  if (chestPending && !ownChest) {
    return (
      <>
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-neo-navy px-4">
          <div className="w-full max-w-sm rounded-neo border-[3px] border-neo-yellow bg-neo-navy-elevated shadow-hard">
            <TreasureChestPicker onPick={handlePick} disabled={pickedChest !== null} pickedIndex={pickedChest} t={t} />
          </div>
        </div>
        {hitBanner}
      </>
    );
  }

  return hitBanner || null;
}
