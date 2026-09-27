'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface SoloComboMeterProps {
  streak: number;
  multiplier: number;
  praiseKey: string | null;
}

/** Compact xN + streak readout. Hidden until the chain is actually going. */
export function SoloComboMeter({ streak, multiplier, praiseKey }: SoloComboMeterProps) {
  const { t } = useLanguage();
  if (streak < 2) return null;

  return (
    <div
      data-testid="solo-combo-meter"
      className="inline-flex max-w-full items-center gap-2 self-center rounded-neo border-2 border-neo-lime bg-neo-navy-light px-2 py-0.5"
    >
      <span dir="ltr" className="text-xs font-black text-neo-lime">
        {t('singlePlayer.combo.multiplier', { mult: multiplier })}
      </span>
      <span dir="ltr" data-testid="solo-combo-streak" className="text-xs font-black text-neo-white">
        {streak}
      </span>
      {praiseKey ? (
        <span className="truncate text-[10px] font-black uppercase tracking-wide text-neo-lime">
          {t(praiseKey)}
        </span>
      ) : null}
    </div>
  );
}
