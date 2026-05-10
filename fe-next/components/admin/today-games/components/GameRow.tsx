'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Crown, Gamepad2, Smartphone, Monitor, Sparkles } from 'lucide-react';
import type { UnifiedGame } from '../types';
import { LANGUAGE_FLAGS, GAME_TYPE_ICONS, formatDuration, formatTime } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';

const COUNTRY_FLAG_OFFSET = 0x1f1a5;
function countryToFlag(code?: string | null): string {
  if (!code || code.length !== 2) return '';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    upper.charCodeAt(0) + COUNTRY_FLAG_OFFSET,
    upper.charCodeAt(1) + COUNTRY_FLAG_OFFSET,
  );
}

function formatReferrer(value?: string | null): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}

interface GameRowProps {
  game: UnifiedGame;
  t: (key: string) => string;
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
  const acquisitionSource =
    game.utm_source ||
    formatReferrer(game.referrer_source) ||
    (game.is_guest ? 'direct' : null);

  const isMobile =
    game.device_type?.toLowerCase().includes('mobile') ||
    game.device_type?.toLowerCase().includes('phone') ||
    game.device_type?.toLowerCase().includes('android') ||
    game.device_type?.toLowerCase().includes('ios');

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="hover:bg-slate-700/30 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-slate-300">{formatTime(game.created_at)}</span>
        </div>
      </td>
      <td className="px-2 sm:px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {game.is_guest ? (
              <User className="w-4 h-4 text-slate-400" />
            ) : game.placement === 1 ? (
              <Crown className="w-4 h-4 text-neo-lime" />
            ) : (
              <PlayerAvatar
                customAvatar={game.profiles?.avatar_config}
                userId={game.player_id || undefined}
              />
            )}
            <span className="text-sm text-neo-white truncate max-w-[120px]">{playerName}</span>
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
          </div>
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
              {acquisitionSource && (
                <span className="truncate max-w-[120px]" title={acquisitionSource}>
                  via {acquisitionSource}
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
    </motion.tr>
  );
}
