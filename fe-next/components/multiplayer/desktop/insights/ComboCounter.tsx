import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemedPanel } from '../ThemedPanel';
import { cn } from '@/lib/utils';
import type { MpDesktopMode } from '../types';

interface ComboCounterProps {
  mode: MpDesktopMode;
  count: number;
  multiplier: number;
}

export function ComboCounter({ mode, count, multiplier }: ComboCounterProps) {
  const { t } = useLanguage();
  const prev = useRef<number>(count);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (count > prev.current) {
      setPulseKey(k => k + 1);
    }
    prev.current = count;
  }, [count]);

  return (
    <ThemedPanel mode={mode} variant="rail" header={t('mp.insights.comboCounterHeader')} testId="combo-counter">
      <div className="flex items-baseline gap-2 justify-center" data-testid="combo-display">
        <span
          key={pulseKey}
          className={cn(
            'text-3xl font-neo-display font-black tabular-nums',
            count > 0 ? 'text-neo-pink' : 'opacity-40',
            count > 0 && 'animate-combo-pulse',
          )}
        >
          ×{count}
        </span>
        {multiplier > 1 && (
          <span className="text-sm font-bold tabular-nums opacity-70">
            {multiplier.toFixed(1)}× {t('mp.insights.comboMultiplierSuffix')}
          </span>
        )}
      </div>
    </ThemedPanel>
  );
}
