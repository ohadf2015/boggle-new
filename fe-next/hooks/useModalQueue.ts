'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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

  const activeModalId =
    modals
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
