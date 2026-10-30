'use client';

import { memo, useEffect, useState } from 'react';
import { create } from 'zustand';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import styles from './MpBonusPill.module.css';

export const BONUS_PILL_MS = 1400;

export type MpWordBonus =
  | { kind: 'comeback'; pct: number; points: number }
  | { kind: 'meteor'; points: number };

interface StoredBonus { id: number; bonus: MpWordBonus; ts: number }

export const useMpBonusStore = create<{ last: StoredBonus | null }>()(() => ({ last: null }));

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function bonusFromAccepted(data: { catchUp?: { bonus?: number; pct?: number } | null; meteorBonus?: number }): MpWordBonus | null {
  const c = data.catchUp;
  if (c && positive(c.bonus) && positive(c.pct)) return { kind: 'comeback', pct: Math.round(c.pct), points: c.bonus };
  if (positive(data.meteorBonus)) return { kind: 'meteor', points: data.meteorBonus };
  return null;
}

let seq = 0;
/** Called by BOTH word-event paths (joiner + playing host). */
export function recordWordBonus(data: Parameters<typeof bonusFromAccepted>[0]): void {
  const bonus = bonusFromAccepted(data);
  if (bonus) useMpBonusStore.setState({ last: { id: ++seq, bonus, ts: Date.now() } });
}

function MpBonusPillImpl({ className }: { className?: string }) {
  const { t } = useLanguage();
  const last = useMpBonusStore((s) => s.last);
  const [mountedAt] = useState(() => Date.now());
  const [shownId, setShownId] = useState<number | null>(null);
  const fresh = last && last.ts >= mountedAt ? last : null;

  useEffect(() => {
    if (!fresh) return;
    setShownId(fresh.id);
    const timer = setTimeout(() => setShownId(null), BONUS_PILL_MS);
    return () => clearTimeout(timer);
  }, [fresh?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fresh || shownId !== fresh.id) return null;
  const { bonus } = fresh;
  const text = bonus.kind === 'comeback'
    ? t('mpUi.round.bonusComeback', { pct: bonus.pct })
    : t('mpUi.round.bonusMeteor', { points: bonus.points });

  return (
    <div aria-live="polite" className={cn('pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.5rem)] z-40 flex justify-center', className)}>
      <span
        key={fresh.id}
        data-testid="mp-bonus-pill"
        className={cn(
          'rounded-full border-2 border-neo-black px-3 py-1 shadow-hard-sm font-neo-display text-sm font-bold tabular-nums',
          bonus.kind === 'comeback' ? 'bg-neo-cyan text-neo-black' : 'bg-neo-orange text-neo-black',
          styles.rise,
        )}
      >
        {text}
      </span>
    </div>
  );
}

export const MpBonusPill = memo(MpBonusPillImpl);
MpBonusPill.displayName = 'MpBonusPill';
