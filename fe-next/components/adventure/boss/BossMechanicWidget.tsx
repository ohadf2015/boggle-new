/**
 * BossMechanicWidget Component
 *
 * Persistent widget showing current boss mechanic requirement during battle.
 * Displays a progress bar toward mechanic completion and bonus multiplier preview.
 * Styled per world theme via useBossFightTheme().
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

// ==============================================
// TYPES
// ==============================================

export interface BossMechanicWidgetProps {
  /** Translation key for mechanic name */
  mechanicName: string;
  /** Progress toward completion (0-1) */
  progress: number;
  /** Target count for mechanic */
  target: number;
  /** Current count achieved */
  current: number;
  /** Bonus multiplier (>1 means bonus active) */
  bonusMultiplier: number;
  /** Whether widget is active/visible */
  isActive: boolean;
}

// ==============================================
// COMPONENT
// ==============================================

const BossMechanicWidget = memo<BossMechanicWidgetProps>(({
  mechanicName,
  progress,
  target,
  current,
  bonusMultiplier,
  isActive,
}) => {
  const { t } = useLanguage();
  const bossFightTheme = useBossFightTheme();

  if (!isActive) return null;

  const progressPct = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const showMultiplier = bonusMultiplier > 1;

  return (
    <motion.div
      data-testid="boss-mechanic-widget"
      className={`
        ${bossFightTheme.dialogueBg}
        border-3 ${bossFightTheme.dialogueBorder}
        rounded-neo shadow-hard-sm
        px-3 py-2
        pointer-events-none
      `.trim().replace(/\s+/g, ' ')}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Header: mechanic name + bonus multiplier */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-neo-display text-xs font-bold text-neo-white/90 uppercase tracking-wide truncate">
          {t(mechanicName) || mechanicName}
        </span>
        {showMultiplier && (
          <span
            data-testid="bonus-multiplier"
            className="font-neo-display text-xs font-bold text-neo-yellow ml-2 flex-shrink-0"
          >
            {Math.floor(bonusMultiplier)}x
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('adventure.bosses.mechanicProgress') || 'Mechanic progress'}
        className="relative w-full h-3 bg-neo-navy-light border-2 border-neo-black rounded-full overflow-hidden"
      >
        <motion.div
          className={`absolute inset-y-0 left-0 ${bossFightTheme.telegraphProgressColor} rounded-full`}
          initial={{ width: '0%' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        />
      </div>

      {/* Count display */}
      <div className="flex justify-end mt-1">
        <span className="font-mono text-xs font-bold text-neo-white/60 tabular-nums">
          {current} / {target}
        </span>
      </div>
    </motion.div>
  );
});

BossMechanicWidget.displayName = 'BossMechanicWidget';

export default BossMechanicWidget;
