'use client';

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { RivalMarker } from '@/lib/wordTower/rivals';
import { WordTowerSmashScene } from './WordTowerSmashScene';

interface Props {
  tokens: number;
  rivals: RivalMarker[];
  pickerOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSend: (rivalId: string, rivalName: string) => void;
  /** The most recent hit — drives the wrecking-ball animation + toast. */
  lastHit: { id: string; targetName: string; targetId: string } | null;
  onDismissHit: () => void;
  earnedToast: number | null;
  onDismissEarned: () => void;
  /** Reward-ad path: defined when a watch-ad CTA is available. */
  onWatchAdForToken?: () => void;
  adLoading?: boolean;
  adEarnedToast?: boolean;
  onDismissAdEarned?: () => void;
  /** Render the chip/CTA/toasts in normal flow (inside the play screen's left
   *  utility rail) instead of self-positioning absolutely. The picker + smash
   *  overlays stay absolute either way. */
  inline?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion?: boolean;
}

/**
 * WordTowerSabotageBay — the wrecking-ball UI.
 *
 * - HUD chip showing token count (click to open picker)
 * - Full-screen rival picker overlay (cards with avatar/name/height)
 * - Wrecking-ball animation (CSS keyframe) when a hit lands
 * - Earn toast when a fresh token drops in
 *
 * Backend cross-player persistence is deferred — local hits only show on the
 * sender's view today (see memory note for the API/table follow-up).
 */
