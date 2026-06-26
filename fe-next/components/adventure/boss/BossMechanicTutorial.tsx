/**
 * BossMechanicTutorial Component
 *
 * Shows a brief tooltip when a player first encounters a boss mechanic twist.
 * Displayed once per twist type (tracked in localStorage).
 * Neo-brutalist design, uses AdaptiveMotion.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { BossTwistType } from '@/types/boss';

// ==============================================
// TYPES
// ==============================================

export interface BossMechanicTutorialProps {
  /** Which boss mechanic is being shown */
  twistType: BossTwistType;
  /** Whether the tutorial is visible */
  isVisible: boolean;
  /** Called when player dismisses the tutorial */
  onDismiss: () => void;
}

// ==============================================
// TWIST TYPE ICONS
// ==============================================

const TWIST_ICONS: Record<BossTwistType, string> = {
  popQuiz: '📝',
  hiveMind: '🐝',
  etymologyDig: '🏛️',
  idiomBattle: '⚓',
  assemblyLine: '⚙️',
  scrambledReality: '🔀',
  mirrorMatch: '🪞',
  stellarForge: '⭐',
  babelSummit: '🗼',
  finalWord: '🐉',
};

// ==============================================
// COMPONENT
// ==============================================

export const BossMechanicTutorial = memo<BossMechanicTutorialProps>(({
  twistType,
  isVisible,
  onDismiss,
}) => {
  const { t } = useLanguage();
  const icon = TWIST_ICONS[twistType] ?? '❓';

  return (
    <AdaptiveAnimatePresence>
      {isVisible && (
        <AdaptiveMotion.div
          data-testid="boss-mechanic-tutorial"
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className={cn(
            'fixed inset-x-4 top-[env(safe-area-inset-top,0px)] z-50 mt-4',
            'md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-96',
            'bg-neo-navy border-3 border-neo-yellow rounded-neo shadow-hard-lg',
            'p-4'
          )}
          role="dialog"
          aria-modal="false"
          aria-labelledby="boss-tutorial-title"
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl shrink-0" aria-hidden="true">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-neo-yellow text-xs font-bold uppercase tracking-wide mb-0.5">
                {t('adventure.bosses.newMechanic')}
              </p>
              <h3
                id="boss-tutorial-title"
                className="text-neo-white font-neo-display font-bold text-base leading-tight"
              >
                {t(`adventure.bosses.twist.${twistType}.name`)}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-neo-white text-sm font-bold mb-3 leading-relaxed">
            {t(`adventure.bosses.twist.${twistType}.desc`)}
          </p>

          {/* Tip */}
          <div className="mb-4 px-3 py-2 bg-neo-cyan/10 border-2 border-neo-cyan/30 rounded-neo">
            <p className="text-neo-cyan text-xs font-bold">
              💡 {t(`adventure.bosses.twist.${twistType}.tip`)}
            </p>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onDismiss}
            aria-label={t('adventure.bosses.tutorialGotIt')}
            className={cn(
              'w-full py-2.5 px-4',
              'bg-neo-yellow text-neo-black font-black text-sm',
              'border-3 border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
              'active:translate-y-0.5 active:shadow-hard-pressed',
              'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              'transition-all duration-200'
            )}
          >
            {t('adventure.bosses.tutorialGotIt')}
          </button>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

BossMechanicTutorial.displayName = 'BossMechanicTutorial';

export default BossMechanicTutorial;
