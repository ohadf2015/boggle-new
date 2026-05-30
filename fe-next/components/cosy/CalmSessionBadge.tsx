'use client';

import React from 'react';
import { Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCosyMode } from '@/contexts/AccessibilityContext';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * A quiet "Calm · no rush" cue shown on the single-player game HUD while Cozy /
 * Calm Mode is active. It reassures the player that the absence of countdown
 * beeps, urgent music, and the time-low ad nag is *intentional calm* — not a
 * broken timer — and reinforces the unhurried feel.
 *
 * Renders nothing when cosy is off, so it is safe to drop into any game layout.
 * Presentational status (role="status"), never interactive.
 */
export const CalmSessionBadge: React.FC<{ className?: string }> = ({ className }) => {
  const cosyMode = useCosyMode();
  const { t } = useLanguage();

  if (!cosyMode) return null;

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 select-none',
        'px-3 py-1 rounded-full',
        'bg-neo-cozy-light/70 text-neo-black',
        'text-xs font-neo-body font-medium tracking-wide',
        'shadow-sm',
        className,
      )}
    >
      <Leaf className="h-3.5 w-3.5" aria-hidden />
      {t('cosy.noRush')}
    </span>
  );
};

export default CalmSessionBadge;
