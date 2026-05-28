'use client';

import React from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { Clock, Crown, Gamepad2, Smartphone, Monitor, Sparkles } from 'lucide-react';
import type { UnifiedGame } from '../types';
import { LANGUAGE_FLAGS, GAME_TYPE_ICONS, formatDuration, formatTime } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';
import {
  classifyAcquisition,
  ACQUISITION_TONE,
  type AcquisitionKind,
} from '../utils/classifyAcquisition';

const COUNTRY_FLAG_OFFSET = 0x1f1a5;
function countryToFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    upper.charCodeAt(0) + COUNTRY_FLAG_OFFSET,
    upper.charCodeAt(1) + COUNTRY_FLAG_OFFSET,
  );
}

const SOURCE_FALLBACK: Record<AcquisitionKind, string> = {
  search: 'Search',
  social: 'Social',
  ai: 'AI',
  portal: 'Game portal',
  email: 'Email',
  push: 'Push',
  ads: 'Ads',
  referral: 'Referral',
  direct: 'Direct',
  unknown: 'Unknown',
};

const SOURCE_ICON: Record<AcquisitionKind, string> = {
  search: '🔍',
  social: '💬',
  ai: '🤖',
  portal: '🎮',
  email: '✉️',
  push: '🔔',
  ads: '💸',
  referral: '🔗',
  direct: '⌨️',
  unknown: '❓',
};

interface GameRowProps {
  game: UnifiedGame;
  t: (key: string, fallback?: string) => string;
}

export function GameRow({ game, t }: GameRowProps) {
  const flag = LANGUAGE_FLAGS[game.language] || '🌐';
  const typeIcon =
    GAME_TYPE_ICONS[game.mode] ||
    React.createElement(Gamepad2, { className: 'w-4 h-4 text-slate-400' });

  const getTypeLabel = () => {
    switch (game.mode) {
      case 'ranked':
        return t('admin.todayGames.ranked');
      case 'casual':
        return t('admin.todayGames.casual');
      case 'word_hunt':
        return t('admin.todayGames.wordHunt');
      case 'daily_challenge':
        return t('admin.todayGames.daily');
      case 'drill':
        return `${game.drill_type || 'Drill'} L${game.drill_level || 1}`;
      default:
        return game.mode;
    }
  };

  const playerName =
    game.profiles?.display_name ||
    game.profiles?.username ||
    (game.is_guest ? t('admin.todayGames.guest') : 'Unknown');

  const guestSessionShort = game.guest_session_id
    ? game.guest_session_id.slice(0, 8)
    : null;

  const countryFlag = countryToFlag(game.country);
  const acquisitionTag = classifyAcquisition({
    utm_source: game.utm_source,
    utm_medium: game.utm_medium,
    utm_campaign: game.utm_campaign,
    referrer_source: game.referrer_source,
    is_guest: !!game.is_guest,
  });
  const sourceLabel = t(
    `admin.todayGames.source.${acquisitionTag.kind}`,
    SOURCE_FALLBACK[acquisitionTag.kind],
  );
  const showSourceChip = acquisitionTag.kind !== 'unknown' || !!acquisitionTag.rawLabel;

  const isMobile =
    game.device_type?.toLowerCase().includes('mobile') ||
    game.device_type?.toLowerCase().includes('phone') ||
    game.device_type?.toLowerCase().includes('android') ||
    game.device_type?.toLowerCase().includes('ios');

  return (
    <m.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hover:bg-neo-navy-elevated/30 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-300">{formatTime(game.created_at)}</span>
        </div>
      </td>
      <td className="px-2 sm:px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <PlayerCell
            isGuest={!!game.is_guest}
            playerId={game.player_id}
            guestSessionId={game.guest_session_id}
            customAvatar={game.profiles?.avatar_config}
            placement={game.placement}
            playerName={playerName}
          >
            {game.is_guest && (
              <span className="text-xs bg-slate-600 text-slate-300 px-1.5 py-0.5 rounded">
                {t('admin.todayGames.guest')}
              </span>
            )}
            {game.is_first_game && (
              <span
                className="inline-flex items-center gap-1 text-xs bg-neo-lime/20 text-neo-lime px-1.5 py-0.5 rounded"
                title={t('admin.todayGames.firstGame')}
              >
                <Sparkles className="w-3 h-3" />
                {t('admin.todayGames.first')}
              </span>
            )}
          </PlayerCell>
          {game.is_guest && (
            <div className="flex items-center gap-2 ms-6 text-[11px] text-slate-500">
              {guestSessionShort && (
                <span className="font-mono" title={game.guest_session_id ?? undefined}>
                  {guestSessionShort}
                </span>
              )}
              {countryFlag && (
                <span title={game.country ?? undefined}>{countryFlag}</span>
              )}
              {game.device_type && (
                <span
                  className="inline-flex items-center gap-1"
                  title={`${game.device_type}${game.browser ? ` · ${game.browser}` : ''}`}
                >
                  {isMobile ? (
                    <Smartphone className="w-3 h-3" />
                  ) : (
                    <Monitor className="w-3 h-3" />
                  )}
                  {game.device_type}
                </span>
              )}
              {showSourceChip && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] leading-none border rounded-full px-1.5 py-0.5 ${ACQUISITION_TONE[acquisitionTag.kind]}`}
                  title={acquisitionTag.tooltip || sourceLabel}
                >
                  <span aria-hidden>{SOURCE_ICON[acquisitionTag.kind]}</span>
                  <span className="truncate max-w-[100px]">{sourceLabel}</span>
                  {acquisitionTag.rawLabel && acquisitionTag.rawLabel.toLowerCase() !== sourceLabel.toLowerCase() && (
                    <span className="opacity-70 truncate max-w-[80px]">· {acquisitionTag.rawLabel}</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <div className="flex items-center gap-2">
          {typeIcon}
          <span className="text-sm text-slate-300">{getTypeLabel()}</span>
        </div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
        <span className="text-lg">{flag}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-neo-white">{game.score}</span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-slate-300">{game.word_count}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-slate-300">{formatDuration(game.time_played)}</span>
      </td>
      <td className="hidden md:table-cell px-4 py-3">
        <span className="font-mono text-xs text-slate-400">{game.game_code}</span>
      </td>
    </m.tr>
  );
}

interface PlayerCellProps {
  isGuest: boolean;
  playerId: string | null;
  guestSessionId: string | null;
  customAvatar: import('@/shared/types/customAvatar').CustomAvatarConfig | null | undefined;
  placement: number | null;
  playerName: string;
  children: React.ReactNode;
}

function PlayerCell({
  isGuest,
  playerId,
  guestSessionId,
  customAvatar,
  placement,
  playerName,
  children,
}: PlayerCellProps) {
  const seedId = playerId || guestSessionId || undefined;
  const inner = (
    <>
      <span className="relative inline-flex flex-shrink-0">
        <PlayerAvatar
          customAvatar={isGuest ? null : customAvatar}
          userId={seedId}
        />
        {placement === 1 && (
          <Crown
            className="absolute -top-1.5 -end-1.5 w-3 h-3 text-neo-lime drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]"
            aria-label="1st place"
          />
        )}
      </span>
      <span className="text-sm text-neo-white truncate max-w-[120px]">{playerName}</span>
      {children}
    </>
  );

  if (!isGuest && playerId) {
    return (
      <Link
        href={`/admin/players/${playerId}`}
        className="flex items-center gap-2 hover:underline focus:outline-none focus:ring-2 focus:ring-neo-lime rounded"
      >
        {inner}
      </Link>
    );
  }

  return <div className="flex items-center gap-2">{inner}</div>;
}
