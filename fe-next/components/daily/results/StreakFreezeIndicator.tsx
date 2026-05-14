'use client';

/**
 * StreakFreezeIndicator
 *
 * Shows available streak freeze shields and active protection status
 * in the Daily Challenge results screen.
 */

import React from 'react';
import { m } from 'framer-motion';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StreakFreezeIndicatorProps {
  freezesAvailable: number;
  isProtected: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const StreakFreezeIndicator: React.FC<StreakFreezeIndicatorProps> = ({
  freezesAvailable,
  isProtected,
  t,
}) => {
  if (freezesAvailable === 0 && !isProtected) return null;

  const label = isProtected
    ? t('streak.freezeShieldActive')
    : freezesAvailable === 1
      ? t('streak.freezeShields', { count: freezesAvailable })
      : t('streak.freezeShields_plural', { count: freezesAvailable });

  const isActive = isProtected;

  return (
    <m.div
      data-testid="streak-freeze-indicator"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 300, damping: 26 }}
      className={cn(
        'flex items-start gap-2.5 px-3 py-2 rounded-neo border-3 shadow-hard-sm',
        isActive
          ? 'bg-neo-lime/10 border-neo-lime/40 text-neo-lime'
          : 'bg-blue-500/10 border-blue-400/30 text-blue-300'
      )}
    >
      {/* Shield icon */}
      <div
        data-testid="shield-icon"
        className={cn(
          'mt-0.5 shrink-0',
          isActive ? 'text-neo-lime' : 'text-blue-400'
        )}
      >
        {/* Pip dots for freeze count */}
        <div className="relative">
          <Shield className="w-4 h-4" />
          {!isActive && freezesAvailable > 0 && (
            <span className="absolute -top-1.5 -inset-e-1.5 text-[9px] font-black leading-none bg-blue-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
              {freezesAvailable}
            </span>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0">
        <div className={cn(
          'text-xs font-black uppercase tracking-wide',
          isActive ? 'text-neo-lime' : 'text-blue-300'
        )}>
          {label}
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
          {t('streak.freezeShieldHint')}
        </div>
      </div>
    </m.div>
  );
};

export default StreakFreezeIndicator;
