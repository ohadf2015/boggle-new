'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useOverlayQuietZone } from '@/lib/overlayQuietZone';

interface QueuedModal {
  id: string;
  priority: number;
  isReady: boolean;
}

interface UseModalQueueOptions {
  modals: QueuedModal[];
}

/**
 * Serializes modal display to prevent stacking.
 * Only one modal shows at a time in priority order (lower number = higher priority).
 * When dismissed, the next queued modal shows.
 * Dismissed set resets when all modals become not-ready (new game cycle).
 *
 * POLICY: Post-game modal sequencing.
 * - Celebration modals (levelUp, referralMilestone) show first — capture emotional peak.
 * - Guest conversion (firstWin, auth) shows second — strike while motivation is high.
 * - Content resolution (wordFeedback) shows third — let players resolve outstanding disputes.
 * - Engagement surveys (gameFeedback rating) shows last — only after rematch CTA is visible.
 *
 * Rationale: Users must not be blocked from rematch/exit flows by signup or survey dialogs.
 * Conversion moments (signups) have time-sensitive emotional value; surveys do not.
 */
export function useModalQueue({ modals }: UseModalQueueOptions): {
  activeModalId: string | null;
  dismiss: (id: string) => void;
} {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // OVERLAY QUIET ZONE. Every modal in this queue is a fixed overlay on the
  // results screen, and the classroom round-end recap lives on that same screen.
  // The share prompt was measured covering a student's "YOU WON!" podium.
  //
  // Suppress the WINNER, never the readiness. Filtering `isReady` would drop the
  // queue's ready count to zero, which its reset effect below reads as "new game
  // cycle" and clears `dismissedIds` — a modal the user already closed would
  // re-open when the zone lifted. Here the queue keeps its whole state and only
  // the display waits, so each caller's own `show*` flag survives untouched.
  const quietZone = useOverlayQuietZone();

  const activeModalId = quietZone
    ? null
    : modals
        .filter((m) => m.isReady && !dismissedIds.has(m.id))
        .sort((a, b) => a.priority - b.priority)[0]?.id ?? null;

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const prevReadyCount = useRef(0);
  useEffect(() => {
    const readyCount = modals.filter((m) => m.isReady).length;
    if (readyCount === 0 && prevReadyCount.current > 0) {
      setDismissedIds(new Set());
    }
    prevReadyCount.current = readyCount;
  }, [modals]);

  return { activeModalId, dismiss };
}
