'use client';

/**
 * LeagueRivalsCard — Shows the 2 players directly above and below
 * the current player in their weekly league standings.
 * Compact card for the landing page. Neo-brutalist style.
 */

import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLeagueRivals, type LeagueRival } from '@/hooks/useLeagueRivals';

function interpolate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(`{{${key}}}`, String(value));
  }
  return result;
}

function RivalRow({
  rival,
  label,
  labelColor,
}: {
  rival: LeagueRival;
  label: string;
  labelColor: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      {/* Position */}
      <span className="font-mono text-xs font-bold text-neo-white w-6 text-center">
        #{rival.position}
      </span>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full border-2 border-black bg-neo-navy/60 flex items-center justify-center overflow-hidden shrink-0">
        {rival.avatar ? (
          <Image
            src={rival.avatar}
            alt={rival.username}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-neo-white">
            {rival.username.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name + gap label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neo-white truncate">{rival.username}</p>
        <p className={`text-xs ${labelColor}`}>{label}</p>
      </div>

      {/* Score */}
      <span className="font-mono text-sm font-bold text-neo-white">
        {rival.score.toLocaleString()}
      </span>
    </div>
  );
}

function PlayerRow({
  position,
  score,
  youLabel,
}: {
  position: number;
  score: number;
  youLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-neo-yellow/15 border-y-2 border-neo-yellow/30">
      {/* Position */}
      <span className="font-mono text-xs font-bold text-neo-yellow w-6 text-center">
        #{position}
      </span>

      {/* Highlighted marker */}
      <div className="w-8 h-8 rounded-full border-2 border-neo-yellow bg-neo-yellow/20 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-neo-yellow">
          {youLabel.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* You label */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-neo-yellow">{youLabel}</p>
      </div>

      {/* Score */}
      <span className="font-mono text-sm font-bold text-neo-yellow">
        {score.toLocaleString()}
      </span>
    </div>
  );
}

export function LeagueRivalsCard() {
  const { t } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const { above, below, player, loading } = useLeagueRivals(
    isAuthenticated ? profile?.id ?? null : null
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="border-3 border-black rounded-neo shadow-hard bg-neo-navy/80 overflow-hidden animate-pulse">
        <div className="px-3 py-2">
          <div className="h-4 w-32 bg-neo-white/10 rounded mb-3" />
          <div className="h-10 bg-neo-white/5 rounded mb-2" />
          <div className="h-10 bg-neo-yellow/10 rounded mb-2" />
          <div className="h-10 bg-neo-white/5 rounded" />
        </div>
      </div>
    );
  }

  // Don't render if not in a league
  if (!player) return null;

  const hasRivals = above || below;
  const title = t('leagueRivals.title') || 'Your League Rivals';
  const youLabel = t('leagueRivals.you') || 'You';

  // Compute gap labels
  const aheadLabel = above
    ? interpolate(t('leagueRivals.ahead') || '{{pts}} pts ahead', {
        pts: above.score - player.score,
      })
    : '';
  const behindLabel = below
    ? interpolate(t('leagueRivals.behind') || '{{pts}} pts behind', {
        pts: player.score - below.score,
      })
    : '';

  return (
    <div className="border-3 border-black rounded-neo shadow-hard bg-neo-navy/80 overflow-hidden w-full max-w-md">
      {/* Header */}
      <div className="px-3 py-2 border-b-2 border-black/30 bg-neo-navy/40">
        <h3 className="font-neo-display text-sm font-bold text-neo-white">
          {title}
        </h3>
      </div>

      {hasRivals ? (
        <div className="flex flex-col">
          {above && (
            <RivalRow
              rival={above}
              label={aheadLabel}
              labelColor="text-neo-pink"
            />
          )}
          <PlayerRow
            position={player.position}
            score={player.score}
            youLabel={youLabel}
          />
          {below && (
            <RivalRow
              rival={below}
              label={behindLabel}
              labelColor="text-neo-cyan"
            />
          )}
        </div>
      ) : (
        <div className="px-3 py-4 text-center">
          <p className="text-sm text-neo-white">
            {t('leagueRivals.noRivals') || 'Climb the league to find rivals!'}
          </p>
        </div>
      )}
    </div>
  );
}
