/**
 * ResultsActionButtons Component
 *
 * Renders action buttons for results page based on player role and state.
 * Handles host/player modes, ready states, and single/multiplayer variants.
 */

import { useCallback, useState } from 'react';
import { m } from 'framer-motion';
import { Play, DoorOpen, Check, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useExperiment } from '@/hooks/useExperiment';

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
  const { variant: reactionVariant } = useExperiment('exp-mp-round-reaction-v1');
  const [showEmoji, setShowEmoji] = useState(false);

  const handleReady = useCallback(() => {
    trackGrowthEvent('mp_round_ready_clicked', {});
    if (reactionVariant === 'emoji-burst') {
      setShowEmoji(true);
      setTimeout(() => setShowEmoji(false), 1000);
    }
    onMarkReady();
  }, [onMarkReady, reactionVariant]);

  const handleExit = useCallback(() => {
    if (isMultiplayer) trackGrowthEvent('mp_results_exit_clicked', {});
    onExit();
  }, [onExit, isMultiplayer]);

  // Single player mode - just exit button
  if (!isMultiplayer) {
    return (
      <m.button
        onClick={handleExit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.04, y: -1 }}
        whileTap={{ scale: 0.95 }}
        className="w-full max-w-xs bg-neo-orange text-neo-black font-black text-base py-3 px-6 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
      >
        <DoorOpen className="w-5 h-5" />
        {t('common.exit')}
      </m.button>
    );
  }

  // Multiplayer mode
  return (
    <m.div
      className="flex flex-col gap-2 w-full max-w-xs mt-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
    >
      {isHost ? (
        /* HOST: Start Game + Exit buttons */
        <>
          <m.button
            onClick={onStartGame}
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.94 }}
            className="w-full bg-neo-green text-neo-black font-black text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            {t('hostView.startGame')}
          </m.button>
          <m.button
            onClick={handleExit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-neo-red text-neo-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.leaveRoom')}
          </m.button>
        </>
      ) : isCurrentPlayerReady ? (
        /* PLAYER: Ready state (disabled) + Exit button */
        <>
          <m.button
            onClick={handleReady}
            disabled
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-full bg-neo-green/80 text-neo-black font-bold text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2 cursor-default"
          >
            <Check className="w-5 h-5" />
            {t('results.ready')}
          </m.button>
          <p className="text-center text-[10px] text-neo-white">
            {t('results.waitingForHost')}
          </p>
          <m.button
            onClick={handleExit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-neo-red text-neo-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.leaveRoom')}
          </m.button>
        </>
      ) : (
        /* PLAYER: Not ready state — bouncy attention-grab + Explanation + Exit button */
        <>
          <div className="space-y-1">
            <m.button
              onClick={handleReady}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              className="w-full bg-neo-lime text-neo-black font-black text-base py-3 px-4 uppercase border-3 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-2"
            >
              {showEmoji ? <span className="text-lg">🎯</span> : <Star className="w-5 h-5" />}
              {t('results.imReady')}
            </m.button>
            <p className="text-center text-[10px] text-neo-white">
              {t('results.readyExplanation')}
            </p>
          </div>
          <m.button
            onClick={handleExit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="w-full bg-neo-red text-neo-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-2"
          >
            <DoorOpen className="w-4 h-4" />
            {t('results.leaveRoom')}
          </m.button>
        </>
      )}
    </m.div>
  );
}
