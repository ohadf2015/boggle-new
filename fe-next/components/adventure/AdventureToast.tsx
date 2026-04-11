'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUpgradeVisualEffect } from '@/lib/adventure/upgradeEffects';

interface AdventureToastProps {
  upgradeTriggered: { upgradeId: string; effectValue: number } | null;
  lastWordWasThemed: boolean;
  themedBonusMultiplier?: number;
}

interface ToastItem {
  id: string;
  icon: string;
  message: string;
  type: 'upgrade' | 'themed';
}

let _seq = 0;

export function AdventureToast({
  upgradeTriggered,
  lastWordWasThemed,
}: AdventureToastProps) {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (!upgradeTriggered) return;
    const effect = getUpgradeVisualEffect(upgradeTriggered.upgradeId);
    if (!effect) return;
    const id = `upg-${++_seq}`;
    setToasts(prev => [...prev, { id, icon: effect.hudIcon, message: t(effect.triggerToastKey), type: 'upgrade' }]);
    const timer = setTimeout(() => dismiss(id), 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeTriggered]);

  useEffect(() => {
    if (!lastWordWasThemed) return;
    const id = `themed-${++_seq}`;
    setToasts(prev => [...prev, { id, icon: '🌿', message: t('adventure.toast.themedWord'), type: 'themed' }]);
    const timer = setTimeout(() => dismiss(id), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastWordWasThemed]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
      <AdaptiveAnimatePresence>
        {toasts.map(toast => (
          <AdaptiveMotion.div
            key={toast.id}
            initial={{ y: -16, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            role="status"
            aria-live="polite"
            className={[
              'rounded-neo border-neo shadow-hard-sm px-3 py-1.5 text-sm font-neo-display whitespace-nowrap',
              toast.type === 'upgrade'
                ? 'bg-neo-purple/90 text-neo-white'
                : 'bg-neo-lime/90 text-neo-navy',
            ].join(' ')}
          >
            <span className="mr-1">{toast.icon}</span>
            {toast.message}
          </AdaptiveMotion.div>
        ))}
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default AdventureToast;
