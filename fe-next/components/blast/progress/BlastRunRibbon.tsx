'use client';

import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRunLadder } from './runLadder';
import { THEME_ICON, accentColor, getWaveTheme } from './waveTheme';

const STEPS = 4;

/** Wave N plus the themed waves ahead, so the next level is always in view. */
export function BlastRunRibbon({ wave, recordWave }: { wave: number; recordWave: number }) {
  const { t } = useLanguage();
  const steps = buildRunLadder({ currentWave: wave, count: STEPS, recordWave, themeFor: getWaveTheme });

  return (
    <ol
      data-testid="blast-run-ribbon"
      aria-label={t('blastProgress.runLabel', { wave })}
      className="flex shrink-0 items-center gap-1"
    >
      {steps.map((step) => {
        const Icon = THEME_ICON[step.theme.id];
        const accent = accentColor(step.theme);
        return (
          <li
            key={step.wave}
            data-testid="blast-ribbon-step"
            data-theme={step.theme.id}
            data-current={step.current ? 'true' : 'false'}
            data-record={step.newRecord ? 'true' : 'false'}
            className={cn(
              'relative flex items-center justify-center rounded-md border-2 border-neo-black font-neo-display font-black tabular-nums',
              step.current
                ? 'h-6 gap-0.5 px-1.5 text-[11px] text-neo-black shadow-hard-sm tv:h-9 tv:text-base'
                : 'h-5 w-5 text-[0px] opacity-80 tv:h-7 tv:w-7',
            )}
            style={step.current ? { backgroundColor: accent } : { borderColor: accent }}
          >
            <Icon className={cn('shrink-0', step.current ? 'h-3.5 w-3.5 tv:h-5 tv:w-5' : 'h-3 w-3 tv:h-4 tv:w-4')} style={step.current ? undefined : { color: accent }} strokeWidth={3} aria-hidden="true" />
            {step.wave}
            {step.newRecord && (
              <Flag className="absolute -end-1 -top-1.5 h-3 w-3 text-neo-yellow" fill="currentColor" strokeWidth={2.5} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
