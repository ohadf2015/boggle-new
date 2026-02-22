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
 * - Decorative mini-grid visualization (6x6 on desktop for better presence)
 * - Player count badge with responsive sizing
 */
export function GamePreviewCard({
  playerCount,
  t,
  className,
}: GamePreviewCardProps): React.ReactElement {
  // Create a 6x6 decorative grid (36 cells for better desktop presence)
  const gridCells = Array.from({ length: 36 }, (_, i) => i);

  return (
    <div
      data-testid="game-preview-card"
      className={cn(
        'relative rounded-neo-lg border-4 border-neo-black bg-slate-800 shadow-hard-lg overflow-hidden w-full',
        // Responsive max-width: wider on desktop for better screen utilization
        'max-w-md xl:max-w-lg',
        className
      )}
    >
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-neo-pink via-neo-purple to-neo-cyan" />

      {/* Responsive padding: more generous on desktop */}
      <div className="p-6 pt-8 xl:p-8 xl:pt-10">
        {/* Animated waiting text */}
        <motion.div
          className="text-center mb-6 xl:mb-8"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Larger icon on desktop */}
          <Gamepad2 className="w-12 h-12 xl:w-16 xl:h-16 mx-auto text-neo-cyan mb-2 xl:mb-3" />
          <h2 className="text-xl xl:text-2xl font-black uppercase text-neo-cream">
            {t('hostView.waitingForPlayers') || 'Waiting for Players'}
          </h2>
          <div className="flex items-center justify-center gap-1.5 mt-2 xl:mt-3">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 xl:w-2.5 xl:h-2.5 rounded-full bg-neo-cyan"
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

        {/* Decorative grid - 6x6 with responsive sizing */}
        <div className="grid grid-cols-6 gap-1.5 max-w-[220px] xl:max-w-[280px] mx-auto mb-6 xl:mb-8">
          {gridCells.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28, delay: i * 0.015 }}
              className={cn(
                'aspect-square rounded-sm xl:rounded border border-neo-black/30',
                i % 3 === 0 ? 'bg-neo-pink/20' :
                i % 5 === 0 ? 'bg-neo-cyan/20' :
                i % 7 === 0 ? 'bg-neo-yellow/20' :
                'bg-white/5'
              )}
            />
          ))}
        </div>

        {/* Player count badge - larger on desktop */}
        <div className="flex justify-center">
          <motion.div
            data-testid="player-count-badge"
            className="flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-6 xl:py-3 rounded-full bg-neo-navy border-2 xl:border-3 border-neo-pink shadow-hard-sm"
            animate={playerCount > 0 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Users className="w-5 h-5 xl:w-6 xl:h-6 text-neo-pink" />
            <span className="font-black text-neo-cream xl:text-lg">
              {playerCount} {playerCount === 1 ? t('common.player') : t('hostView.players')}
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default GamePreviewCard;
