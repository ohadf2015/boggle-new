'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, DoorOpen, Star, Check, ArrowRight, ArrowLeft, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ============================================================
// SINGLE PLAYER ACTION BUTTONS
// ============================================================

interface SinglePlayerActionsProps {
  onQuickRematch?: () => void;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  /** Optional callback to view training progress (practice mode) */
  onViewTrainingProgress?: () => void;
  /** Display variant */
  variant?: 'desktop' | 'mobile' | 'landscape';
  className?: string;
}

/**
 * SinglePlayerActions - Action buttons for single player results
 *
 * @example
 * ```tsx
 * <SinglePlayerActions
 *   onQuickRematch={handleQuickRematch}
 *   onPlayAgain={handlePlayAgain}
 *   onBackToLobby={handleBackToLobby}
 *   variant="desktop"
 * />
 * ```
 */
export const SinglePlayerActions: React.FC<SinglePlayerActionsProps> = memo(({
  onQuickRematch,
  onPlayAgain,
  onBackToLobby,
  onViewTrainingProgress,
  variant = 'desktop',
  className,
}) => {
  const { t } = useLanguage();

  // Landscape mode - compact horizontal layout
  if (variant === 'landscape') {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {/* Training Progress Button - for practice mode */}
        {onViewTrainingProgress && (
          <Button
            size="sm"
            onClick={onViewTrainingProgress}
            className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-xs border-2 border-neo-black"
          >
            <BarChart3 className="me-1 w-3.5 h-3.5" />
            {t('training.viewProgress') || 'View Progress'}
          </Button>
        )}
        {onQuickRematch && (
          <motion.div className="relative">
            <motion.div
              className="absolute -inset-0.5 rounded-neo bg-gradient-to-r from-neo-lime via-neo-lime to-neo-lime opacity-60 blur-[2px]"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <Button
              size="sm"
              className="relative w-full py-2 bg-gradient-to-r from-neo-lime to-neo-lime hover:brightness-105 text-neo-black font-bold text-xs border-2 border-neo-black overflow-hidden"
              onClick={onQuickRematch}
            >
              {t('common.rematch') || 'Rematch'}
            </Button>
          </motion.div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full py-2 font-bold text-xs border-2 border-neo-black"
          onClick={onBackToLobby}
        >
          <ArrowLeft className="me-1 w-3.5 h-3.5 rtl:rotate-180" />
          {t('common.back') || 'Back'}
        </Button>
      </div>
    );
  }

  // Desktop and Mobile variants - similar layout
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Training Progress Button - for practice mode */}
      {onViewTrainingProgress && (
        <Button
          onClick={onViewTrainingProgress}
          className="w-full py-4 text-base font-bold rounded-xl transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl border-2 border-neo-black"
        >
          <BarChart3 className="w-5 h-5" />
          {t('training.viewProgress') || 'View Training Progress'}
        </Button>
      )}

      {/* Primary CTA - Quick Rematch (with enhanced animation) */}
      {onQuickRematch && (
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* Pulsing glow behind button */}
          <motion.div
            className="absolute -inset-1 rounded-neo-lg bg-gradient-to-r from-neo-lime via-neo-lime to-neo-lime opacity-75 blur-sm"
            animate={{
              opacity: [0.5, 0.8, 0.5],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <Button
            size="lg"
            className="relative w-full py-5 text-xl shadow-hard-xl hover:shadow-hard-2xl border-4 border-neo-black bg-gradient-to-r from-neo-lime via-neo-lime to-neo-lime text-neo-black font-black uppercase tracking-wider overflow-hidden group"
            onClick={onQuickRematch}
            style={{ textShadow: '1px 1px 0px var(--neo-cyan)' }}
          >
            {/* Animated shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
              animate={{ x: ['-200%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
            />
            <span className="relative z-10">{t('common.quickRematch') || 'Quick Rematch'}</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="ms-2"
            >
              <ArrowRight className="w-6 h-6 rtl:rotate-180" />
            </motion.span>
          </Button>
        </motion.div>
      )}

      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full py-2 text-xs text-neo-black/70 dark:text-white/70 hover:text-neo-black dark:hover:text-white hover:bg-neo-cream/50 dark:hover:bg-slate-700/50 border border-neo-black/20 dark:border-white/20"
        onClick={onBackToLobby}
      >
        <ArrowLeft className="me-1 w-3.5 h-3.5 rtl:rotate-180" />
        {t('common.back') || 'Back'}
      </Button>
    </div>
  );
});

SinglePlayerActions.displayName = 'SinglePlayerActions';

// ============================================================
// MULTIPLAYER ACTION BUTTONS
// ============================================================

interface MultiplayerActionsProps {
  isHost: boolean;
  isCurrentPlayerReady: boolean;
  onStartGame: () => void;
  onMarkReady: () => void;
  onReturnToRoom: () => void;
  onExitRoom: () => void;
  /** Display variant */
  variant?: 'desktop' | 'mobile' | 'landscape';
  className?: string;
}

/**
 * MultiplayerActions - Action buttons for multiplayer results
 *
 * Shows different buttons based on:
 * - Host: Start Game button
 * - Player (not ready): I'm Ready button
 * - Player (ready): Ready confirmation with Go to Lobby option
 *
 * @example
 * ```tsx
 * <MultiplayerActions
 *   isHost={true}
 *   isCurrentPlayerReady={false}
 *   onStartGame={handleStartGame}
 *   onMarkReady={handleMarkReady}
 *   onReturnToRoom={handleReturnToRoom}
 *   onExitRoom={handleExitRoom}
 *   variant="desktop"
 * />
 * ```
 */
export const MultiplayerActions: React.FC<MultiplayerActionsProps> = memo(({
  isHost,
  isCurrentPlayerReady,
  onStartGame,
  onMarkReady,
  onReturnToRoom,
  onExitRoom,
  variant = 'desktop',
  className,
}) => {
  const { t } = useLanguage();

  // Landscape mode - compact horizontal layout
  if (variant === 'landscape') {
    return (
      <div className={cn('flex gap-2', className)}>
        {isHost ? (
          <>
            <button
              onClick={onStartGame}
              className="flex-1 bg-emerald-500 text-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3" />
              {t('hostView.startGame') || 'Start Game'}
            </button>
            <button
              onClick={onExitRoom}
              className="flex-1 bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
            >
              <DoorOpen className="w-3 h-3" />
              {t('results.leaveRoom')}
            </button>
          </>
        ) : isCurrentPlayerReady ? (
          <>
            <button
              onClick={onReturnToRoom}
              className="flex-1 bg-emerald-500 text-white font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" />
              {t('results.ready')}
            </button>
            <button
              onClick={onExitRoom}
              className="flex-1 bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
            >
              <DoorOpen className="w-3 h-3" />
              {t('results.leaveRoom')}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onMarkReady}
              className="flex-1 bg-neo-lime text-neo-black font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
            >
              <Star className="w-3 h-3" />
              {t('results.imReady')}
            </button>
            <button
              onClick={onExitRoom}
              className="flex-1 bg-neo-red text-neo-cream font-bold text-sm py-2 px-3 uppercase border-2 border-neo-black rounded-neo shadow-hard-sm flex items-center justify-center gap-1"
            >
              <DoorOpen className="w-3 h-3" />
              {t('results.leaveRoom')}
            </button>
          </>
        )}
      </div>
    );
  }

  // Mobile variant - compact buttons
  if (variant === 'mobile') {
    return (
      <div className={cn('space-y-2', className)}>
        {isHost ? (
          <button
            onClick={onStartGame}
            className="w-full bg-emerald-500 text-white font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] hover:scale-[1.01]"
          >
            <Play className="w-6 h-6" />
            {t('hostView.startGame') || 'Start Game'}
          </button>
        ) : isCurrentPlayerReady ? (
          <div className="bg-emerald-500 text-white border-3 border-neo-black rounded-neo p-3 shadow-hard">
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              <span className="font-black uppercase">{t('results.youAreReady')}</span>
            </div>
            <p className="text-center text-sm text-white/80 mt-1">
              {t('results.waitingForHostToStart') || 'Waiting for host...'}
            </p>
          </div>
        ) : (
          <button
            onClick={onMarkReady}
            className="w-full bg-neo-lime text-neo-black font-black text-lg px-6 py-4 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98] hover:scale-[1.01]"
          >
            <Star className="w-6 h-6" />
            {t('results.imReady')}
          </button>
        )}

        {/* Secondary Actions Row */}
        <div className="flex gap-2">
          {!isHost && !isCurrentPlayerReady && (
            <button
              onClick={onExitRoom}
              className="flex-1 bg-neo-red text-neo-cream font-bold text-sm px-4 py-2.5 uppercase border-2 border-neo-black rounded-neo shadow-hard flex items-center justify-center gap-1"
            >
              <DoorOpen className="w-4 h-4" />
              {t('results.leaveRoom')}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop variant - large prominent buttons
  if (isHost) {
    return (
      <DesktopHostActions
        onStartGame={onStartGame}
        onExitRoom={onExitRoom}
        className={className}
      />
    );
  }

  if (isCurrentPlayerReady) {
    return (
      <DesktopReadyActions
        onReturnToRoom={onReturnToRoom}
        onExitRoom={onExitRoom}
        className={className}
      />
    );
  }

  return (
    <DesktopNotReadyActions
      onMarkReady={onMarkReady}
      onExitRoom={onExitRoom}
      className={className}
    />
  );
});

MultiplayerActions.displayName = 'MultiplayerActions';

// ============================================================
// DESKTOP MULTIPLAYER SUB-COMPONENTS
// ============================================================

interface DesktopHostActionsProps {
  onStartGame: () => void;
  onExitRoom: () => void;
  className?: string;
}

const DesktopHostActions: React.FC<DesktopHostActionsProps> = memo(({
  onStartGame,
  onExitRoom,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
      className={cn('bg-neo-lime text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 sm:p-8 relative overflow-hidden', className)}
    >
      {/* Attention-grabbing pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
        backgroundImage: 'radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />
      <div className="text-center space-y-5 relative z-10">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black uppercase" style={{ textShadow: '3px 3px 0px var(--neo-cyan)' }}>
            {t('results.readyForNextRound') || 'Ready for Next Round?'}
          </h3>
        </div>
        <p className="text-neo-black/80 text-base font-bold max-w-md mx-auto">
          {t('results.hostStartDescription') || 'Start a new game when everyone is ready!'}
        </p>

        {/* HUGE Start Game Button for Host */}
        <button
          onClick={onStartGame}
          className="w-full sm:w-auto bg-emerald-500 text-white font-black text-xl sm:text-2xl px-12 py-5 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl transition-all flex items-center justify-center gap-3 mx-auto hover:scale-[1.02] hover:-translate-x-0.5 hover:-translate-y-0.5 active:scale-[0.98] active:translate-x-0.5 active:translate-y-0.5"
        >
          <Play className="w-7 h-7" />
          {t('hostView.startGame') || 'Start Game'}
          <Play className="w-7 h-7" />
        </button>

        <button
          onClick={onExitRoom}
          className="bg-neo-red text-neo-cream font-bold text-sm px-6 py-2.5 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2 mx-auto mt-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
        >
          <DoorOpen className="w-4 h-4" />
          {t('results.leaveRoom')}
        </button>
      </div>
    </motion.div>
  );
});

DesktopHostActions.displayName = 'DesktopHostActions';

interface DesktopReadyActionsProps {
  onReturnToRoom: () => void;
  onExitRoom: () => void;
  className?: string;
}

const DesktopReadyActions: React.FC<DesktopReadyActionsProps> = memo(({
  onReturnToRoom,
  onExitRoom,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
      className={cn('bg-emerald-500 text-white border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 sm:p-8 relative overflow-hidden', className)}
    >
      {/* Success pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
      }} />
      <div className="text-center space-y-4 relative z-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="flex items-center justify-center gap-4"
        >
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-neo-black shadow-hard text-neo-black">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
        </motion.div>
        <h3 className="text-2xl sm:text-3xl font-black uppercase" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}>
          {t('results.youAreReady')}
        </h3>
        <p className="text-white/90 text-base font-bold">
          {t('results.waitingForHostToStart') || 'Waiting for host to start the next round...'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
          <button
            onClick={onReturnToRoom}
            className="bg-white text-neo-black font-black text-base px-6 py-3 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
          >
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
            {t('results.goToLobby')}
          </button>
          <button
            onClick={onExitRoom}
            className="bg-neo-red text-neo-cream font-black text-base px-6 py-3 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
          >
            <DoorOpen className="w-5 h-5" />
            {t('results.leaveRoom')}
          </button>
        </div>
      </div>
    </motion.div>
  );
});

DesktopReadyActions.displayName = 'DesktopReadyActions';

interface DesktopNotReadyActionsProps {
  onMarkReady: () => void;
  onExitRoom: () => void;
  className?: string;
}

const DesktopNotReadyActions: React.FC<DesktopNotReadyActionsProps> = memo(({
  onMarkReady,
  onExitRoom,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4, type: 'spring' }}
      className={cn('bg-neo-lime text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-xl p-6 sm:p-8 relative overflow-hidden', className)}
    >
      {/* Attention-grabbing pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]" style={{
        backgroundImage: 'radial-gradient(circle, rgb(var(--neo-black)) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }} />
      <div className="text-center space-y-5 relative z-10">
        <div>
          <h3 className="text-2xl sm:text-3xl font-black uppercase" style={{ textShadow: '3px 3px 0px var(--neo-pink)' }}>
            {t('results.playAgainQuestion')}
          </h3>
        </div>
        <p className="text-neo-black/80 text-base font-bold max-w-md mx-auto">
          {t('results.markReadyDescription') || 'Click below to let the host know you\'re ready for the next round'}
        </p>

        {/* HUGE I'm Ready Button */}
        <button
          onClick={onMarkReady}
          className="w-full sm:w-auto bg-neo-lime text-neo-black font-black text-xl sm:text-2xl px-12 py-5 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard-xl transition-all flex items-center justify-center gap-3 mx-auto hover:scale-[1.02] hover:-translate-x-0.5 hover:-translate-y-0.5 active:scale-[0.98] active:translate-x-0.5 active:translate-y-0.5"
        >
          <Star className="w-7 h-7" />
          {t('results.imReady')}
          <Star className="w-7 h-7" />
        </button>

        <button
          onClick={onExitRoom}
          className="bg-neo-red text-neo-cream font-bold text-sm px-6 py-2.5 uppercase border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg transition-all flex items-center justify-center gap-2 mx-auto mt-2 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5"
        >
          <DoorOpen className="w-4 h-4" />
          {t('results.leaveRoom')}
        </button>
      </div>
    </motion.div>
  );
});

DesktopNotReadyActions.displayName = 'DesktopNotReadyActions';
