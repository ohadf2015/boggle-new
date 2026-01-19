'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Gamepad2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';

// ==================== Types ====================

export interface GamePreviewCardProps {
  /** Number of players in the room */
  playerCount: number;
  /** Translation function */
  t: (path: string, params?: Record<string, string | number>) => string;
  /** Additional className */
  className?: string;
}

// ==================== Component ====================

/**
 * Game preview card showing waiting animation and player count
 *
 * Features:
 * - Animated "Waiting for players" display
 * - Decorative mini-grid visualization
 * - Player count badge
 */
export function GamePreviewCard({
  playerCount,
  t,
  className,
}: GamePreviewCardProps): React.ReactElement {
  // Create a 5x5 decorative grid
  const gridCells = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div
      data-testid="game-preview-card"
      className={cn(
        'relative rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard-lg overflow-hidden w-full max-w-md',
        className
      )}
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-neo-pink via-neo-purple to-neo-cyan" />

      <div className="p-6 pt-8">
        {/* Animated waiting text */}
        <motion.div
          className="text-center mb-6"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Gamepad2 className="w-12 h-12 mx-auto text-neo-cyan mb-2" />
          <h2 className="text-xl font-black uppercase text-neo-cream">
            {t('hostView.waitingForPlayers') || 'Waiting for Players'}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-neo-cyan"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Decorative mini grid */}
        <div className="grid grid-cols-5 gap-1 max-w-[200px] mx-auto mb-6">
          {gridCells.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'aspect-square rounded-sm border border-neo-black/30',
                i % 3 === 0 ? 'bg-neo-pink/20' :
                i % 5 === 0 ? 'bg-neo-cyan/20' :
                i % 7 === 0 ? 'bg-neo-yellow/20' :
                'bg-white/5'
              )}
            />
          ))}
        </div>

        {/* Player count badge */}
        <div className="flex justify-center">
          <motion.div
            data-testid="player-count-badge"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-neo-navy border-2 border-neo-pink shadow-hard-sm"
            animate={playerCount > 0 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Users className="w-5 h-5 text-neo-pink" />
            <span className="font-black text-neo-cream">
              {playerCount} {playerCount === 1 ? t('common.player') : t('hostView.players')}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default GamePreviewCard;
