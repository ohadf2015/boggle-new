'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, User, Crown, Gamepad2 } from 'lucide-react';
import type { UnifiedGame } from '../types';
import { LANGUAGE_FLAGS, GAME_TYPE_ICONS, formatDuration, formatTime } from '../constants';
import { PlayerAvatar } from './PlayerAvatar';

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
