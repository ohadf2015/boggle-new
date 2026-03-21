'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, Swords, Star, Check, Users } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { GameModeSelector, type GameModeOption } from '@/components/GameModeSelector';
import type { Avatar as AvatarType } from '@/types';

interface PlayerInfo {
  username: string;
  avatar?: AvatarType;
  isBot?: boolean;
}

interface StickyReadyBarProps {
  isHost: boolean;
  isCurrentPlayerReady: boolean;
  currentPlayerRank: number;
  winnerUsername?: string;
  readyCount: number;
  totalPlayers: number;
  readyUsernames?: string[];
  players?: PlayerInfo[];
  onStartGame: () => void;
  onMarkReady: () => void;
  selectedGameMode?: GameModeOption;
  onSelectGameMode?: (mode: GameModeOption) => void;
}

function makeBreathingPulse(dir: 'ltr' | 'rtl') {
  const x = dir === 'rtl' ? '-4px' : '4px';
  const xLg = dir === 'rtl' ? '-6px' : '6px';
  return {
    scale: [1, 1.02, 1],
    boxShadow: [
      `${x} 4px 0px black`,
      `${xLg} 6px 0px black`,
      `${x} 4px 0px black`,
    ],
  };
}

export default function StickyReadyBar({
  isHost,
  isCurrentPlayerReady,
  currentPlayerRank,
  winnerUsername,
  readyCount,
  totalPlayers,
  onStartGame,
  onMarkReady,
  selectedGameMode,
  onSelectGameMode,
  readyUsernames = [],
  players = [],
}: StickyReadyBarProps) {
  const { t, dir } = useLanguage();
  const reducedMotion = useReducedMotion();
  const breathingPulse = makeBreathingPulse(dir);

  const isRevenge = currentPlayerRank > 1 && !!winnerUsername;
  const allReady = readyCount === totalPlayers && totalPlayers > 0;

  // Map usernames to player info for avatar lookup
  const playerMap = useMemo(() => {
    const map = new Map<string, PlayerInfo>();
    for (const p of players) map.set(p.username, p);
    return map;
  }, [players]);

  return (
    <motion.div
      initial={reducedMotion ? undefined : { y: 80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className="bg-neo-navy/95 backdrop-blur-sm px-3 py-2"
    >
      {/* Player ready indicator — above the CTA */}
      {(readyCount > 0 || isHost) && (
        <div className="mb-2" aria-live="polite">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-3.5 h-3.5 text-neo-cream/60 shrink-0" />
            <div className="flex-1 h-2 bg-neo-black/40 rounded-full overflow-hidden border border-white/10">
              <motion.div
                className={`h-full rounded-full ${allReady ? 'bg-emerald-400' : 'bg-neo-cyan/70'}`}
                initial={{ width: 0 }}
                animate={{ width: `${totalPlayers > 0 ? (readyCount / totalPlayers) * 100 : 0}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums shrink-0 ${allReady ? 'text-emerald-400' : 'text-neo-cream/60'}`}>
              {readyCount}/{totalPlayers}
            </span>
          </div>
          {/* Ready player avatars */}
          {readyUsernames.length > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <AnimatePresence mode="popLayout">
                {readyUsernames.slice(0, 6).map(name => {
                  const player = playerMap.get(name);
                  return (
                    <motion.span
                      key={name}
                      layout
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 ps-0.5 pe-1.5 py-0.5 rounded-full border border-emerald-500/20"
                    >
                      <Avatar
                        customAvatar={player?.avatar?.customAvatar}
                        userId={name}
                        size="sm"
                        className="w-5 h-5 rounded-full border border-emerald-500/30"
                      />
                      <Check className="w-2.5 h-2.5 shrink-0" />
                      {name}
                    </motion.span>
                  );
                })}
              </AnimatePresence>
              {readyUsernames.length > 6 && (
                <span className="text-[11px] text-neo-cream/50">+{readyUsernames.length - 6}</span>
              )}
            </div>
          ) : readyCount === 0 && isHost ? (
            <p className="text-[11px] text-neo-cream/40">
              {t('results.waitingForPlayers')}
            </p>
          ) : null}
        </div>
      )}

      {/* Game mode selector + CTA — full width */}
      {isHost ? (
        <div className="space-y-1.5">
          {selectedGameMode !== undefined && onSelectGameMode && (
            <GameModeSelector
              selectedMode={selectedGameMode}
              onSelectMode={onSelectGameMode}
              t={t}
              showRandom
              compact
            />
          )}
          <motion.button
            onClick={onStartGame}
            whileTap={{ scale: 0.92 }}
            animate={!reducedMotion ? breathingPulse : undefined}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full bg-emerald-500 text-white font-black text-base px-4 py-3 min-h-[44px] uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {t('results.playAgain')}
          </motion.button>
        </div>
      ) : isCurrentPlayerReady ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="font-black text-sm uppercase text-emerald-400">{t('results.youAreReady')}</span>
          <span className="text-xs text-neo-cream/50">— {t('results.waitingForHostToStart')}</span>
        </div>
      ) : isRevenge ? (
        <motion.button
          onClick={onMarkReady}
          whileTap={{ scale: 0.92 }}
          animate={!reducedMotion ? breathingPulse : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full bg-neo-pink text-white font-black text-base px-4 py-3 min-h-[44px] uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
        >
          <Swords className="w-5 h-5" />
          {t('results.revengeRematch', { player: winnerUsername })}
        </motion.button>
      ) : (
        <motion.button
          onClick={onMarkReady}
          whileTap={{ scale: 0.92 }}
          animate={!reducedMotion ? breathingPulse : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-full bg-neo-lime text-neo-black font-black text-base px-4 py-3 min-h-[44px] uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
        >
          <Star className="w-5 h-5" />
          {t('results.imReady')}
        </motion.button>
      )}
    </motion.div>
  );
}
