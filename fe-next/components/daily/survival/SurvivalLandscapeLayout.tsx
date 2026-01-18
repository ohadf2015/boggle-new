'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GridComponent, { type HighlightedCell } from '@/components/GridComponent';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { WordFeedbackToast, type FeedbackType } from '../WordFeedbackToast';
import SwipeTipTooltip from '@/components/game/SwipeTipTooltip';
import { AutoClueNotification } from './AutoClueNotification';
import type { LetterGrid } from '@/types';
import type { HintLevel } from '@/utils/aiHintGenerator';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue, TargetAttempt } from './types';
import { MAX_ATTEMPTS } from './constants';

export interface SurvivalLandscapeLayoutProps {
  // Grid props
  grid: LetterGrid;
  isGameOver: boolean;
  isProtected: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;
  highlightedPath?: HighlightedCell[];

  // Life props
  lifePoints: number;
  isLifeGaining: boolean;
  attempts: TargetAttempt[];

  // Score props (replaces token props)
  liveScore: number;
  lastScoreIncrement: number | null;
  isScoreAnimating: boolean;

  // Clue boxes props
  currentHint: HintLevel | null;
  targetWord: string;
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  gameDir: 'ltr' | 'rtl';

  // Dialog/quit props
  showQuitConfirm: boolean;
  onQuitClick: () => void;
  onQuitConfirm: () => void;
  onQuitCancel: () => void;

  // Toast props
  feedbackType: FeedbackType | null;
  feedbackMessage: string;
  onCloseToast: () => void;

  // Guidance props
  showSwipeTip: boolean;
  onDismissSwipeTip: () => void;

  // Notification props
  activeNotifications: Array<{ id: string; clueType: 'reveal_letter' | 'reveal_category' | 'example_sentence'; timestamp: number }>;
  onDismissNotification: (id: string) => void;

  t: (key: string) => string;
}

/**
 * Landscape layout for survival mode with 3-column design
 */
export const SurvivalLandscapeLayout: React.FC<SurvivalLandscapeLayoutProps> = ({
  // Grid props
  grid,
  isGameOver,
  isProtected,
  eliminatedLetters,
  onWordSubmit,
  onWordChange,
  highlightedPath,

  // Life props
  lifePoints,
  isLifeGaining,
  attempts,

  // Score props
  liveScore,
  lastScoreIncrement,
  isScoreAnimating,

  // Clue boxes props
  currentHint,
  targetWord,
  accumulatedClues,
  revealedLetters,
  gameDir,

  // Dialog/quit props
  showQuitConfirm,
  onQuitClick,
  onQuitConfirm,
  onQuitCancel,

  // Toast props
  feedbackType,
  feedbackMessage,
  onCloseToast,

  // Guidance props
  showSwipeTip,
  onDismissSwipeTip,

  // Notification props
  activeNotifications,
  onDismissNotification,

  t,
}) => {
  return (
    <div className="relative flex items-center justify-center w-full h-screen overflow-hidden bg-slate-900 text-white">
      {/* Toast feedback */}
      <WordFeedbackToast
        type={feedbackType}
        message={feedbackMessage}
        onClose={onCloseToast}
      />

      {/* Swipe tip guidance */}
      <SwipeTipTooltip
        isVisible={showSwipeTip}
        onDismiss={onDismissSwipeTip}
        t={t}
      />

      {/* Left Side Panel - Life & Tries */}
      <LeftPanel
        lifePoints={lifePoints}
        isGameOver={isGameOver}
        isLifeGaining={isLifeGaining}
        attemptsCount={attempts.length}
        t={t}
      />

      {/* Right Side Panel - Score */}
      <RightPanel
        liveScore={liveScore}
        lastScoreIncrement={lastScoreIncrement}
        isScoreAnimating={isScoreAnimating}
        t={t}
      />

      {/* Bottom-left: Quit button */}
      <div className="absolute bottom-2 left-2 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuitClick}
          className="w-12 h-12 p-0 bg-neo-red hover:brightness-110 border-2 border-neo-black rounded-neo flex items-center justify-center shadow-hard-sm"
        >
          <X className="text-lg text-neo-cream" />
        </Button>
      </div>

      {/* Center: Target Word + Grid */}
      <div className="flex flex-col items-center justify-center w-full h-full px-[80px] sm:px-[100px] md:px-[120px] lg:px-[150px] py-2 gap-2 landscape-grid-container">
        {/* Target word hint boxes - compact for landscape */}
        {currentHint && (
          <LandscapeClueBoxes
            currentHint={currentHint}
            targetWord={targetWord}
            accumulatedClues={accumulatedClues}
            revealedLetters={revealedLetters}
            attempts={attempts}
            isProtected={isProtected}
            gameDir={gameDir}
          />
        )}

        {/* Grid - centered */}
        <div className="flex-1 flex items-center justify-center game-board-frame-landscape" style={{ aspectRatio: '1/1' }}>
          <div className={cn(
            "transition-all duration-200",
            isProtected && "blur-xl pointer-events-none select-none"
          )}>
            <GridComponent
              grid={grid}
              interactive={!isGameOver && !isProtected}
              onWordSubmit={onWordSubmit}
              onWordChange={onWordChange}
              hideWordPreview
              hideComboIndicator
              comboLevel={0}
              eliminatedLetters={eliminatedLetters}
              highlightedPath={highlightedPath}
              disableLetterKeyInput={true}
            />
          </div>
        </div>
      </div>

      {/* Auto-Clue Notifications */}
      <AnimatePresence>
        {activeNotifications.map((notification) => (
          <AutoClueNotification
            key={notification.id}
            clueType={notification.clueType}
            onDismiss={() => onDismissNotification(notification.id)}
            direction={gameDir}
            t={t}
          />
        ))}
      </AnimatePresence>

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={onQuitCancel}
        onConfirm={onQuitConfirm}
        title={t('wordHunt.quitConfirmTitle') || 'Quit Game?'}
        description={t('wordHunt.quitConfirmMessage') || 'You will lose your current progress.'}
        confirmText={t('common.quit') || 'Quit'}
        cancelText={t('common.cancel') || 'Cancel'}
        variant="danger"
      />
    </div>
  );
};

