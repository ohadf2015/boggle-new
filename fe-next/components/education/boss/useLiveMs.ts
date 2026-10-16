'use client';

import { useEffect, useState } from 'react';
import { liveMsLeft, useClassroomBossStore } from '@/stores/classroomBossStore';

/** A server countdown (ms left at receipt) ticking down locally; re-renders only its own caller, 4x a second. */
export function useLiveMs(msAtReceipt: number | null | undefined): number {
  const receivedAt = useClassroomBossStore((s) => s.receivedAt);
  const [now, setNow] = useState(() => Date.now());
  const running = msAtReceipt != null && msAtReceipt > 0;
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running, receivedAt]);
  return msAtReceipt == null ? 0 : liveMsLeft(msAtReceipt, receivedAt, now);
}

export function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
