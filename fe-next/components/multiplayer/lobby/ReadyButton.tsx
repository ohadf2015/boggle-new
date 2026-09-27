'use client';

import { Check, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './lobby.module.css';

type T = (path: string, params?: Record<string, string | number>) => string;

/**
 * The joiner's footer primary: a big READY toggle. Resting = the lobby's one
 * solid-lime CTA asking for the tap; once ready it steps down to a lime outline
 * with a check that stamps on (tap again to un-ready). It is advisory — the
 * host can start whenever they like.
 */
export function ReadyButton({
  isReady, onToggle, inFlight, t, className,
}: { isReady: boolean; onToggle: () => void; inFlight: boolean; t: T; className?: string }) {
  return (
    <button
      type="button"
      data-testid="ready-button"
      onClick={onToggle}
      disabled={inFlight}
      aria-pressed={isReady}
      className={cn(
        'relative w-full h-[calc(64px*var(--mp-u,1))] flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black',
        'font-neo-display text-xl tv:text-3xl font-bold uppercase tracking-wide shadow-hard transition-[transform,background-color] duration-150',
        'active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isReady ? 'bg-neo-navy text-neo-lime border-neo-lime hover:bg-neo-lime/10' : 'bg-neo-lime text-neo-black hover:brightness-110',
        className,
      )}
    >
      {isReady ? (
        <Check key="on" aria-hidden="true" className={cn('w-7 h-7 stroke-[3.5]', styles.stamp)} />
      ) : (
        <Zap aria-hidden="true" className="w-6 h-6" />
      )}
      <span>{isReady ? t('playerView.readyConfirmed') : t('playerView.readyUp')}</span>
    </button>
  );
}
