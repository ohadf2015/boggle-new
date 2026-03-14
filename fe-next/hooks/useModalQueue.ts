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
