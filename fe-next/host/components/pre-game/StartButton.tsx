'use client';

import React, { memo } from 'react';
import { Button } from '../../../components/ui/button';

// ==================== Props ====================

interface StartButtonProps {
  onStartGame: () => void;
  disabled: boolean;
  tournamentCreating: boolean;
  playerCount: number;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ==================== Component ====================

export const StartButton = memo<StartButtonProps>(function StartButton({
  onStartGame,
  disabled,
  tournamentCreating,
  playerCount,
  t,
  className = '',
}) {
  return (
    <Button
      onClick={onStartGame}
      disabled={disabled}
      className={`w-full h-12 text-base bg-neo-lime text-neo-black font-black uppercase border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed active:translate-y-0.5 disabled:opacity-50 transition-all ${className}`}
    >
      {tournamentCreating ? (
        t('hostView.creatingTournament')
      ) : (
        <>
          {'🎮 '}
          {t('hostView.startGame')}
          {playerCount > 0 && <span className="ml-1 opacity-70">({playerCount})</span>}
        </>
      )}
    </Button>
  );
});

export default StartButton;
