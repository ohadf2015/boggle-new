'use client';

/**
 * BlastLoadingGate — the "Generating grid..." spinner with a recovery ladder.
 *
 * Why: the MP Blast spinner had no timeout, no retry and no telemetry — 20
 * sessions in 14 days rage-clicked it and left (t_67330c55). Rendered ONLY
 * while the board is not ready (grid and/or dictionary), so "once per mount"
 * analytics semantics fall out of the render gate in BlastGame.
 *
 * Ladder: at 8s a one-line localized status names the pending part plus a
 * Retry button (dictionary → re-run the dictionary load; MP grid → ask the
 * server to resync via the caller's onGridRetry). At 15s a one-shot
 * growth:blast_board_stuck event. At 30s a "Back to lobby" escape.
 */

import { useEffect, useRef, useState } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Language } from '@/shared/types/game';

const SHOW_RECOVERY_MS = 8000;
const STUCK_EVENT_MS = 15000;
const SHOW_LOBBY_MS = 30000;

export type BlastBoardWaitedFor = 'grid' | 'dictionary' | 'both';

export interface BlastLoadingGateProps {
  gridReady: boolean;
  dictionaryReady: boolean;
  mode: 'mp' | 'solo';
  language: Language;
  t: (key: string) => string;
  /** Re-run the dictionary load (useDictionaryCache.retry). */
  onDictionaryRetry: () => void;
  /** MP only: ask the server to resend the current board (requestGameState). */
  onGridRetry?: () => void;
  /** "Back to lobby" escape hatch (BlastGame's onQuit). */
  onBackToLobby: () => void;
}

export function BlastLoadingGate({
  gridReady,
  dictionaryReady,
  mode,
  language,
  t,
  onDictionaryRetry,
  onGridRetry,
  onBackToLobby,
}: BlastLoadingGateProps) {
  const [showRecovery, setShowRecovery] = useState(false);
  const [showLobby, setShowLobby] = useState(false);

  const mountTimeRef = useRef<number>(Date.now());
  // Which parts were EVER pending during this wait — drives waited_for.
  const pendingRef = useRef({ grid: !gridReady, dictionary: !dictionaryReady });
  if (!gridReady) pendingRef.current.grid = true;
  if (!dictionaryReady) pendingRef.current.dictionary = true;
  const stuckFiredRef = useRef(false);
  // Latest readiness for the unmount-time wait event.
  const latestRef = useRef({ gridReady, dictionaryReady });
  latestRef.current = { gridReady, dictionaryReady };

  const waitedFor = (): BlastBoardWaitedFor => {
    const { grid, dictionary } = pendingRef.current;
    if (grid && dictionary) return 'both';
    return grid ? 'grid' : 'dictionary';
  };

  // Recovery-ladder timers. Cleared on unmount — when the spinner clears the
  // gate unmounts (BlastGame renders the board instead), so no stale timers.
  useEffect(() => {
    const recoveryTimer = setTimeout(() => setShowRecovery(true), SHOW_RECOVERY_MS);
    const lobbyTimer = setTimeout(() => setShowLobby(true), SHOW_LOBBY_MS);
    const stuckTimer = setTimeout(() => {
      if (stuckFiredRef.current) return;
      stuckFiredRef.current = true;
      trackGrowthEvent('blast_board_stuck', {
        wait_ms: Date.now() - mountTimeRef.current,
        waited_for: waitedFor(),
        mode,
        language,
      });
    }, STUCK_EVENT_MS);
    return () => {
      clearTimeout(recoveryTimer);
      clearTimeout(lobbyTimer);
      clearTimeout(stuckTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once ladder; mode/language/waitedFor read at fire time
  }, []);

  // Fire growth:blast_board_wait exactly once, when the spinner CLEARS. The
  // gate unmounts on clear, so a cleanup that sees both parts ready is the
  // clear signal. A quit before ready emits nothing — that is an abandon, not
  // a wait, and blast_board_stuck already covered the hang case.
  useEffect(() => {
    return () => {
      if (!latestRef.current.gridReady || !latestRef.current.dictionaryReady) return;
      trackGrowthEvent('blast_board_wait', {
        wait_ms: Date.now() - mountTimeRef.current,
        waited_for: waitedFor(),
        mode,
        language,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount-only emit; values read from refs at cleanup time
  }, []);

  const handleRetry = () => {
    if (!dictionaryReady) onDictionaryRetry();
    if (!gridReady) onGridRetry?.();
  };

  return (
    <div className="flex-1 flex items-center justify-center" data-testid="blast-loading">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-neo-lime border-t-transparent rounded-full animate-spin" />
        <span className="text-neo-white text-sm font-bold">
          {t('blast.generating')}
        </span>
        {showRecovery && (
          <div className="flex flex-col items-center gap-2" data-testid="blast-loading-recovery">
            {!dictionaryReady && (
              <span className="text-neo-white/80 text-xs" data-testid="blast-loading-dictionary-status">
                {t('blast.loadingDictionary')}
              </span>
            )}
            {!gridReady && mode === 'mp' && (
              <span className="text-neo-white/80 text-xs" data-testid="blast-loading-board-status">
                {t('blast.waitingForBoard')}
              </span>
            )}
            <button
              type="button"
              onClick={handleRetry}
              data-testid="blast-loading-retry"
              className="px-4 py-1.5 rounded-neo border-neo-thick border-black bg-neo-cyan text-neo-navy text-xs font-black uppercase tracking-wide shadow-hard-sm hover:translate-y-[-1px] active:translate-y-[1px] transition-transform"
            >
              {t('blast.retryLoading')}
            </button>
          </div>
        )}
        {showLobby && (
          <button
            type="button"
            onClick={onBackToLobby}
            data-testid="blast-loading-back-to-lobby"
            className="text-neo-white/70 text-xs underline underline-offset-2 hover:text-neo-white"
          >
            {t('blast.backToLobby')}
          </button>
        )}
      </div>
    </div>
  );
}

export default BlastLoadingGate;
