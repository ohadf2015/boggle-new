'use client';

import { memo } from 'react';
import { m } from 'framer-motion';
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
  /** Compact single-line layout for mobile */
  compact?: boolean;
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
  compact = false,
}) {
  // Compact: single-line start button + status inline
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <m.button
          onClick={onStartGame}
          disabled={disabled}
          className={cn(
            'flex-1 h-11 flex items-center justify-center gap-2',
            'font-neo-display font-black text-lg uppercase tracking-tight',
            'border-3 border-neo-black transition-all rounded-neo',
            'active:translate-y-0.5 active:shadow-hard-pressed',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'bg-neo-lime text-neo-black shadow-hard-sm'
          )}
        >
          {tournamentCreating ? (
            <span className="text-sm">{t('hostView.creatingTournament')}</span>
          ) : (
            <>
              <Swords className="w-5 h-5" />
              <span>{t('hostView.startBattle')}</span>
            </>
          )}
        </m.button>
        <span className={cn(
          'text-[10px] font-bold uppercase whitespace-nowrap',
          playerCount === 0 ? 'text-neo-red' : 'text-slate-500'
        )}>
          {playerCount === 0 ? t('hostView.needPlayers') : `${playerCount}/${maxPlayers}`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <m.button
        onClick={onStartGame}
        disabled={disabled}
        className={cn(
          'w-full h-14 flex items-center justify-center gap-3',
          'font-neo-display font-black text-2xl uppercase tracking-tight',
          'border-3 border-neo-black rounded-2xl transition-all',
          'active:translate-y-0.5 active:shadow-hard-pressed',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
          'bg-neo-lime text-neo-black shadow-hard-lg'
        )}
      >
        {tournamentCreating ? (
          <span className="text-lg">{t('hostView.creatingTournament')}</span>
        ) : (
          <>
            <Swords className="w-6 h-6" />
            <span>{t('hostView.startBattle')}</span>
          </>
        )}
      </m.button>
      {/* Inline player count badge */}
      <div className="absolute end-3 top-1/2 -translate-y-1/2 bg-neo-black text-neo-lime text-[10px] font-black px-3 py-1 rounded-full border-2 border-neo-black shadow-hard-sm">
        {playerCount} / {maxPlayers}
      </div>
    </div>
  );
});

export default StartButton;
