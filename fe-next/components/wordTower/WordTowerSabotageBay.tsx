'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { RivalMarker } from '@/lib/wordTower/rivals';

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
  t,
  reducedMotion,
}: Props) {
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

  const hasTokens = tokens > 0;

  return (
    <>
      {/* Floating token chip — sits above the bottom HUD on the start (LTR=left)
          side, opposite the (end-side) hazards. Tap to open the picker. */}
      <button
        type="button"
        onClick={hasTokens ? onOpen : undefined}
        disabled={!hasTokens}
        aria-label={t('wordTower.sabotage.chip')}
        className={cn(
          'pointer-events-auto absolute start-3 bottom-[230px] z-40 flex items-center gap-1.5 rounded-neo border-neo-thick border-black px-2.5 py-1.5 font-neo-display text-sm font-black uppercase shadow-hard transition-transform',
          hasTokens
            ? 'bg-neo-pink text-neo-white hover:scale-105 active:translate-y-px'
            : 'bg-neo-navy/60 text-neo-white/50',
          hasTokens && !reducedMotion && 'animate-neo-pop',
        )}
      >
        <span aria-hidden>🎯</span>
        <span>{t('wordTower.sabotage.chip')}</span>
        <span
          className={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-full border border-black px-1 font-neo-display text-[11px] font-black',
            hasTokens ? 'bg-neo-yellow text-black' : 'bg-neo-navy text-neo-white/60',
          )}
        >
          {tokens}
        </span>
      </button>

      {/* EARN toast — a token just dropped in. Pops above the chip. */}
      {earnedToast != null && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none absolute start-3 bottom-[280px] z-40 rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-1.5 text-start shadow-hard',
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
          className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-end bg-black/55 backdrop-blur-sm p-4"
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
                      onClick={() => onSend(r.id, r.name)}
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

      {/* Wrecking-ball flight + hit toast — the ball arcs across the screen from
          the sender's chip toward the rival rail edge. CSS keyframe animation
          keyed by the hit id so each new hit replays. */}
      {lastHit && !reducedMotion && (
        <div
          key={lastHit.id}
          aria-hidden
          className="pointer-events-none absolute start-6 bottom-[230px] z-40 select-none text-3xl"
          style={{
            animation: 'wt-wrecking-ball 800ms cubic-bezier(0.45, 0, 0.7, 1) forwards',
          }}
        >
          💥
        </div>
      )}
      {lastHit && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none absolute left-1/2 top-[20%] z-40 -translate-x-1/2 rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-2 font-neo-display text-base font-black uppercase text-neo-white shadow-hard',
            !reducedMotion && 'animate-neo-pop',
          )}
        >
          {t('wordTower.sabotage.sentTo', { name: lastHit.targetName })}
        </div>
      )}

      {/* Keyframes scoped to the bay — kept here so the component is portable. */}
      <style jsx global>{`
        @keyframes wt-wrecking-ball {
          0%   { transform: translate(0, 0) rotate(0deg) scale(0.5); opacity: 1; }
          40%  { transform: translate(40vw, -55vh) rotate(180deg) scale(1.4); opacity: 1; }
          80%  { transform: translate(75vw, -25vh) rotate(360deg) scale(1.7); opacity: 1; }
          100% { transform: translate(80vw, -22vh) rotate(380deg) scale(2.2); opacity: 0; }
        }
      `}</style>
    </>
  );
}
