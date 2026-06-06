'use client';

import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  heat: number;
  maxHeat: number;
}

const SEGMENT_COLORS = [
  'bg-neo-purple',
  'bg-neo-orange',
  'bg-neo-red',
] as const;

export function AlchemyHeatBar({ heat, maxHeat }: Props) {
  const { t } = useLanguage();
  const isRush = heat >= maxHeat;

  return (
    <div
      aria-label={isRush ? t('wordAlchemy.heat.rushAria') : t('wordAlchemy.heat.label')}
      className="flex items-center justify-center gap-2"
    >
      <Flame
        className={`h-4 w-4 transition-colors ${isRush ? 'text-neo-red animate-neo-wobble' : 'text-neo-white/40'}`}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <div className="flex gap-1.5">
        {Array.from({ length: maxHeat }).map((_, i) => (
          <div
            key={i}
            className={`h-3 w-8 rounded-full border-2 border-black transition-all duration-300 ${
              i < heat
                ? `${SEGMENT_COLORS[Math.min(i, SEGMENT_COLORS.length - 1)]} shadow-hard-sm`
                : 'bg-neo-navy-light'
            }`}
          />
        ))}
      </div>
      {isRush && (
        <span
          className="rounded-neo border-2 border-black bg-neo-red px-2 py-0.5 font-neo-display font-black text-[10px] uppercase tracking-wide text-neo-white shadow-hard-sm animate-neo-pop motion-reduce:animate-none"
        >
          {t('wordAlchemy.heat.rush')}
        </span>
      )}
    </div>
  );
}
