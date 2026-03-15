/**
 * ResultsActionButtons Component
 *
 * Renders action buttons for results page based on player role and state.
 * Handles host/player modes, ready states, and single/multiplayer variants.
 */

import React from 'react';
import { Play, DoorOpen, Check, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ResultsActionButtonsProps {
  /** Whether current user is the host */
  isHost: boolean;
  /** Whether this is a multiplayer game */
  isMultiplayer: boolean;
  /** Whether current player has marked themselves ready */
  isCurrentPlayerReady: boolean;
  /** Callback when host starts new game */
  onStartGame: () => void;
  /** Callback when player marks themselves ready */
  onMarkReady: () => void;
  /** Callback when player exits room */
  onExit: () => void;
}

/**
 * Action buttons for results page.
 *
 * Renders different button layouts based on:
 * - Host vs Player role
 * - Ready vs Not Ready state (players only)
 * - Multiplayer vs Single Player mode
 *
 * @example
 * ```tsx
 * // Host mode
 * <ResultsActionButtons
 *   isHost={true}
 *   isMultiplayer={true}
 *   isCurrentPlayerReady={false}
 *   onStartGame={handleStart}
 *   onMarkReady={handleReady}
 *   onExit={handleExit}
 * />
 *
 * // Player not ready
 * <ResultsActionButtons
 *   isHost={false}
 *   isMultiplayer={true}
 *   isCurrentPlayerReady={false}
 *   onStartGame={handleStart}
 *   onMarkReady={handleReady}
 *   onExit={handleExit}
 * />
 * ```
 */
export function ResultsActionButtons({
  isHost,
  isMultiplayer,
  isCurrentPlayerReady,
  onStartGame,
  onMarkReady,
  onExit,
}: ResultsActionButtonsProps) {
  const { t } = useLanguage();

  // Single player mode - just exit button
  if (!isMultiplayer) {
    return (
      <button
        onClick={onExit}
        className="w-full max-w-xs bg-neo-orange text-neo-black font-black text-base py-3 px-6 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
      >
        <DoorOpen className="w-5 h-5" />
        {t('common.exit')}
      </button>
    );
  }

  // Multiplayer mode
  return (
    <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
      {isHost ? (
        /* HOST: Start Game + Exit buttons */
        <>
          <button
            onClick={onStartGame}
            className="w-full bg-neo-green text-neo-black font-black text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {t('hostView.startGame')}
          </button>
          <button
            onClick={onExit}
            className="w-full bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.leaveRoom')}
          </button>
        </>
      ) : isCurrentPlayerReady ? (
        /* PLAYER: Ready state (disabled) + Exit button */
        <>
          <button
            onClick={onMarkReady}
            disabled
            className="w-full bg-neo-green/80 text-neo-black font-bold text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2 cursor-default"
          >
            <Check className="w-5 h-5" />
            {t('results.ready')}
          </button>
          <p className="text-center text-[10px] text-neo-cream/50">
            {t('results.waitingForHost')}
          </p>
          <button
            onClick={onExit}
            className="w-full bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.leaveRoom')}
          </button>
        </>
      ) : (
        /* PLAYER: Not ready state (pulsing) + Explanation + Exit button */
        <>
          <div className="space-y-1">
            <button
              onClick={onMarkReady}
              className="w-full bg-neo-lime text-neo-black font-black text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2 animate-pulse"
            >
              <Star className="w-5 h-5" />
              {t('results.imReady')}
            </button>
            <p className="text-center text-[10px] text-neo-cream/50">
              {t('results.readyExplanation')}
            </p>
          </div>
          <button
            onClick={onExit}
            className="w-full bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.leaveRoom')}
          </button>
        </>
      )}
    </div>
  );
}
