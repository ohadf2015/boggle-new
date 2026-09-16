'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Globe, Users, Trophy, Hash, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import type { GameGroup, GamePlayer } from '@/lib/admin/gameLog/groupGames';
import { countryFlag, platformLabel, playerDeviceLabel } from '@/lib/admin/gameLog/gameGroupDisplay';
import { ACQUISITION_TONE } from '../utils/classifyAcquisition';
import { postHogPersonUrl } from '@/lib/admin/postHogLinks';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { PlayerAvatar } from './PlayerAvatar';

interface Props {
  group: GameGroup;
  t: (key: string, fallback?: string) => string;
}

/**
 * Expanded game group detail. Renders the per-player list for the group.
 */
export function GameGroupDetailPanel({ group, t }: Props) {
  return (
    <div className="bg-neo-navy/60 border-t border-slate-700 px-4 py-4">
      {/* Group-level info */}
      <div className="mb-4 pb-3 border-b border-slate-700/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-500">{t('admin.todayGames.detail.gameCode', 'Game Code')}:</span>
            <span className="ml-2 font-mono text-slate-300">{group.gameCode || '—'}</span>
          </div>
          {group.errorReasons.length > 0 && (
            <div>
              <span className="text-neo-red">{t('admin.todayGames.detail.errors', 'Errors')}:</span>
              <span className="ml-2 text-neo-red">{group.errorReasons.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Player list header */}
      <div className="mb-2">
        <h4 className="text-sm font-neo-display text-neo-white">{t('admin.todayGames.detail.players', 'Players')}</h4>
      </div>

      {/* Per-player rows */}
      <div className="space-y-3">
        {group.players.map((player) => (
          <PlayerRow key={player.key} player={player} t={t} />
        ))}
      </div>
    </div>
  );
}

function PlayerRow({ player, t }: { player: GamePlayer; t: (key: string, fallback?: string) => string }) {
  const platform = platformLabel(player.platform, t);
  const device = playerDeviceLabel(player.deviceType, player.os, player.browser);
  const country = player.country ? countryFlag(player.country) : '';
  const acq = player.acquisition;
  const showAcqChip = acq.kind !== 'unknown' || !!acq.rawLabel;
  const distinctId = player.playerId || player.guestSessionId || undefined;
  const phUrl = postHogPersonUrl(distinctId);

  // Prefer the auth id: an authed player keeps playing after a new guest session
  // is minted, so blocking the account is the durable half of the pair.
  //
  // ponytail: guestSessionId is the real join session id ONLY on source=analytics
  // (the panel's only live feed today). The source=tables branch of
  // app/api/admin/game-logs/route.ts aliases guest_fingerprint onto this same
  // field, and a block minted from THAT value could never match at join — a
  // silent no-op. Safe now because that branch renders nothing; re-check if the
  // source toggle in GamesFilters is ever wired up.
  const blockTarget = useMemo<{ type: 'auth_user' | 'guest_session'; value: string } | null>(
    () =>
      player.playerId
        ? { type: 'auth_user', value: player.playerId }
        : player.guestSessionId
          ? { type: 'guest_session', value: player.guestSessionId }
          : null,
    [player.playerId, player.guestSessionId],
  );

  // Shares the TanStack cache key with the page-level useAdminAuth(), so this is
  // a cache read, not a second token fetch.
  const { authToken } = useAdminAuth();
  const [blocking, setBlocking] = useState(false);

  const handleBlock = useCallback(async () => {
    if (!blockTarget || blocking || !authToken) return;
    const label = player.displayName || blockTarget.value.slice(0, 12);
    // ponytail: window.confirm matches the sibling quick-block buttons in
    // PlayerManager/GuestManager. A styled modal is the upgrade if this grows.
    if (!window.confirm(`Block ${label} from joining games?`)) return;
    setBlocking(true);
    try {
      const res = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          blockType: blockTarget.type,
          value: blockTarget.value,
          reason: 'Blocked from games log',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(t('admin.todayGames.detail.blocked', 'Blocked'));
    } catch {
      toast.error(t('admin.todayGames.detail.blockFailed', 'Failed to block'));
    } finally {
      setBlocking(false);
    }
  }, [authToken, blockTarget, blocking, player.displayName, t]);

  return (
    <div className="bg-neo-navy-light/30 rounded border border-slate-700/50 p-2.5 text-xs">
      <div className="flex items-start gap-2.5 mb-2">
        <PlayerAvatar customAvatar={!player.isGuest ? player.profile?.avatar_config : null} userId={player.playerId ?? player.guestSessionId ?? undefined} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-neo-display text-slate-100">
              {player.displayName}
            </span>
            {player.isHost && <span>👑</span>}
            {player.isGuest && (
              <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded">{t('admin.todayGames.guest', 'Guest')}</span>
            )}
            {player.isWinner && (
              <span className="text-[9px] bg-neo-lime/20 text-neo-lime px-1 rounded">{t('admin.todayGames.detail.winner', 'Winner')}</span>
            )}
            {player.status === 'errored' && (
              <span className="text-[9px] bg-neo-red/20 text-neo-red px-1 rounded">{t('admin.todayGames.status.errored', 'Error')}</span>
            )}
            {player.status === 'abandoned' && (
              <span className="text-[9px] bg-neo-orange/20 text-neo-orange px-1 rounded">{t('admin.todayGames.status.left', 'Left mid-game')}</span>
            )}
          </div>
          {player.invitedByName && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              {t('admin.todayGames.detail.invitedBy', 'Invited by')} <span className="text-slate-300">{player.invitedByName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Per-player stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2 text-[10px]">
        <div>
          <span className="text-slate-500">{t('admin.todayGames.score', 'Score')}:</span>
          <span className="ml-1 font-mono text-slate-100">{player.score}</span>
        </div>
        <div>
          <span className="text-slate-500">{t('admin.todayGames.words', 'Words')}:</span>
          <span className="ml-1 font-mono text-slate-100">{player.wordCount}</span>
        </div>
        {country && (
          <div>
            <span className="text-slate-500">{t('admin.todayGames.detail.country', 'Country')}:</span>
            <span className="ml-1">{country} {player.country}</span>
          </div>
        )}
        {platform.label !== '—' && (
          <div>
            <span className="text-slate-500">{t('admin.todayGames.detail.platform', 'Platform')}:</span>
            <span className="ml-1">{platform.icon} {platform.label}</span>
          </div>
        )}
        <div className="sm:col-span-2">
          <span className="text-slate-500">{t('admin.todayGames.detail.device', 'Device')}:</span>
          <span className="ml-1 text-slate-300">{device}</span>
        </div>
      </div>

      {/* Acquisition chip */}
      {showAcqChip && (
        <div className="mb-2">
          <span className={`inline-flex items-center gap-1 text-[9px] border rounded-full px-2 py-0.5 ${ACQUISITION_TONE[acq.kind]}`} title={acq.tooltip}>
            {t(`admin.todayGames.source.${acq.kind}`, acq.kind)}
            {acq.rawLabel && <span className="opacity-70">· {acq.rawLabel}</span>}
          </span>
        </div>
      )}

      {/* Error reason */}
      {player.errorReason && (
        <div className="mb-2 text-neo-red text-[9px]">
          <span className="text-slate-500">{t('admin.todayGames.detail.error', 'Error')}:</span>
          <span className="ml-1">{player.errorReason}</span>
        </div>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-2 text-[9px]">
        {phUrl && (
          <a
            href={phUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-neo-cyan hover:underline"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {t('admin.todayGames.detail.posthog', 'PostHog')}
          </a>
        )}
        {player.playerId && (
          <a href={`/admin/players/${player.playerId}`} className="inline-flex items-center gap-1 text-neo-lime hover:underline">
            <ExternalLink className="w-2.5 h-2.5" />
            {t('admin.todayGames.detail.profile', 'Profile')}
          </a>
        )}
        {player.guestSessionId && (
          <span className="font-mono text-slate-500" title={player.guestSessionId}>
            {t('admin.todayGames.detail.session', 'Session')}: {player.guestSessionId.slice(0, 12)}
          </span>
        )}
        {blockTarget && (
          <button
            type="button"
            onClick={handleBlock}
            disabled={blocking || !authToken}
            data-testid="block-player-btn"
            // Enforced at the socket `join` handler only (playerJoinHandler.ts) —
            // it stops multiplayer joins, not solo play.
            title={`Block this ${blockTarget.type === 'auth_user' ? 'account' : 'guest session'} from joining games`}
            className="inline-flex items-center gap-1 text-neo-red hover:underline disabled:opacity-40 disabled:no-underline"
          >
            <Ban className="w-2.5 h-2.5" />
            {blocking
              ? t('admin.todayGames.detail.blocking', 'Blocking…')
              : t('admin.todayGames.detail.block', 'Block')}
          </button>
        )}
      </div>
    </div>
  );
}
