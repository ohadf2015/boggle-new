'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Skull, Target, Trophy } from 'lucide-react';

export interface WordHuntGameOverlayProps {
  isEliminated: boolean;
  targetFound: boolean;
  targetFoundBy: string | null;
  currentUsername: string;
  playerLives: Record<string, number>;
  eliminatedPlayers: string[];
  t: (key: string) => string;
}

/**
 * Full-screen overlay for Word Hunt game-ending states:
 * - Player eliminated (skull + red vignette)
 * - Target word found (celebration / info about who found it)
 */
export const WordHuntGameOverlay = memo<WordHuntGameOverlayProps>(({
  isEliminated,
  targetFound,
  targetFoundBy,
  currentUsername,
  playerLives,
  eliminatedPlayers,
  t,
}) => {
  const eliminatedSet = new Set(eliminatedPlayers);
  const iFoundIt = targetFoundBy === currentUsername;

  // Target found takes priority (game is ending for everyone)
  if (targetFound) {
    return (
      <AdaptiveAnimatePresence>
        <AdaptiveMotion.div
          data-testid="target-found-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-neo-black/70 backdrop-blur-xs"
        >
          {/* Icon */}
          <AdaptiveMotion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 12 }}
          >
            {iFoundIt ? (
              <Trophy className="w-16 h-16 text-neo-yellow drop-shadow-[0_0_20px_rgba(255,225,53,0.6)]" />
            ) : (
              <Target className="w-16 h-16 text-neo-cyan drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]" />
            )}
          </AdaptiveMotion.div>

          {/* Title */}
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-center"
          >
            {iFoundIt ? (
              <span className="text-2xl font-black text-neo-yellow font-neo-display uppercase">
                {t('wordHunt.mp.youFoundIt')}
              </span>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-black text-neo-cyan font-neo-display uppercase">
                  {t('wordHunt.mp.targetFound')}
                </span>
                <span className="text-lg font-bold text-neo-white">
                  {targetFoundBy}
                </span>
              </div>
            )}
          </AdaptiveMotion.div>

          {/* Players progress */}
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 w-full max-w-xs space-y-1 px-4"
          >
            <span className="text-xs font-bold text-neo-white uppercase tracking-wide">
              {t('wordHunt.mp.playerStatus')}
            </span>
            {Object.entries(playerLives).map(([name, life]) => {
              const isOut = eliminatedSet.has(name);
              const isWinner = name === targetFoundBy;
              return (
                <div
                  key={name}
                  className={`flex items-center gap-2 px-2 py-1 rounded-neo border-2 ${
                    isWinner ? 'border-neo-yellow bg-neo-yellow/10' :
                    isOut ? 'border-neo-red/30 bg-neo-red/5 opacity-50' :
                    'border-neo-white/10 bg-neo-white/5'
                  }`}
                >
                  <span className={`text-sm font-bold truncate flex-1 ${
                    isWinner ? 'text-neo-yellow' : isOut ? 'text-neo-red/70' : 'text-neo-white'
                  }`}>
                    {name}
                    {isWinner && ' 🎯'}
                  </span>
                  {isOut ? (
                    <Skull size={14} className="text-neo-red" />
                  ) : (
                    <div className="w-12 h-2 rounded-full bg-neo-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          life > 66 ? 'bg-green-400' : life > 33 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.max(life, 0)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </AdaptiveMotion.div>

          {/* Waiting message */}
          <AdaptiveMotion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-xs text-neo-white animate-pulse"
          >
            {t('wordHunt.mp.gameEnding')}
          </AdaptiveMotion.p>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    );
  }

  // Elimination overlay
  if (isEliminated) {
    return (
      <AdaptiveAnimatePresence>
        <AdaptiveMotion.div
          data-testid="elimination-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center"
        >
          {/* Red vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 20%, rgba(220,38,38,0.4) 80%, rgba(220,38,38,0.7) 100%)',
            }}
          />
          <div className="absolute inset-0 bg-neo-black/50" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center">
            <AdaptiveMotion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            >
              <Skull className="w-20 h-20 text-neo-red drop-shadow-[0_0_30px_rgba(220,38,38,0.8)]" />
            </AdaptiveMotion.div>

            <AdaptiveMotion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-2xl font-black text-neo-red font-neo-display uppercase tracking-wide"
            >
              {t('wordHunt.mp.eliminated')}
            </AdaptiveMotion.span>

            <AdaptiveMotion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 0.5 }}
              className="mt-2 text-sm text-neo-white"
            >
              {t('wordHunt.mp.watchOthers')}
            </AdaptiveMotion.p>

            {/* Other players still alive */}
            <AdaptiveMotion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-4 w-full max-w-xs space-y-1 px-4"
            >
              {Object.entries(playerLives)
                .filter(([name]) => !eliminatedSet.has(name))
                .map(([name, life]) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 px-2 py-1 rounded-neo border-2 border-neo-white/10 bg-neo-white/5"
                  >
                    <span className="text-sm font-bold text-neo-white truncate flex-1">
                      {name}
                    </span>
                    <div className="w-12 h-2 rounded-full bg-neo-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          life > 66 ? 'bg-green-400' : life > 33 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.max(life, 0)}%` }}
                      />
                    </div>
                  </div>
                ))
              }
            </AdaptiveMotion.div>
          </div>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    );
  }

  return null;
});

WordHuntGameOverlay.displayName = 'WordHuntGameOverlay';
