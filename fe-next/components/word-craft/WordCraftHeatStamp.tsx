'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HeatBeat } from '@/lib/word-craft/celebration/heatTransition';

interface Props {
  beat: HeatBeat | null;
  onDone: () => void;
}

// Reuse existing translated keys where the wording already matches a beat,
// so the stamp ships in all 5 locales without scaffolding new strings.
// Only `exitOverdrive` + `recover` are net-new.
const KEY_FOR_BEAT: Record<HeatBeat, string> = {
  'enter-overdrive': 'wordcraft.overdrive',
  'exit-overdrive': 'wordcraft.heatStamp.exitOverdrive',
  'enter-burnout': 'wordcraft.burnout',
  recover: 'wordcraft.heatStamp.recover',
};

const TINT_FOR_BEAT: Record<HeatBeat, string> = {
  'enter-overdrive': 'bg-neo-orange text-neo-navy',
  'exit-overdrive': 'bg-neo-lime text-neo-navy',
  'enter-burnout': 'bg-neo-cyan text-neo-navy',
  recover: 'bg-neo-lime text-neo-navy',
};

const DISMISS_MS = 1200;

export function WordCraftHeatStamp({ beat, onDone }: Props) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!beat) return;
    const id = setTimeout(onDone, DISMISS_MS);
    return () => clearTimeout(id);
  }, [beat, onDone]);

  if (!beat) return null;
  const label = t(KEY_FOR_BEAT[beat]);
  const tint = TINT_FOR_BEAT[beat];

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
    >
      <div
        className={`animate-neo-pop rounded-neo border-neo-thick px-6 py-3 font-neo-display text-3xl font-black uppercase tracking-wider shadow-hard-lg ${tint}`}
      >
        {label}
      </div>
    </div>
  );
}
