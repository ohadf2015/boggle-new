import React from 'react';
import type { WheelBreakdown } from '@/utils/dailyChallenge/wordWheelScoring';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Base · combo · gold, so a bonus-day score explains itself. */
export default function WheelScoreBreakdown({ t, breakdown, coins }: { t: T; breakdown: WheelBreakdown; coins: number }) {
  const parts = [
    { key: 'base', label: t('wordWheel.results.breakdownBase'), value: breakdown.base, tone: 'text-neo-white' },
    { key: 'combo', label: t('wordWheel.results.breakdownCombo'), value: breakdown.combo, tone: 'text-neo-pink' },
    { key: 'gold', label: t('wordWheel.results.breakdownGold'), value: breakdown.gold, tone: 'text-neo-yellow' },
  ];
  return (
    <div
      data-testid="wheel-score-breakdown"
      className="z-10 w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-black/35 text-sm font-bold"
    >
      {parts.map((p, i) => (
        <React.Fragment key={p.key}>
          {i > 0 && <span aria-hidden className="text-neo-white/40">·</span>}
          <span className="flex items-baseline gap-1">
            <span className="text-neo-white/70">{p.label}</span>
            <span className={`font-neo-display font-black tabular-nums ${p.tone}`}>
              {i > 0 ? `+${p.value}` : p.value}
            </span>
          </span>
        </React.Fragment>
      ))}
      {coins > 0 && (
        <span data-testid="wheel-gold-coins" className="w-full text-center text-xs font-black text-neo-yellow">
          {t('wordWheel.results.goldCoins', { count: coins })}
        </span>
      )}
    </div>
  );
}
