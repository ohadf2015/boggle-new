'use client';

import { memo } from 'react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export type InputMode = 'drag' | 'click' | 'keyboard' | 'idle';

interface InputModeIndicatorProps {
  activeMode: InputMode;
}

/**
 * InputModeIndicator - Shows which input method is currently active.
 * Three small pills in the grid's corner: drag, click, type.
 * Only visible on desktop (md+).
 */
const InputModeIndicator = memo<InputModeIndicatorProps>(({ activeMode }) => {
  const { t } = useLanguageSafe();

  const modes: { key: InputMode; labelKey: string }[] = [
    { key: 'drag', labelKey: 'inputMode.drag' },
    { key: 'click', labelKey: 'inputMode.click' },
    { key: 'keyboard', labelKey: 'inputMode.type' },
  ];

  return (
    <div
      className="hidden md:flex items-center gap-1 absolute bottom-1 inset-e-1 z-20 pointer-events-none"
      aria-hidden="true"
    >
      {modes.map(({ key, labelKey }) => (
        <span
          key={key}
          className={cn(
            'px-1.5 py-0.5 text-[10px] font-bold rounded-neo border border-neo-black/40 transition-all duration-200',
            activeMode === key
              ? 'bg-neo-yellow text-neo-black border-neo-black opacity-100'
              : 'bg-neo-cream/60 text-neo-black/40 opacity-50'
          )}
        >
          {t(labelKey)}
        </span>
      ))}
    </div>
  );
});

InputModeIndicator.displayName = 'InputModeIndicator';

export default InputModeIndicator;
