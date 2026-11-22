'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './lobby.module.css';

type T = (path: string, params?: Record<string, string | number>) => string;

export const QUIP_MS = 4500;
const QUIPS = 6;

/** The mascot's rotating one-liner while the room fills. Decorative, so it stays out of aria-live. */
export function LobbyQuip({ t, className }: { t: T; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % QUIPS), QUIP_MS);
    return () => clearInterval(id);
  }, []);
  return (
    <span data-testid="lobby-quip" key={i} className={cn('block', styles.laneIn, className)}>
      {t(`lobby.fun.quip${i + 1}`)}
    </span>
  );
}
