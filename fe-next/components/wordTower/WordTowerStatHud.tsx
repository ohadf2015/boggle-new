'use client';

import { Flame } from 'lucide-react';
import { comboMult } from '@/lib/wordTower/wordTowerManager';

interface Props {
  heightM: number;
  combo: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Compact altitude readout. Lives in the top-bar's CENTRE column (back button
 * left, actions right) so it shares the header's flex row — it can never sit
 * behind the back button by construction, regardless of locale label width. Adds
 * the live combo streak chip the old corner card lacked (the multiplier used to
 * flash only in the transient reward popup).
 */
export function WordTowerStatHud({ heightM, combo, t }: Props) {
  const mult = comboMult(combo);
  // Simplified readout: altitude + live combo flame only — no expandable detail section.
  return (
    <div
      className="pointer-events-auto flex items-center gap-1.5 rounded-neo border-neo border-black bg-neo-navy/85 px-2.5 py-1 shadow-hard-sm backdrop-blur-sm"
    >
      <span className="font-neo-display text-2xl font-black leading-none text-neo-white tabular-nums">
        {heightM.toFixed(0)}<span className="text-sm text-neo-cyan">m</span>
      </span>
      {combo > 1 && (
        <span className="flex items-center gap-0.5 rounded-full border border-black bg-neo-orange px-1.5 py-0.5 font-neo-display text-[11px] font-black leading-none text-black tabular-nums">
          <Flame className="h-3 w-3" aria-hidden />×{mult.toFixed(1)}
        </span>
      )}
    </div>
  );
}
