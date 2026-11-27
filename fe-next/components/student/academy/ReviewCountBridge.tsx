'use client';

import { useEffect } from 'react';
import { useWordMemory } from '@/hooks/useWordMemory';

/** Mounted only with a real lesson id. Reports nothing until the server answers; a failed read counts as 0. */
export function ReviewCountBridge({ lessonId, onCount }: { lessonId: string; onCount: (n: number) => void }) {
  const { data, isError } = useWordMemory(lessonId);
  const count = data ? data.dueCount : isError ? 0 : null;
  useEffect(() => { if (count !== null) onCount(count); }, [count, onCount]);
  useEffect(() => () => onCount(0), [onCount]);
  return null;
}