export function WordTowerSabotageBay({
  tokens,
  rivals,
  pickerOpen,
  onOpen,
  onClose,
  onSend,
  lastHit,
  onDismissHit,
  earnedToast,
  onDismissEarned,
  onWatchAdForToken,
  adLoading,
  adEarnedToast,
  onDismissAdEarned,
  inline,
  t,
  reducedMotion,
}: Props) {
  const [smashTarget, setSmashTarget] = useState<RivalMarker | null>(null);

  // Transition from picker → smash scene: pick a rival, close picker, open scene
  const handlePickRival = useCallback((rival: RivalMarker) => {
    setSmashTarget(rival);
    onClose();
  }, [onClose]);

  // Smash scene done: commit the hit and clear the overlay
  const handleSmashDone = useCallback(() => {
    if (smashTarget) {
      onSend(smashTarget.id, smashTarget.name);
      setSmashTarget(null);
    }
  }, [smashTarget, onSend]);
  // Auto-dismiss the earn toast after 2.6s — long enough to read, short enough
  // not to crowd the next action.
  useEffect(() => {
    if (earnedToast == null) return;
    const id = setTimeout(onDismissEarned, 2600);
    return () => clearTimeout(id);
  }, [earnedToast, onDismissEarned]);

  // Auto-dismiss the sent-hit toast after the wrecking ball animation + a beat.
  useEffect(() => {
    if (!lastHit) return;
    const id = setTimeout(onDismissHit, 2200);
    return () => clearTimeout(id);
  }, [lastHit, onDismissHit]);

  // Auto-dismiss the ad-earn toast.
  useEffect(() => {
    if (!adEarnedToast) return;
    const id = setTimeout(() => onDismissAdEarned?.(), 2600);
    return () => clearTimeout(id);
  }, [adEarnedToast, onDismissAdEarned]);

  const hasTokens = tokens > 0;

  return (
    <>
      {/* Floating token chip — sits in the TOP section on the start side, just
          under the header (founder ask: "the wrecking ball should show on top and
          not in the bottom section when it exists"). Tap to open the picker. ONLY
          shown when tokens > 0 ("the wrecking ball should only show on the screen
          when the player has it"). */}
      {hasTokens && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={t('wordTower.sabotage.chip')}
          className={cn(
            'pointer-events-auto flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-pink px-2.5 py-1.5 font-neo-display text-sm font-black uppercase text-neo-white shadow-hard transition-transform hover:scale-105 active:translate-y-px',
            !inline && 'absolute start-3 top-16 z-40',
            !reducedMotion && 'animate-neo-pop',
          )}
        >
          <span aria-hidden>🎯</span>
          {/* Inline (left-rail) mode keeps the chip icon-first so centred notice
              banners never collide with a wide label on narrow phones. */}
          <span className={cn(inline && 'hidden sm:inline')}>{t('wordTower.sabotage.chip')}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full border border-black bg-neo-yellow px-1 font-neo-display text-[11px] font-black text-black">
            {tokens}
          </span>
        </button>
      )}

      {/* Watch-Ad CTA — cyan secondary action, only when ad is available and
          tokens are below cap. Positioned below the spend chip when it exists,
          or at the chip position if the chip is hidden (tokens === 0). */}
      {onWatchAdForToken && (
        <button
          type="button"
          onClick={adLoading ? undefined : onWatchAdForToken}
          disabled={adLoading}
          aria-label={t('wordTower.sabotage.watchAd')}
          className={cn(
            'pointer-events-auto flex items-center gap-1 rounded-neo border-neo border-black px-2 py-1 font-neo-display text-xs font-bold uppercase shadow-hard transition-transform',
            !inline && 'absolute start-3 z-40',
            !inline && (hasTokens ? 'top-28' : 'top-16'),
            adLoading
              ? 'bg-neo-navy/60 text-neo-white/40'
              : 'bg-neo-cyan text-black hover:scale-105 active:translate-y-px',
            !adLoading && !reducedMotion && 'animate-neo-pop',
          )}
        >
          <span aria-hidden>{adLoading ? '⏳' : '📺'}</span>
          <span>{t('wordTower.sabotage.watchAd')}</span>
        </button>
      )}

      {/* AD-EARN toast — token just granted via reward ad. (Inline mode: the
          play screen renders this beat in its notice column instead; the
          auto-dismiss timers above still run either way.) */}
      {adEarnedToast && !inline && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none rounded-neo border-neo-thick border-black bg-neo-cyan px-3 py-1.5 text-start shadow-hard',
            !inline && 'absolute start-3 top-40 z-40',
            !reducedMotion && 'animate-neo-pop',
          )}
        >
          <div className="font-neo-display text-sm font-black text-black">
            {t('wordTower.sabotage.adEarned')}
          </div>
        </div>
      )}

      {/* EARN toast — a token just dropped in. (Inline mode: shown in the play
          screen's notice column instead.) */}
      {earnedToast != null && !inline && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-1.5 text-start shadow-hard',
            !inline && 'absolute start-3 top-40 z-40',
            !reducedMotion && 'animate-neo-pop',
          )}
        >
          <div className="font-neo-display text-sm font-black text-black">
            {t('wordTower.sabotage.earned')}
          </div>
          <div className="font-neo-body text-[10px] font-bold text-black/70">
            {t('wordTower.sabotage.earnedHint', { n: earnedToast })}
          </div>
        </div>
      )}

      {/* Picker overlay — full-screen so the choice feels weighty (and so the
          user can clearly see who they're targeting in context). */}
      {pickerOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/55 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('wordTower.sabotage.pickTarget')}
        >
          <div className={cn('w-full max-w-md rounded-neo border-neo-thick border-black bg-neo-navy p-4 shadow-hard', !reducedMotion && 'animate-neo-pop')}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-neo-display text-base font-black uppercase text-neo-white">
                {t('wordTower.sabotage.pickTarget')}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-neo border-neo border-black bg-neo-navy-light px-2 py-1 font-neo-body text-xs font-bold text-neo-white shadow-hard"
              >
                ✕
              </button>
            </div>
            {rivals.length === 0 ? (
              <p className="rounded-neo border-neo border-dashed border-neo-white/30 px-3 py-6 text-center font-neo-body text-sm text-neo-white/70">
                {t('wordTower.sabotage.noTargets')}
              </p>
            ) : (
              <ul className="grid max-h-[55dvh] gap-2 overflow-y-auto pr-1">
                {rivals.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handlePickRival(r)}
                      className="flex w-full items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-pink px-3 py-2.5 text-start font-neo-display text-base font-black uppercase text-neo-white shadow-hard transition-transform active:translate-y-px"
                    >
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-black bg-neo-navy text-base"
                        style={{ background: r.avatarColor ?? '#2a2a40' }}
                      >
                        {r.avatarEmoji ?? '🧗'}
                      </span>
                      <span className="flex-1 truncate">{r.name}</span>
                      <span className="font-neo-body text-xs font-bold text-neo-white/80">
                        {Math.round(r.heightM)}m
                      </span>
                      <span aria-hidden>💥</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Smash scene overlay — mounts when a rival is picked from the picker. */}
      {smashTarget && (
        <WordTowerSmashScene
          target={smashTarget}
          onDone={handleSmashDone}
          t={t}
          reducedMotion={reducedMotion}
        />
      )}
    </>
  );
}
