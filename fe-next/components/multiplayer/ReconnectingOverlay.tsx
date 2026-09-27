'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
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

/** Attempts before the way back is offered, whatever the clock says. */
const GIVE_UP_THRESHOLD = 3;
/** Seconds before the way back is offered, whatever the attempt count says. */
const GIVE_UP_AFTER_SEC = 8;

function useElapsedSeconds(): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return elapsed;
}

/**
 * In-place reconnect state (DESIGN §b.8): dims the CURRENT screen — the board
 * stays underneath, frozen by the overlay — and never changes the route. It
 * appears statically (no entrance fade on a full-screen layer, no backdrop
 * blur); only the spinner moves, and not under reduced motion.
 */
export function ReconnectingOverlay({ attempt, maxAttempts, onGiveUp, isServerUpdating }: Props) {
  const { t } = useLanguage();
  const elapsed = useElapsedSeconds();

  // Planned deploy: don't block the player. Calm top banner, no backdrop, no
  // give-up button (the reconnect is automatic and short).
  if (isServerUpdating) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-[calc(env(safe-area-inset-top,0px)+4rem)] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      >
        <div className="flex items-center gap-3 bg-neo-cyan border-3 border-neo-black rounded-neo px-5 py-3 shadow-hard animate-mp-drop">
          <div
            className="w-5 h-5 rounded-full border-3 border-neo-black border-t-transparent motion-safe:animate-spin shrink-0"
            aria-hidden="true"
          />
          <div className="flex flex-col text-start">
            <p className="font-neo-display text-sm font-bold text-neo-black">{t('connection.serverUpdating')}</p>
            <p className="font-neo-body text-xs text-neo-black/80">{t('connection.serverUpdatingHint')}</p>
          </div>
        </div>
      </div>
    );
  }

  const canGiveUp = attempt >= GIVE_UP_THRESHOLD || elapsed >= GIVE_UP_AFTER_SEC;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('mp.reconnect.title')}
      data-testid="reconnecting-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neo-navy/85 px-4"
    >
      <div className="relative flex flex-col items-center gap-4 w-full max-w-[calc(360px*var(--mp-u,1))] rounded-neo-lg border-4 border-neo-black bg-neo-navy-light px-6 py-7 text-center shadow-hard-lg animate-mp-drop">
        <div className="relative w-16 h-16" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border-4 border-neo-cyan/25" />
          <div className="absolute inset-0 rounded-full border-4 border-neo-cyan border-t-transparent motion-safe:animate-spin" />
          <WifiOff className="absolute inset-0 m-auto w-6 h-6 text-neo-cyan" />
        </div>
        <p className="font-neo-display text-2xl font-bold uppercase tracking-tight text-neo-white">
          {t('mp.reconnect.title')}
        </p>
        <div className="flex items-center gap-2 font-neo-body text-sm text-neo-white">
          <span
            data-testid="reconnect-elapsed"
            className="rounded-full border-2 border-neo-black bg-neo-cyan px-3 py-0.5 font-neo-display font-bold tabular-nums text-neo-black"
          >
            {t('mpUi.entry.reconnectElapsed', { seconds: elapsed })}
          </span>
          <span className="opacity-80">
            {t('mp.reconnect.attempt')} {attempt}/{maxAttempts}
          </span>
        </div>
        {canGiveUp && (
          <button
            type="button"
            onClick={onGiveUp}
            aria-label={t('mp.reconnect.giveUp')}
            className="mt-1 min-h-11 px-5 py-2 rounded-neo border-2 border-neo-black bg-neo-navy font-neo-display text-sm font-bold uppercase tracking-wide text-neo-white shadow-hard-sm active:translate-y-0.5 active:shadow-hard-pressed animate-mp-drop focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
          >
            {t('mp.reconnect.giveUp')}
          </button>
        )}
      </div>
    </div>
  );
}
