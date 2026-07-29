'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  /** Stable key used to dedupe repeated triggers of the same upgrade/type. */
  dedupeKey: string;
  icon: string;
  message: string;
  type: 'upgrade' | 'themed';
}

let _seq = 0;

const THEMED_DEDUPE_KEY = 'themed';

export function AdventureToast({
  upgradeTriggered,
  lastWordWasThemed,
}: AdventureToastProps) {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = dismissTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      dismissTimersRef.current.delete(id);
    }
  }, []);

  // Replace any existing toast with the same dedupeKey — rapid repeats of the
  // same upgrade (e.g. collecting gold on consecutive words) must not stack.
  const pushToast = useCallback((next: ToastItem, autoDismissMs: number) => {
    setToasts(prev => {
      const filtered = prev.filter(t => t.dedupeKey !== next.dedupeKey);
      // Cancel the timer for any toast we're replacing so it can't dismiss the new one.
      for (const t of prev) {
        if (t.dedupeKey === next.dedupeKey) {
          const existing = dismissTimersRef.current.get(t.id);
          if (existing) {
            clearTimeout(existing);
            dismissTimersRef.current.delete(t.id);
          }
        }
      }
      return [...filtered, next];
    });
    const timer = setTimeout(() => dismiss(next.id), autoDismissMs);
    dismissTimersRef.current.set(next.id, timer);
  }, [dismiss]);

  useEffect(() => {
    if (!upgradeTriggered) return;
    const effect = getUpgradeVisualEffect(upgradeTriggered.upgradeId);
    if (!effect) return;
    pushToast(
      {
        id: `upg-${++_seq}`,
        dedupeKey: `upg-${upgradeTriggered.upgradeId}`,
        icon: effect.hudIcon,
        message: t(effect.triggerToastKey),
        type: 'upgrade',
      },
      2000,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgradeTriggered]);

  useEffect(() => {
    if (!lastWordWasThemed) return;
    pushToast(
      {
        id: `themed-${++_seq}`,
        dedupeKey: THEMED_DEDUPE_KEY,
        icon: '🌿',
        message: t('adventure.toast.themedWord'),
        type: 'themed',
      },
      1500,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastWordWasThemed]);

  // Clean up pending dismiss timers on unmount.
  useEffect(() => {
    const timers = dismissTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return (
    <div className="fixed bottom-[calc(6rem+var(--admob-banner-height,0px))] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none">
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
            <span className="me-1" aria-hidden="true">{toast.icon}</span>
            {toast.message}
          </AdaptiveMotion.div>
        ))}
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default AdventureToast;