// Sub-components

interface LeftPanelProps {
  lifePoints: number;
  isGameOver: boolean;
  isLifeGaining: boolean;
  attemptsCount: number;
  t: (key: string) => string;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  lifePoints,
  isGameOver,
  isLifeGaining,
  attemptsCount,
  t,
}) => (
  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 landscape-side-panel">
    <div className="landscape-panel flex flex-col items-center gap-4">
      {/* Life Heart Icon */}
      <motion.div
        className={cn(
          "flex items-center justify-center w-14 h-14 rounded-full border-3 border-neo-black shadow-hard",
          lifePoints > 66 ? "bg-green-500" : lifePoints > 33 ? "bg-yellow-500" : "bg-red-500",
          isLifeGaining && "heart-beating"
        )}
        animate={
          lifePoints <= 20 && !isGameOver && !isLifeGaining
            ? { scale: [1, 1.15, 1] }
            : {}
        }
        transition={{ duration: 0.6, repeat: lifePoints <= 20 && !isLifeGaining ? Infinity : 0 }}
      >
        <Heart className="w-7 h-7 text-white fill-white" />
      </motion.div>

      {/* Life Points */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "landscape-stat-secondary",
          lifePoints > 66 ? "text-green-600" : lifePoints > 33 ? "text-yellow-600" : "text-red-600"
        )}>
          {Math.floor(lifePoints)}%
        </div>
        <div className="landscape-stat-label text-neo-black">LIFE</div>
      </div>

      {/* Tries Remaining */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "landscape-stat-secondary text-neo-black",
          MAX_ATTEMPTS - attemptsCount <= 2 && "text-red-600"
        )}>
          {MAX_ATTEMPTS - attemptsCount}
        </div>
        <div className="landscape-stat-label text-neo-black">
          {t('wordHunt.survival.triesLeft') || 'TRIES'}
        </div>
      </div>
    </div>
  </div>
);

interface RightPanelProps {
  liveScore: number;
  lastScoreIncrement: number | null;
  isScoreAnimating: boolean;
  t: (key: string) => string;
}

