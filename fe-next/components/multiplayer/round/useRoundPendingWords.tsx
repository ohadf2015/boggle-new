'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { usePendingWords } from '@/lib/multiplayer/usePendingWords';
import { PendingWordChip } from '@/components/multiplayer/PendingWordChip';

/**
 * Optimistic submit feedback shared by the host and joiner in-game views (one
 * copy so the two paths cannot drift): server confirmations / rejections move
 * each pending word chip, `endGame` clears them.
 */
export function useRoundPendingWords(socket: Socket | null, username: string) {
  const pending = usePendingWords();
  const { confirmPending, rejectPending, clearAll } = pending;

  useEffect(() => {
    if (!socket) return;
    // playerFoundWord is coalesced server-side into playerFoundWordBatch.
    const onBatch = (data: { words?: Array<{ username: string; word: string }> }) => {
      data.words?.forEach((w) => { if (w.username === username) confirmPending(w.word); });
    };
    const onReject = (data: { word: string }) => rejectPending(data.word);
    socket.on('playerFoundWordBatch', onBatch);
    socket.on('wordRejected', onReject);
    socket.on('wordAlreadyFound', onReject);
    socket.on('wordNotOnBoard', onReject);
    socket.on('endGame', clearAll);
    return () => {
      socket.off('playerFoundWordBatch', onBatch);
      socket.off('wordRejected', onReject);
      socket.off('wordAlreadyFound', onReject);
      socket.off('wordNotOnBoard', onReject);
      socket.off('endGame', clearAll);
    };
  }, [socket, username, confirmPending, rejectPending, clearAll]);

  return pending;
}

type Pending = ReturnType<typeof usePendingWords>;

/** The pending-word chips row (non-interactive except dismiss). */
export function PendingWordChips({ pendingWords, dismissPending }: Pick<Pending, 'pendingWords' | 'dismissPending'>) {
  if (pendingWords.size === 0) return null;
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-wrap gap-1 justify-center pointer-events-none">
      {Array.from(pendingWords.entries()).map(([word, status]) => (
        <PendingWordChip key={word} word={word} status={status} onDismiss={dismissPending} />
      ))}
    </div>
  );
}
