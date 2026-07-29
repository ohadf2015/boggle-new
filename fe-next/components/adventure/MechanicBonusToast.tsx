'use client';

import { memo, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** Auto-dismiss delay (ms) */
const AUTO_DISMISS_MS = 1800;

export interface MechanicBonusData {
  id: number;
  feedbackKey: string;
  multiplier: number;
}

interface MechanicBonusToastProps {
  bonus: MechanicBonusData | null;
  onDismiss: () => void;
  /**
   * When true, renders below the boss HUD + dialogue strip so it does not
   * overlap the boss HP bar (which occupies top-12 .. top-28 during boss fights).
   */
  bossActive?: boolean;
}

export const MechanicBonusToast = memo(function MechanicBonusToast({
  bonus,
  onDismiss,
  bossActive = false,
}: MechanicBonusToastProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!bonus) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [bonus, onDismiss]);

  return (
    <AdaptiveAnimatePresence>
      {bonus && (
        <AdaptiveMotion.div
          key={bonus.id}
          initial={{ y: -20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -10, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`fixed ${bossActive ? 'top-44 sm:top-48' : 'top-20'} left-1/2 -translate-x-1/2 z-30 rounded-neo border-neo px-3 py-1.5 bg-neo-purple/90 border-neo-purple-light shadow-hard-sm`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-neo-purple-light shrink-0" />
            <span className="text-xs font-bold text-neo-white whitespace-nowrap">
              {t(bonus.feedbackKey)}
            </span>
            <span className="text-xs font-black text-neo-purple-light">
              {Math.round(bonus.multiplier * 100 - 100)}%
            </span>
          </div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
});

MechanicBonusToast.displayName = 'MechanicBonusToast';
export default MechanicBonusToast;
