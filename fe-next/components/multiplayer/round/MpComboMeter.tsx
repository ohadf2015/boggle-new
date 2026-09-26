'use client';

import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import styles from './round.module.css';

export const COMBO_SEGMENTS = 5;

const SEG_COLOR = ['bg-neo-cyan', 'bg-neo-cyan', 'bg-neo-lime', 'bg-neo-yellow', 'bg-neo-pink'];

/**
 * Five-segment combo meter beside the score chip. Driven by the client combo
 * chain (display only — points always come from the server). Segments light
 * with a transform pop; transform + color only.
 */
function MpComboMeterImpl({ level, className }: { level: number; className?: string }) {
  const { t } = useLanguage();
  const lit = Math.max(0, Math.min(COMBO_SEGMENTS, level));
  return (
    <div
      data-testid="mp-combo-meter"
      data-level={lit}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={COMBO_SEGMENTS}
      aria-valuenow={lit}
      aria-label={t('mpUi.round.combo', { level: lit })}
      className={cn('flex items-end gap-[3px] h-[calc(22px*var(--mp-u,1))] lg:h-[calc(28px*var(--mp-u,1))]', className)}
    >
      {Array.from({ length: COMBO_SEGMENTS }, (_, i) => {
        const on = i < lit;
        return (
          <span
            key={on ? `on-${i}` : `off-${i}`}
            className={cn(
              'block w-[calc(5px*var(--mp-u,1))] rounded-[2px] border border-neo-black',
              on ? cn(SEG_COLOR[i], styles.segPop) : 'bg-neo-navy-light',
            )}
            style={{ height: `${40 + i * 15}%` }}
          />
        );
      })}
    </div>
  );
}

export const MpComboMeter = memo(MpComboMeterImpl);
MpComboMeter.displayName = 'MpComboMeter';
