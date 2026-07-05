'use client';

import { useEffect, useRef, useState } from 'react';
import { Coins, Gem } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface BlastWalletHudProps {
  coins: number;
  gems: number;
  /** Hide the gem chip when the mode never awards gems (keeps the HUD tight). */
  showGems?: boolean;
}

/** Ease a displayed integer toward `target` — the slot-machine count-up roll. */
function useCountUp(target: number, ms = 480): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, ms]);

  return display;
}

interface ChipProps {
  value: number;
  icon: typeof Coins;
  accent: string;
  label: string;
}

function WalletChip({ value, icon: Icon, accent, label }: ChipProps) {
  const { language } = useLanguage();
  const shown = useCountUp(value);
  const prevRef = useRef(value);
  const [creditKey, setCreditKey] = useState(0);

  useEffect(() => {
    if (value > prevRef.current) setCreditKey(k => k + 1);
    prevRef.current = value;
  }, [value]);

  return (
    <AdaptiveMotion.div
      key={creditKey}
      className="relative flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-navy-light px-2.5 py-1 shadow-hard"
      aria-label={`${label}: ${value}`}
      // A quick pop + colored flash whenever the balance is credited.
      initial={creditKey === 0 ? false : { scale: 1 }}
      animate={creditKey === 0 ? {} : { scale: [1, 1.16, 1] }}
      transition={{ duration: 0.34, ease: [0.34, 1.6, 0.5, 1] }}
      style={{ boxShadow: undefined }}
    >
      <Icon className="h-4 w-4" style={{ color: accent, filter: `drop-shadow(0 0 3px ${accent}aa)` }} strokeWidth={2.75} aria-hidden="true" />
      <span className="font-neo-display text-base font-black tabular-nums leading-none" style={{ color: accent }}>
        {safeToLocaleString(shown, language)}
      </span>
    </AdaptiveMotion.div>
  );
}

/**
 * BlastWalletHud — the in-run coin + gem balance chips. Each rolls its number up
 * slot-machine style on credit and gives a quick pop so earning FEELS like a
 * payout, not a silent counter. Purely a display of the passed balances.
 */
export default function BlastWalletHud({ coins, gems, showGems = true }: BlastWalletHudProps) {
  return (
    <div className="flex items-center gap-1.5">
      <WalletChip value={coins} icon={Coins} accent="#FFC53D" label="Coins" />
      {showGems && <WalletChip value={gems} icon={Gem} accent="#C084FC" label="Gems" />}
    </div>
  );
}
