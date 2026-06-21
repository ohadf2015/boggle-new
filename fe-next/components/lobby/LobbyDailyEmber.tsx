'use client';

/**
 * LobbyDailyEmber — ambient Daily-Challenge awareness on the player's OWN
 * multiplayer-lobby hero card.
 *
 * Goal: let MP players KNOW the daily exists (and that their streak is live)
 * WITHOUT interrupting the session or pulling them out of the room.
 * Pull, not push: the ember is identity/pride, never a "leave now" CTA.
 *
 * HARD RULE: no affordance here navigates to /daily while the player is in a
 * live room. Tapping opens an info-only popover (reassurance + dismiss), nothing
 * that leaves. The post-game results screen owns the "play now" conversion.
 *
 * Data is the LOCAL player's own status (useDailyChallengeStatus → server for
 * authed, localStorage for guests). No socket traffic, no backend — each client
 * enriches only its own hero card.
 */

import React, { useEffect, useId, useRef, useState } from 'react';
import { Flame, Check, X } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { selectLobbyEmberState, type LobbyEmberKind } from '@/lib/growth/lobbyDailyEmber';

interface Props {
  className?: string;
}

// neo-orange is the reserved "streak / warmth" semantic — exactly this surface.
const KIND_STYLE: Record<Exclude<LobbyEmberKind, 'hidden'>, { chip: string; flame: string; pulse: boolean }> = {
  secured: { chip: 'border-neo-orange/40 bg-neo-orange/15 text-neo-orange', flame: 'text-neo-orange', pulse: false },
  at_risk: { chip: 'border-neo-orange/50 bg-neo-orange/20 text-neo-orange', flame: 'text-neo-orange animate-pulse', pulse: true },
  invite: { chip: 'border-neo-orange/25 bg-neo-orange/10 text-neo-orange/80', flame: 'text-neo-orange/70 animate-pulse', pulse: true },
};

export function LobbyDailyEmber({ className }: Props) {
  const { t, language } = useLanguage();
  const { hasPlayed, currentStreak, loading } = useDailyChallengeStatus(language);
  const [open, setOpen] = useState(false);
  const shownRef = useRef<string | null>(null);
  const prevOpenRef = useRef(false);
  const popoverId = useId();

  const { kind, streak } = selectLobbyEmberState({ hasPlayed, currentStreak, loading });

  // Impression — once per distinct kind per mount (kind can settle after load).
  useEffect(() => {
    if (kind === 'hidden') return;
    if (shownRef.current === kind) return;
    shownRef.current = kind;
    posthog.capture('growth:lobby_daily_ember_shown', { kind, streak, surface: 'mp_lobby' });
  }, [kind, streak]);

  // Analytics fire AFTER paint (useEffect runs post-commit) — keeps analytics off the
  // interaction→paint critical path, improving INP on multiplayer lobby.
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      posthog.capture('growth:lobby_daily_ember_tapped', { kind, streak, surface: 'mp_lobby' });
    }
    prevOpenRef.current = open;
  }, [open, kind, streak]);

  const handleToggle = () => setOpen((prev) => !prev);

  if (kind === 'hidden') return null;

  const style = KIND_STYLE[kind];
  const label =
    kind === 'secured'
      ? t('lobbyDailyEmber.secured', { streak })
      : kind === 'at_risk'
        ? t('lobbyDailyEmber.atRisk', { streak })
        : t('lobbyDailyEmber.invite');

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        data-testid="lobby-daily-ember"
        data-kind={kind}
        onClick={handleToggle}
        aria-expanded={open}
        aria-controls={popoverId}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-neo border-2 border-neo-black px-2.5 py-1 text-xs font-black uppercase tracking-wide shadow-hard-sm transition-transform active:scale-95',
          style.chip,
        )}
      >
        {kind === 'secured' ? (
          <span className="relative flex items-center">
            <Flame className={cn('w-3.5 h-3.5', style.flame)} />
            <Check className="w-2.5 h-2.5 text-neo-orange -ml-1" strokeWidth={3} />
          </span>
        ) : (
          <Flame className={cn('w-3.5 h-3.5', style.flame)} />
        )}
        <span>{label}</span>
      </button>

      <div
          id={popoverId}
          role="dialog"
          aria-label={t('lobbyDailyEmber.popoverTitle')}
          data-testid="lobby-daily-ember-popover"
          hidden={!open}
          className="absolute z-30 mt-2 w-60 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard-lg start-0"
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className="flex items-center gap-1.5 text-sm font-black text-neo-orange">
              <Flame className="w-4 h-4" />
              {t('lobbyDailyEmber.popoverTitle')}
            </h4>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('lobbyDailyEmber.gotIt')}
              className="shrink-0 text-slate-400 hover:text-neo-cream"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-neo-cream/90">
            {t('lobbyDailyEmber.popoverBody')}
          </p>
          {/* Intentionally NO link to /daily — awareness only, never leaves the room. */}
          <button
            type="button"
            data-testid="lobby-daily-ember-gotit"
            onClick={() => setOpen(false)}
            className="mt-2.5 w-full rounded-neo border-2 border-neo-black bg-neo-orange py-1.5 text-xs font-black uppercase text-neo-navy shadow-hard-sm active:scale-95"
          >
            {t('lobbyDailyEmber.gotIt')}
          </button>
        </div>
    </div>
  );
}

export default LobbyDailyEmber;
