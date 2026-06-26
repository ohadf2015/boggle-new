'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  attempt: number;
  maxAttempts: number;
  onGiveUp: () => void;
  /** True during a planned server restart (deploy). Renders a calm, NON-blocking
   *  banner so the board stays visible/interactive — the gap is brief and game
   *  state is preserved server-side, so there's no need to seize the screen. */
  isServerUpdating?: boolean;
}

const GIVE_UP_THRESHOLD = 3;

export function ReconnectingOverlay({ attempt, maxAttempts, onGiveUp, isServerUpdating }: Props){
  const { t } = useLanguage();

  // Planned deploy: don't block the player. Calm top banner, no backdrop, no
  // give-up button (the reconnect is automatic and short).
  if (isServerUpdating) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-[calc(env(safe-area-inset-top,0px)+4rem)] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3 bg-neo-cyan border-3 border-neo-black rounded-neo px-5 py-3 shadow-hard animate-neo-pop">
          <div
            className="w-5 h-5 rounded-full border-3 border-neo-black border-t-transparent animate-spin shrink-0"
            aria-hidden="true"
          />
          <div className="flex flex-col text-left">
            <p className="font-neo-display text-sm font-bold text-neo-black">
              {t('connection.serverUpdating')}
            </p>
            <p className="font-neo-body text-xs text-neo-black/80">
              {t('connection.serverUpdatingHint')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('mp.reconnect.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 px-8 py-10 max-w-sm w-full text-center">
        <div
          className="w-12 h-12 rounded-full border-4 border-neo-cyan border-t-transparent animate-spin"
          aria-hidden="true"
        />
        <div className="flex flex-col gap-2">
          <p className="font-neo-display text-xl font-bold text-neo-white">
            {t('mp.reconnect.title')}
          </p>
          <p className="font-neo-body text-neo-white text-sm">
            {t('mp.reconnect.attempt')} {attempt}/{maxAttempts}
          </p>
        </div>
        {attempt >= GIVE_UP_THRESHOLD && (
          <button
            type="button"
            onClick={onGiveUp}
            aria-label={t('mp.reconnect.giveUp')}
            className="px-5 py-2 font-neo-body text-sm text-neo-white border border-neo-white/20 rounded-neo hover:border-neo-white/40 transition-colors"
          >
            {t('mp.reconnect.giveUp')}
          </button>
        )}
      </div>
    </div>
  );
}
