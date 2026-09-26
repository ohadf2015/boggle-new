'use client';

import { memo } from 'react';
import { MpPrimaryCta } from '@/components/multiplayer/shell/MpPrimaryCta';
import { cn } from '../../../lib/utils';
import styles from '@/components/multiplayer/lobby/lobby.module.css';

interface StartButtonProps {
  onStartGame: () => void;
  disabled: boolean;
  tournamentCreating: boolean;
  playerCount: number;
  maxPlayers?: number;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
  /** @deprecated the footer CTA is one size (64px phone, 96px TV). */
  compact?: boolean;
  /**
   * Translation key for the button copy. Defaults to the arcade "Start Battle!".
   * Classroom rooms pass a teacher-register key ("Start Quiz" / "Start Game").
   */
  labelKey?: string;
  /** Second line — who you are about to play. Defaults to the seat count. */
  sublabel?: string;
  /** Everyone is ready: one celebratory wiggle (re-runs each time it flips on). */
  celebrate?: boolean;
}

const DEFAULT_LABEL_KEY = 'hostView.startBattle';

/** The lobby's one primary action, on the shell's `MpPrimaryCta`. */
export const StartButton = memo<StartButtonProps>(function StartButton({
  onStartGame,
  disabled,
  tournamentCreating,
  playerCount,
  maxPlayers = 8,
  t,
  className = '',
  labelKey = DEFAULT_LABEL_KEY,
  sublabel,
  celebrate = false,
}) {
  return (
    <MpPrimaryCta
      testId="lobby-start"
      tone="lime"
      label={tournamentCreating ? t('hostView.creatingTournament') : t(labelKey)}
      sublabel={tournamentCreating ? undefined : (sublabel ?? `${playerCount}/${maxPlayers}`)}
      onPress={onStartGame}
      disabled={disabled}
      className={cn(
        'border-3 border-neo-black shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
        celebrate && styles.goWiggle,
        className,
      )}
    />
  );
});

export default StartButton;