const RightPanel: React.FC<RightPanelProps> = ({
  liveScore,
  lastScoreIncrement,
  isScoreAnimating,
  t,
}) => (
  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 landscape-side-panel">
    <div className="landscape-panel flex flex-col items-center gap-4">
      {/* Live Score Display */}
      <motion.div
        className="flex flex-col items-center px-4 py-3 bg-neo-yellow border-neo border-neo-black rounded-neo shadow-hard-sm"
        animate={isScoreAnimating ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{
          duration: 0.4,
          type: 'spring',
          damping: 15,
          stiffness: 300,
        }}
      >
        <div className="landscape-stat-label text-neo-black mb-1">
          {t('wordHunt.survival.accumulatedScore') || 'SCORE'}
        </div>
        <div className="landscape-stat-primary text-neo-black font-black">
          {Math.max(0, Math.round(liveScore))}
        </div>

        {/* Last increment badge */}
        {lastScoreIncrement !== null && lastScoreIncrement > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-[10px] font-bold text-green-600"
          >
            +{Math.round(lastScoreIncrement)}
          </motion.div>
        )}
      </motion.div>
    </div>
  </div>
);

interface LandscapeClueBoxesProps {
  currentHint: HintLevel;
  targetWord: string;
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  attempts: TargetAttempt[];
  isProtected: boolean;
  gameDir: 'ltr' | 'rtl';
}

const LandscapeClueBoxes: React.FC<LandscapeClueBoxesProps> = ({
  currentHint,
  targetWord,
  accumulatedClues,
  revealedLetters,
  attempts,
  isProtected,
  gameDir,
}) => {
  const hintChars = currentHint.hint.split(' ').filter(c => c !== '');
  const wordLength = hintChars.length;
  const sizeClass = wordLength <= 4
    ? "w-9 h-9 text-base"
    : wordLength <= 6
      ? "w-8 h-8 text-sm"
      : "w-7 h-7 text-xs";

  // Compute persisted letters from attempts (most recent yellow/green at each position)
  // Priority: green > yellow (from most recent to oldest attempt)
  const persistedLetters = React.useMemo(() => {
    const result = new Map<number, { letter: string; type: 'green' | 'yellow' }>();

    // Process attempts in order (older to newer) so newer overwrites older
    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'green') {
          // Green always wins at this position
          result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'green' });
        } else if (fb.feedback === 'yellow') {
          // Yellow only sets if no green exists at this position yet
          const existing = result.get(fb.position);
          if (!existing || existing.type !== 'green') {
            result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'yellow' });
          }
        }
        // Gray letters don't persist
      }
    }

    return result;
  }, [attempts]);

  return (
    <div
      dir={gameDir}
      className={cn(
        "flex justify-center flex-wrap gap-1.5 mb-2 p-2 rounded-neo bg-neo-navy/30 border-2 border-neo-black/20",
        isProtected && "blur-xl select-none"
      )}
    >
      {hintChars.map((char, idx) => {
        const accumulatedClue = accumulatedClues.get(idx);
        const persistedLetter = persistedLetters.get(idx);
        const isHintRevealed = char !== '_';
        const isShopRevealed = revealedLetters.has(idx);

        let displayChar: string;
        let bgClass: string;

        // Priority: green from accumulatedClues > shop revealed > hint revealed > persisted letter > unknown
        if (accumulatedClue) {
          displayChar = accumulatedClue.letter;
          bgClass = accumulatedClue.type === 'green'
            ? "bg-green-500 border-green-700 text-white"
            : "bg-yellow-500 border-yellow-600 text-neo-black";
        } else if (isShopRevealed) {
          displayChar = targetWord[idx]?.toUpperCase() || '?';
          bgClass = "bg-green-500 border-green-700 text-white";
        } else if (isHintRevealed) {
          displayChar = char.toUpperCase();
          bgClass = "bg-neo-pink border-neo-pink text-white";
        } else if (persistedLetter) {
          // Show persisted yellow/green letter from previous guesses
          displayChar = persistedLetter.letter;
          bgClass = persistedLetter.type === 'green'
            ? "bg-green-500 border-green-700 text-white"
            : "bg-yellow-500 border-yellow-600 text-neo-black";
        } else {
          displayChar = '';
          bgClass = "bg-neo-black border-neo-black";
        }

        return (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-center border-2 rounded-neo font-bold shadow-hard-sm",
              sizeClass,
              bgClass
            )}
          >
            {displayChar}
          </div>
        );
      })}
    </div>
  );
};
