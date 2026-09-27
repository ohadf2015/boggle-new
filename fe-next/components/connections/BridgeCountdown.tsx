'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { msUntilNextUtcDay } from '@/lib/connections/dailyClient';

interface BridgeCountdownProps {
  /** Localized "Next bridge in" label (caller passes t()). */
  nextLabel: string;
}

function formatHhMm(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Wordle-style countdown to tomorrow's UTC set — the come-back-tomorrow hook.
 * Ticks every 30s; the display resolution is whole minutes.
 */
export default function BridgeCountdown({ nextLabel }: BridgeCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() => msUntilNextUtcDay());
  useEffect(() => {
    const timer = window.setInterval(() => setRemainingMs(msUntilNextUtcDay()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="inline-flex items-center justify-center gap-1.5 font-neo-body text-xs font-bold text-neo-white/60">
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      {nextLabel} <span className="font-mono tabular-nums text-neo-cyan">{formatHhMm(remainingMs)}</span>
    </p>
  );
}
