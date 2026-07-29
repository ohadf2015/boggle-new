/**
 * WordHuntDangerToast — real-time danger/elimination/last-standing toasts
 * for Word Hunt multiplayer mode.
 *
 * Props-driven: parent manages toast state via useWordHuntDangerAlerts hook.
 * Max 3 visible, newest on top, auto-dismiss after 3s.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

export interface DangerToast {
  id: string;
  type: 'danger' | 'eliminated' | 'lastStanding' | 'lowLifeSelf';
  playerName?: string;
  count?: number;
  timestamp: number;
}

interface WordHuntDangerToastProps {
  toasts: DangerToast[];
  onDismiss: (id: string) => void;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3000;

const TOAST_STYLES: Record<DangerToast['type'], string> = {
  danger: 'bg-yellow-500/90 border-yellow-700 text-black',
  eliminated: 'bg-neo-red/90 border-red-800 text-white',
  lastStanding: 'bg-neo-purple/90 border-purple-800 text-white',
  // Self low-life: orange = urgency (design-system semantic), distinct from the
  // yellow opponent-danger toast so the player reads it as "act now".
  lowLifeSelf: 'bg-neo-orange/90 border-orange-800 text-black',
};

const TOAST_ICONS: Record<DangerToast['type'], string> = {
  danger: '\u26A0\uFE0F',
  eliminated: '\uD83D\uDC80',
  lastStanding: '\u2694\uFE0F',
  lowLifeSelf: '\u2764\uFE0F',
};

function ToastItem({ toast, onDismiss }: { toast: DangerToast; onDismiss: (id: string) => void }) {
  const { t } = useLanguage();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [toast.id, onDismiss]);

  let message: string;
  switch (toast.type) {
    case 'danger':
      message = t('wordHunt.dangerAlert', { name: toast.playerName || '' });
      break;
    case 'eliminated':
      message = t('wordHunt.eliminatedAlert', { name: toast.playerName || '' });
      break;
    case 'lastStanding':
      message = t('wordHunt.lastStanding', { count: toast.count || 2 });
      break;
    case 'lowLifeSelf':
      message = t('wordHunt.lowLifeSelf');
      break;
  }

  return (
    <div
      data-toast-type={toast.type}
      className={`flex items-center gap-2 px-4 py-2 rounded-neo border-neo font-neo-body text-sm font-bold shadow-hard-sm ${TOAST_STYLES[toast.type]}`}
    >
      <span>{TOAST_ICONS[toast.type]}</span>
      <span>{message}</span>
    </div>
  );
}

export function WordHuntDangerToast({ toasts, onDismiss }: WordHuntDangerToastProps) {
  // Show only newest MAX_VISIBLE toasts
  const visible = toasts.length > MAX_VISIBLE
    ? toasts.slice(toasts.length - MAX_VISIBLE)
    : toasts;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AdaptiveAnimatePresence>
        {visible.map((toast) => (
          <AdaptiveMotion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ToastItem toast={toast} onDismiss={onDismiss} />
          </AdaptiveMotion.div>
        ))}
      </AdaptiveAnimatePresence>
    </div>
  );
}
