'use client';

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import ExitRoomButton from '@/components/ExitRoomButton';
import HintButton from '@/components/HintButton';
import type { HintsState, TranslationFn } from '../types';

interface GameHeaderProps {
  onExitRoom?: () => void;
  onShowTutorial?: () => void;
  hints?: HintsState;
  gameActive: boolean;
  t: TranslationFn;
  /** Size variant for the header */
  variant?: 'mobile' | 'desktop' | 'landscape';
}

/**
 * GameHeader - Exit button, tutorial button, and hints (single-player)
 */
export const GameHeader = memo<GameHeaderProps>(function GameHeader({
  onExitRoom,
  onShowTutorial,
  hints,
  gameActive,
  t,
  variant = 'mobile',
}) {
  const isMobile = variant === 'mobile';
  const isLandscape = variant === 'landscape';
  const isDesktop = variant === 'desktop';

  // Mobile header (horizontal bar at top)
  if (isMobile) {
    return (
      <div className="lg:hidden w-full flex items-center justify-between px-1 py-0.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {onExitRoom && (
            <ExitRoomButton
              onClick={onExitRoom}
              label={t('playerView.exit')}
              className="relative z-50 !min-h-[40px] !border-2"
            />
          )}
          {onShowTutorial && (
            <motion.button
              onClick={onShowTutorial}
              whileTap={{ scale: 0.95 }}
              className="w-8 h-8 bg-neo-pink/90 border-2 border-neo-black rounded-full shadow-hard-sm flex items-center justify-center"
              aria-label={t('help.viewTutorial') || 'View Tutorial'}
            >
              <HelpCircle className="w-3.5 h-3.5 text-neo-cream" />
            </motion.button>
          )}
        </div>

        {/* Hint Button - Single Player Mode Only */}
        {hints && hints.isSinglePlayer && (
          <HintButton
            hint={hints.hint}
            hintType={hints.hintType}
            hintsRemaining={hints.hintsRemaining}
            wordLength={hints.wordLength}
            firstLetter={hints.firstLetter}
            isLoading={hints.isLoading}
            error={hints.error}
            isAvailable={hints.isAvailable}
            isSinglePlayer={hints.isSinglePlayer}
            gameActive={gameActive}
            onRequestHint={hints.requestHint}
            onClearHint={hints.clearHint}
            t={t}
          />
        )}
      </div>
    );
  }

  // Desktop header (absolutely positioned)
  if (isDesktop) {
    return (
      <div className="absolute left-2 rtl:left-auto rtl:right-2 md:left-4 md:rtl:right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2 z-30">
        {onExitRoom && (
          <ExitRoomButton
            onClick={onExitRoom}
            label={t('playerView.exit')}
            className="w-10 h-10 md:w-12 md:h-12"
          />
        )}
        {onShowTutorial && (
          <motion.button
            onClick={onShowTutorial}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 md:w-10 md:h-10 bg-neo-pink/90 border-2 border-neo-black rounded-full shadow-hard flex items-center justify-center hover:bg-neo-pink transition-colors"
            aria-label={t('help.viewTutorial') || 'View Tutorial'}
          >
            <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-neo-cream" />
          </motion.button>
        )}
        {hints && hints.isSinglePlayer && (
          <HintButton
            hint={hints.hint}
            hintType={hints.hintType}
            hintsRemaining={hints.hintsRemaining}
            wordLength={hints.wordLength}
            firstLetter={hints.firstLetter}
            isLoading={hints.isLoading}
            error={hints.error}
            isAvailable={hints.isAvailable}
            isSinglePlayer={hints.isSinglePlayer}
            gameActive={gameActive}
            onRequestHint={hints.requestHint}
            onClearHint={hints.clearHint}
            t={t}
          />
        )}
      </div>
    );
  }

  // Landscape header (bottom action bar with exit and tutorial)
  return (
    <div className="flex items-center gap-2">
      {onExitRoom && (
        <ExitRoomButton onClick={onExitRoom} label={t('playerView.exit')} className="w-12 h-12" />
      )}
      {onShowTutorial && (
        <motion.button
          onClick={onShowTutorial}
          whileTap={{ scale: 0.95 }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] bg-neo-pink/90 border-2 border-neo-black rounded-full shadow-hard flex items-center justify-center hover:bg-neo-pink transition-colors"
          aria-label={t('help.viewTutorial') || 'View Tutorial'}
        >
          <HelpCircle className="w-5 h-5 text-neo-cream" />
        </motion.button>
      )}
    </div>
  );
});
