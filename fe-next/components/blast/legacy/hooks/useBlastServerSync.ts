import { useCallback, useEffect, useRef } from 'react';
import {
  INITIAL_BLAST_SYNC,
  noteBlastResyncRequested,
  noteBlastSubmit,
  receiveBlastBoard,
} from '@/shared/utils/blastServerSync';

export const BLAST_RESYNC_AFTER_MS = 1500;

/**
 * Gates server board snapshots in live MP Blast and heals a board the server
 * never acked: any word left without an ack (rejected while paused, not on
 * the server's board, rate-limited, dropped) triggers one board request.
 */
export function useBlastServerSync({
  enabled,
  username,
  onRequestBoard,
}: {
  enabled: boolean;
  username: string | undefined;
  onRequestBoard?: () => void;
}) {
  const stateRef = useRef(INITIAL_BLAST_SYNC);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(onRequestBoard);
  useEffect(() => { requestRef.current = onRequestBoard; }, [onRequestBoard]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const arm = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (stateRef.current.pending === 0 || !requestRef.current) return;
      stateRef.current = noteBlastResyncRequested(stateRef.current);
      requestRef.current();
    }, BLAST_RESYNC_AFTER_MS);
  }, []);

  useEffect(() => clearTimer, []);

  const noteSubmit = useCallback(() => {
    if (!enabled) return;
    stateRef.current = noteBlastSubmit(stateRef.current);
    arm();
  }, [enabled, arm]);

  const receive = useCallback((clearedBy: string): boolean => {
    if (!enabled) return true;
    const { apply, state } = receiveBlastBoard(stateRef.current, clearedBy, username);
    stateRef.current = state;
    if (state.pending === 0) clearTimer();
    else arm();
    return apply;
  }, [enabled, username, arm]);

  return { noteSubmit, receive };
}
