'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { cn } from '../../../lib/utils';

// ==================== Props ====================

interface StartButtonProps {
  onStartGame: () => void;
  disabled: boolean;
  tournamentCreating: boolean;
  playerCount: number;
  maxPlayers?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ==================== Component ====================

export const StartButton = memo<StartButtonProps>(function StartButton({
  onStartGame,
  disabled,
  tournamentCreating,
  playerCount,
  maxPlayers = 8,
  t,
  className = '',
}) {
  const isReady = playerCount >= 1 && !disabled;

  return (
    <div className={cn('space-y-2', className)}>
      <motion.button
        onClick={onStartGame}
        disabled={disabled}
        className={cn(
          'w-full h-[60px] lg:h-[80px] flex items-center justify-center gap-3',
          'font-neo-display font-black text-2xl lg:text-4xl uppercase tracking-tight',
          'border-3 border-neo-black transition-all',
          'active:translate-y-0.5 active:shadow-hard-pressed',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
          'bg-neo-lime text-neo-black shadow-hard'
        )}
      >
        {tournamentCreating ? (
          <span className="text-lg">{t('hostView.creatingTournament')}</span>
        ) : (
          <>
            <Swords className="w-7 h-7" />
            <span>{t('hostView.startBattle')}</span>
          </>
        )}
      </motion.button>

      {/* Expanding line animation + status text */}
      <div className="flex flex-col items-center gap-1">
        {isReady && (
          <motion.div
            className="h-0.5 bg-neo-lime rounded-full"
            initial={{ width: '10%' }}
            animate={{ width: ['10%', '80%', '10%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
          {playerCount > 0
            ? `${playerCount} ${t('hostView.ofMaxWarriors', { max: String(maxPlayers) }) || `of ${maxPlayers} players ready`}`
            : (t('hostView.waitingForPlayers'))
          }
        </p>
        {playerCount === 0 && (
          <p className="text-center text-xs text-slate-600 mt-1">
            {t('hostView.shareCodeHint')}
          </p>
        )}
      </div>
    </div>
  );
});

export default StartButton;
