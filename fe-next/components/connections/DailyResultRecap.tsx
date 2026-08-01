'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Clock } from 'lucide-react';
import { bridgeSquare, type BridgeOutcome } from '@/lib/connections/shareGrid';
import { msUntilNextUtcDay } from '@/lib/connections/dailyClient';

interface DailyResultRecapProps {
  outcomes: readonly BridgeOutcome[];
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
 * Results-card recap: the day's emoji chain rendered as big pop-in squares
 * (same glyphs the share text uses, so what you share is what you saw) plus a
 * Wordle-style countdown to tomorrow's set — the come-back-tomorrow hook.
 */
export default function DailyResultRecap({ outcomes, nextLabel }: DailyResultRecapProps) {
  const [remainingMs, setRemainingMs] = useState(() => msUntilNextUtcDay());
  useEffect(() => {
    const timer = window.setInterval(() => setRemainingMs(msUntilNextUtcDay()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-1" aria-hidden="true">
        {outcomes.map((o, i) => (
          <m.span
            key={`sq-${i}`}
            data-testid="recap-square"
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.15 + i * 0.08 }}
            className="text-2xl leading-none"
          >
            {bridgeSquare(o)}
          </m.span>
        ))}
      </div>
      <p className="inline-flex items-center gap-1.5 font-neo-body text-xs font-bold text-neo-white/60">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {nextLabel} <span className="font-mono tabular-nums text-neo-cyan">{formatHhMm(remainingMs)}</span>
      </p>
    </div>
  );
}
