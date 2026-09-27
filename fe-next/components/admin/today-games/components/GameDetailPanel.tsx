'use client';

import React from 'react';
import { ExternalLink, Smartphone, Monitor, Tablet, Globe, Users, Clock, Trophy, Hash } from 'lucide-react';
import type { UnifiedGame } from '../types';
import { formatDuration } from '../constants';
import { gameModeLabel, playersSummary, deviceLabel } from '@/lib/admin/gameLog/gameDisplay';
import { classifyAcquisition, ACQUISITION_TONE } from '../utils/classifyAcquisition';
import { postHogPersonUrl } from '@/lib/admin/postHogLinks';

interface Props {
  game: UnifiedGame;
  t: (key: string, fallback?: string) => string;
}

function DeviceIcon({ device }: { device?: string | null }) {
  const d = (device || '').toLowerCase();
  if (d.includes('mobile') || d.includes('phone')) return <Smartphone className="w-4 h-4" />;
  if (d.includes('tablet') || d.includes('ipad')) return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-500 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm text-slate-200 break-words">{value}</div>
      </div>
    </div>
  );
}

/**
 * Expanded per-game detail. Reads only fields already on UnifiedGame — works for
 * every source. Honest about gaps: bot count shows "not recorded" for older games.
 */
export function GameDetailPanel({ game, t }: Props) {
  const players = playersSummary(game);
  const acq = classifyAcquisition({
    utm_source: game.utm_source,
    utm_medium: game.utm_medium,
    utm_campaign: game.utm_campaign,
    referrer_source: game.referrer_source,
    is_guest: !!game.is_guest,
  });
  const distinctId = game.player_id || game.guest_session_id || undefined;
  const phUrl = postHogPersonUrl(distinctId);

  return (
    <div className="bg-neo-navy/60 border-t border-slate-700 px-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
        <Field
          icon={<Hash className="w-4 h-4" />}
          label={t('admin.todayGames.detail.mode', 'Mode')}
          value={
            <span>
              {gameModeLabel(game.game_mode || game.mode, t)}
              {game.is_multiplayer ? ` · ${t('admin.todayGames.multiplayer', 'Multiplayer')}` : ''}
              {game.is_ranked ? ' · Ranked' : ''}
            </span>
          }
        />
        <Field
          icon={<Users className="w-4 h-4" />}
          label={t('admin.todayGames.detail.players', 'Players')}
          value={
            <span>
              {players.text}
              {game.is_multiplayer && !players.botsKnown && (
                <span className="text-slate-500"> · {t('admin.todayGames.detail.botsNa', 'bots not recorded')}</span>
              )}
            </span>
          }
        />
        <Field
          icon={<DeviceIcon device={game.device_type} />}
          label={t('admin.todayGames.detail.device', 'Device')}
          value={deviceLabel(game)}
        />
        <Field
          icon={<Globe className="w-4 h-4" />}
          label={t('admin.todayGames.detail.acquisition', 'Came from')}
          value={
            <span className={`inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5 ${ACQUISITION_TONE[acq.kind]}`}>
              {t(`admin.todayGames.source.${acq.kind}`, acq.kind)}
              {acq.rawLabel ? <span className="opacity-70">· {acq.rawLabel}</span> : null}
            </span>
          }
        />
        <Field
          icon={<Clock className="w-4 h-4" />}
          label={t('admin.todayGames.detail.duration', 'Duration')}
          value={game.time_played ? formatDuration(game.time_played) : '—'}
        />
        <Field
          icon={<Trophy className="w-4 h-4" />}
          label={t('admin.todayGames.detail.result', 'Result')}
          value={
            <span>
              {t('admin.todayGames.score', 'Score')}: {game.score} · {game.word_count} {t('admin.todayGames.words', 'words')}
              {game.is_winner === true && <span className="text-neo-lime"> · {t('admin.todayGames.detail.winner', 'Winner')}</span>}
              {game.role ? <span className="text-slate-500"> · {game.role}</span> : null}
            </span>
          }
        />
        {game.country && (
          <Field icon={<Globe className="w-4 h-4" />} label={t('admin.todayGames.detail.country', 'Country')} value={game.country} />
        )}
        <Field
          icon={<Hash className="w-4 h-4" />}
          label={t('admin.todayGames.code', 'Code')}
          value={<span className="font-mono text-xs">{game.game_code}</span>}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
        {phUrl && (
          <a
            href={phUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-neo-cyan hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {t('admin.todayGames.detail.posthog', 'View in PostHog')}
          </a>
        )}
        {game.player_id && (
          <a href={`/admin/players/${game.player_id}`} className="inline-flex items-center gap-1 text-neo-lime hover:underline">
            <ExternalLink className="w-3 h-3" />
            {t('admin.todayGames.detail.profile', 'Player profile')}
          </a>
        )}
        {game.guest_session_id && (
          <span className="font-mono text-slate-500" title={game.guest_session_id}>
            {t('admin.todayGames.detail.session', 'Session')}: {game.guest_session_id.slice(0, 14)}
          </span>
        )}
      </div>
    </div>
  );
}
