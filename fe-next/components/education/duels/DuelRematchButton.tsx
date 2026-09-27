'use client';

/**
 * The REMATCH control — one button that carries the whole handshake.
 *
 * Round 3 had two states and no exit: tapping it created a duel the other
 * student had not agreed to, said "setting it up…", and left the kid on a
 * podium that never moved while their opponent sat in a different room. This
 * button never leaves a tap unanswered:
 *
 *   idle     → REMATCH (or NEW SERIES once the best-of-3 is decided)
 *   offered  → ACCEPT REMATCH, pulsing, with "{name} wants a rematch" above it
 *   pending  → WAITING FOR {name} · TAP TO CANCEL   ← the way out
 *   invited  → INVITE SENT TO THEIR LOBBY (they had already left)
 *
 * Still exactly one primary action at a time (decision-fatigue rule): the
 * button changes meaning, it does not multiply.
 */

import { useEffect, useRef } from 'react';
import { Swords, Hourglass, MailCheck, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import type { DuelRematchState } from '@/hooks/useDuelRematch';

export interface DuelRematchButtonProps {
  state: DuelRematchState;
  /** Who we are duelling — used in the waiting copy. */
  opponentName: string;
  /** Who asked, as the server named them (falls back to opponentName). */
  offeredByName?: string;
  seriesDecided?: boolean;
  onRematch: () => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Every state is a solid fill with a 3px black border. Written as
 * `border-[3px]` beside the colour on purpose: tailwind-merge puts `border-neo`
 * in the same group as `border-neo-black`, so `cn('border-neo','border-neo-black')`
 * DROPS the width and preflight renders the control borderless.
 */
const FILL: Record<DuelRematchState, string> = {
  idle: 'bg-neo-lime text-neo-black',
  offered: 'bg-neo-lime text-neo-black motion-safe:animate-pulse-subtle',
  pending: 'bg-neo-cyan text-neo-black',
  invited: 'bg-neo-purple text-neo-black',
};

export function DuelRematchButton({
  state,
  opponentName,
  offeredByName,
  seriesDecided = false,
  onRematch,
  onCancel,
  className,
}: DuelRematchButtonProps) {
  const { t } = useLanguage();
  const { playSound } = useSoundEffects();

  // One sting when the ask arrives — not on every re-render of the same offer.
  const announced = useRef(false);
  useEffect(() => {
    if (state !== 'offered') {
      announced.current = false;
      return;
    }
    if (announced.current) return;
    announced.current = true;
    playSound('mascotGasp', { volume: 0.5, requiresGameActive: false });
  }, [state, playSound]);

  const name = offeredByName || opponentName;

  const label =
    state === 'offered'
      ? t('education.duels.rematchAccept')
      : state === 'pending'
        ? t('education.duels.rematchWaiting', undefined, { name })
        : state === 'invited'
          ? t('education.duels.rematchInvited')
          : seriesDecided
            ? t('education.duels.newSeries')
            : t('education.duels.rematch');

  const Icon =
    state === 'pending' ? Loader2 : state === 'invited' ? MailCheck : state === 'offered' ? Hourglass : Swords;

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-stretch gap-1', className)}>
      {state === 'offered' && (
        <p
          data-testid="duel-rematch-note"
          className="truncate text-center font-neo-body text-[11px] font-black uppercase tracking-widest text-neo-lime"
        >
          {t('education.duels.rematchWants', undefined, { name })}
        </p>
      )}

      <button
        type="button"
        data-testid="duel-rematch-btn"
        data-state={state}
        aria-live={state === 'offered' ? 'polite' : undefined}
        onClick={state === 'pending' ? onCancel : state === 'invited' ? undefined : onRematch}
        className={cn(
          'inline-flex w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black px-4 py-3',
          'font-neo-display text-base font-black uppercase italic tracking-tight shadow-hard transition-all',
          'hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
          FILL[state]
        )}
      >
        <Icon
          className={cn('h-5 w-5 shrink-0', state === 'pending' && 'motion-safe:animate-spin')}
          aria-hidden="true"
        />
        <span className="truncate">{label}</span>
      </button>

      {state === 'pending' && (
        <p className="text-center font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-cream/80">
          {t('education.duels.rematchTapCancel')}
        </p>
      )}
    </div>
  );
}
