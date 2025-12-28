'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Hourglass, Bot } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Avatar as AvatarType } from '@/types';

interface PlayerInfo {
  username: string;
  avatar?: AvatarType & { profilePictureUrl?: string };
  isBot?: boolean;
}

interface PlayersReadyIndicatorProps {
  players: PlayerInfo[];
  readyUsernames: string[];
  currentUsername?: string;
  isHost?: boolean;
}

/**
 * PlayersReadyIndicator - Shows which players are ready for the next round
 * Modern neo-brutalist design with avatar indicators
 */
const PlayersReadyIndicator: React.FC<PlayersReadyIndicatorProps> = ({
  players,
  readyUsernames,
  currentUsername,
  isHost = false,
}) => {
  const { t } = useLanguage();
  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);

  // Bots are always ready - count them as ready automatically
  const botCount = useMemo(() => players.filter(p => p.isBot).length, [players]);
  const humanReadyCount = readyUsernames.length;
  const effectiveReadyCount = humanReadyCount + botCount;
  const totalPlayers = players.length;
  const allReady = effectiveReadyCount >= totalPlayers && totalPlayers > 0;
  const progressPercent = totalPlayers > 0 ? (effectiveReadyCount / totalPlayers) * 100 : 0;

  // Sort players: ready first (including bots), then by username
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const aReady = a.isBot || readySet.has(a.username);
      const bReady = b.isBot || readySet.has(b.username);
      if (aReady !== bReady) return bReady ? 1 : -1;
      return a.username.localeCompare(b.username);
    });
  }, [players, readySet]);

  if (players.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/95 border-3 border-neo-black rounded-neo-lg shadow-hard-lg overflow-hidden">
        {/* Header with progress bar */}
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute inset-0 bg-slate-700/50 text-white" />

          {/* Animated progress fill */}
          <motion.div
            className={`absolute inset-y-0 left-0 ${
              allReady
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-neo-yellow/80 to-amber-500/80'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Header content */}
          <div className="relative px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={allReady ? { scale: [1, 1.2, 1] } : { rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
              >
                {allReady ? (
                  <span className="text-lg">🎉</span>
                ) : (
                  <Hourglass className="text-neo-yellow text-sm" />
                )}
              </motion.div>
              <h3 className="font-black text-sm uppercase tracking-wide text-white">
                {allReady ? t('results.everyoneReady') : t('results.waitingForPlayers')}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <span className={`font-black text-lg ${allReady ? 'text-emerald-400' : 'text-neo-yellow'}`}>
                {effectiveReadyCount}
              </span>
              <span className="text-slate-400 font-bold">/</span>
              <span className="text-slate-300 font-bold">{totalPlayers}</span>
            </div>
          </div>
        </div>

        {/* Players grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {sortedPlayers.map((player, index) => {
                const isReady = player.isBot || readySet.has(player.username);
                const isCurrentUser = player.username === currentUsername;
                const isBot = player.isBot;

                return (
                  <motion.div
                    key={player.username}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      layout: { duration: 0.3 }
                    }}
                    className={`
                      relative p-3 rounded-neo border-2 transition-all duration-300
                      ${isReady
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/60'
                        : 'bg-slate-700/30 border-slate-600/40'
                      }
                      ${isCurrentUser ? 'ring-2 ring-neo-yellow ring-offset-1 ring-offset-slate-900' : ''}
                    `}
                  >
                    {/* Ready indicator badge */}
                    <motion.div
                      initial={false}
                      animate={isReady ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`
                        absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full
                        flex items-center justify-center
                        border-2 border-slate-900 shadow-md
                        ${isReady
                          ? 'bg-emerald-500'
                          : 'bg-slate-600'
                        }
                      `}
                    >
                      {isReady ? (
                        <Check className="text-white text-xs" />
                      ) : (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="w-2 h-2 rounded-full bg-slate-400"
                        />
                      )}
                    </motion.div>

                    {/* Player content */}
                    <div className="flex flex-col items-center gap-2">
                      {/* Avatar with glow effect when ready */}
                      <div className={`relative ${isReady ? 'ready-glow' : ''}`}>
                        <div className={`transition-all duration-300 ${!isReady ? 'opacity-50 grayscale' : ''}`}>
                          <Avatar
                            profilePictureUrl={player.avatar?.profilePictureUrl}
                            avatarEmoji={player.avatar?.emoji}
                            avatarImage={player.avatar?.avatarImage}
                            avatarColor={player.avatar?.color}
                            size="lg"
                            className={`border-2 ${isReady ? 'border-emerald-400' : 'border-slate-500'}`}
                          />
                        </div>

                        {/* Pulse ring animation for ready players */}
                        {isReady && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-emerald-400"
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [0.8, 0, 0.8]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut'
                            }}
                          />
                        )}
                      </div>

                      {/* Username */}
                      <span className={`
                        text-xs font-bold truncate max-w-full text-center flex items-center justify-center gap-1
                        ${isReady ? 'text-white' : 'text-slate-400'}
                        ${isCurrentUser ? 'text-neo-yellow' : ''}
                      `}>
                        {isBot && <Bot className="text-neo-cyan text-xs shrink-0" />}
                        {player.username}
                        {isCurrentUser && ` ${t('results.you')}`}
                      </span>

                      {/* Status text */}
                      <span className={`
                        text-[10px] uppercase tracking-wider font-bold
                        ${isReady ? 'text-emerald-400' : 'text-slate-500'}
                      `}>
                        {isReady ? t('results.ready') : t('results.waiting')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* All ready celebration message OR waiting for host message */}
        <AnimatePresence>
          {allReady && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-t-2 border-emerald-500/30">
                <motion.p
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-center text-sm font-bold text-emerald-300"
                >
                  {isHost
                    ? (t('results.allReadyHostCanStart') || '🎉 All players ready! You can start the next round.')
                    : (t('results.allPlayersReadyWaitingHost') || '✓ All players ready — waiting for host to start')}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waiting for more players message (for non-hosts) */}
        {!allReady && !isHost && (
          <div className="px-4 py-2 border-t-2 border-slate-700/50">
            <p className="text-center text-xs text-slate-400 font-medium">
              {t('results.hostWillStartWhenReady') || 'The host will start the next round when everyone is ready'}
            </p>
          </div>
        )}
      </div>

      {/* CSS for glow effect */}
      <style jsx>{`
        .ready-glow {
          filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.5));
        }
      `}</style>
    </motion.div>
  );
};

export default PlayersReadyIndicator;
