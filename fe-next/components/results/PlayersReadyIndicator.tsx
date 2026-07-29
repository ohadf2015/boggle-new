'use client';

import React, { useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check, Hourglass, Bot } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { MascotWithEntrance } from '@/components/ui/Mascot';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import type { Avatar as AvatarType } from '@/types';

interface PlayerInfo {
  username: string;
  avatar?: AvatarType;
  isBot?: boolean;
  isHost?: boolean;
}

interface PlayersReadyIndicatorProps {
  players: PlayerInfo[];
  readyUsernames: string[];
  currentUsername?: string;
  isHost?: boolean;
}

/**
 * PlayersReadyIndicator - Compact horizontal strip showing player ready status
 * Uses inline avatar bubbles with check/waiting badges
 */
const PlayersReadyIndicator: React.FC<PlayersReadyIndicatorProps> = ({
  players,
  readyUsernames,
  currentUsername,
  isHost = false,
}) => {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const inf = reducedMotion ? 0 : Infinity;
  const readySet = useMemo(() => new Set(readyUsernames), [readyUsernames]);

  // Exclude host from player list — host clicks "Start Game", not "Ready"
  const nonHostPlayers = useMemo(() => players.filter(p => !p.isHost), [players]);

  // Bots are always ready - count them as ready automatically
  const botCount = useMemo(() => nonHostPlayers.filter(p => p.isBot).length, [nonHostPlayers]);
  const humanReadyCount = readyUsernames.length;
  const effectiveReadyCount = humanReadyCount + botCount;
  const totalPlayers = nonHostPlayers.length;
  const allReady = effectiveReadyCount >= totalPlayers && totalPlayers > 0;
  const progressPercent = totalPlayers > 0 ? (effectiveReadyCount / totalPlayers) * 100 : 0;

  // Sort players: ready first (including bots), then by username
  const sortedPlayers = useMemo(() => {
    return [...nonHostPlayers].sort((a, b) => {
      const aReady = a.isBot || readySet.has(a.username);
      const bReady = b.isBot || readySet.has(b.username);
      if (aReady !== bReady) return bReady ? 1 : -1;
      return a.username.localeCompare(b.username);
    });
  }, [nonHostPlayers, readySet]);

  if (nonHostPlayers.length === 0) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full"
    >
      <div className="bg-neo-navy/80 border-2 border-neo-black rounded-neo shadow-hard overflow-hidden">
        {/* Combined header + avatars in one compact row */}
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute inset-0 bg-neo-navy-light/30" />

          {/* Animated progress fill */}
          <m.div
            className={`absolute inset-y-0 left-0 ${
              allReady
                ? 'bg-linear-to-r from-neo-lime/30 to-neo-cyan/30'
                : 'bg-linear-to-r from-neo-lime/20 to-neo-pink/20'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Compact content: status + avatars + count */}
          <div className="relative px-3 py-2 flex items-center gap-3">
            {/* Status icon + label */}
            <div className="flex items-center gap-1.5 shrink-0">
              <m.div
                animate={allReady ? { scale: [1, 1.2, 1] } : { rotate: [0, 10, -10, 0] }}
                transition={{ type: 'tween', duration: 1.5, repeat: inf, repeatDelay: 0.5 }}
              >
                {allReady ? (
                  <span className="text-sm">🎉</span>
                ) : (
                  <Hourglass className="text-neo-lime w-3.5 h-3.5" />
                )}
              </m.div>
              <span className="font-black text-[11px] uppercase tracking-wide text-neo-white">
                {allReady ? t('results.everyoneReady') : t('results.waitingForPlayers')}
              </span>
            </div>

            {/* Avatar strip */}
            <div className="flex items-center -space-x-2 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {sortedPlayers.map((player, index) => {
                  const isReady = player.isBot || readySet.has(player.username);
                  const isCurrentUser = player.username === currentUsername;
                  const isBot = player.isBot;

                  return (
                    <m.div
                      key={player.username}
                      layout
                      initial={{ opacity: 0, scale: 0, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        duration: 0.25,
                        delay: index * 0.04,
                        type: 'spring',
                        stiffness: 400,
                        damping: 25,
                      }}
                      className="relative shrink-0 group"
                      title={`${player.username}${isCurrentUser ? ` ${t('results.you')}` : ''} — ${isReady ? t('results.ready') : t('results.waiting')}`}
                    >
                      {/* Avatar */}
                      <div className={`
                        relative rounded-full transition-all duration-200
                        ${isCurrentUser ? 'ring-2 ring-neo-lime ring-offset-1 ring-offset-neo-navy z-10' : ''}
                        ${!isReady ? 'opacity-40 grayscale' : ''}
                      `}>
                        {isBot ? (
                          <div className="w-8 h-8 rounded-full bg-neo-navy-light border-2 border-neo-black flex items-center justify-center">
                            <Bot className="text-neo-cyan w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <Avatar
                            userId={player.username}
                            customAvatar={player.avatar?.customAvatar}
                            size="sm"
                            className="w-8 h-8 border-2 border-neo-black"
                          />
                        )}

                        {/* Ready/waiting micro-badge */}
                        <m.div
                          initial={false}
                          animate={isReady ? { scale: [0.8, 1.2, 1] } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={`
                            absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full
                            flex items-center justify-center
                            border-[1.5px] border-neo-navy
                            ${isReady ? 'bg-neo-lime' : 'bg-neo-navy-light'}
                          `}
                        >
                          {isReady ? (
                            <Check className="text-neo-black w-2.5 h-2.5" />
                          ) : (
                            <m.div
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1.5, repeat: inf }}
                              className="w-1.5 h-1.5 rounded-full bg-neo-cream/40"
                            />
                          )}
                        </m.div>
                      </div>
                    </m.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Count badge */}
            <div className={`
              shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black
              ${allReady
                ? 'bg-neo-lime/20 text-neo-lime'
                : 'bg-neo-navy-light/50 text-neo-white'
              }
            `}>
              <span className={allReady ? 'text-neo-lime' : 'text-neo-lime'}>{effectiveReadyCount}</span>
              <span className="text-neo-white">/</span>
              <span>{totalPlayers}</span>
            </div>
          </div>
        </div>

        {/* All ready celebration / waiting message - ultra compact */}
        <AnimatePresence>
          {allReady && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 py-1.5 bg-neo-lime/10 border-t border-neo-lime/20 flex items-center justify-center gap-2">
                <MascotWithEntrance variant="celebration" size="xs" delay={0.2} clipBorder="none" />
                <p className="text-center text-xs font-bold text-neo-lime">
                  {isHost
                    ? (t('results.allReadyHostCanStart'))
                    : (t('results.allPlayersReadyWaitingHost'))}
                </p>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
};

export default PlayersReadyIndicator;
