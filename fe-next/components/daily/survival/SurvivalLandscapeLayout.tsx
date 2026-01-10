'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, X, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GridComponent from '@/components/GridComponent';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { WordFeedbackToast, type FeedbackType } from '../WordFeedbackToast';
import SwipeTipTooltip from '@/components/game/SwipeTipTooltip';
import type { LetterGrid } from '@/types';
import type { HintLevel, ClueShopItem } from '@/utils/aiHintGenerator';
import type { AccumulatedClue } from './types';
import { MAX_ATTEMPTS } from './constants';

export interface SurvivalLandscapeLayoutProps {
  // Grid props
  grid: LetterGrid;
  isGameOver: boolean;
  isProtected: boolean;
  eliminatedLetters: Set<string>;
  onWordSubmit: (word: string) => void;
  onWordChange: (word: string, count: number) => void;

  // Life props
  lifePoints: number;
  isLifeGaining: boolean;
  attempts: { word: string; timestamp: number }[];

  // Token props
  clueTokens: number;
  nextHintItem: ClueShopItem | null;
  onBuyNextHint: () => void;
  isClueGaining: boolean;

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

  // Life props
  lifePoints,
  isLifeGaining,
  attempts,

  // Token props
  clueTokens,
  nextHintItem,
  onBuyNextHint,
  isClueGaining,

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

      {/* Right Side Panel - Tokens */}
      <RightPanel
        clueTokens={clueTokens}
        nextHintItem={nextHintItem}
        onBuyNextHint={onBuyNextHint}
        isClueGaining={isClueGaining}
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
            />
          </div>
        </div>
      </div>

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
  clueTokens: number;
  nextHintItem: ClueShopItem | null;
  onBuyNextHint: () => void;
  isClueGaining: boolean;
}

const RightPanel: React.FC<RightPanelProps> = ({
  clueTokens,
  nextHintItem,
  onBuyNextHint,
  isClueGaining,
}) => (
  <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 landscape-side-panel">
    <div className="landscape-panel flex flex-col items-center gap-4">
      {/* Next Hint Progress (Auto-unlocks) */}
      {nextHintItem && (
        <div className="flex flex-col items-center justify-center p-2 rounded-neo border-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 w-16 h-16 shadow-inner gap-1">
          <span className="text-[10px] leading-tight text-center font-bold text-gray-500">
            Next Hint
          </span>
          <span className="flex items-center text-xs font-black text-amber-600">
            {clueTokens}/{nextHintItem.cost}
          </span>
          <div className="w-full h-1 bg-gray-300 rounded overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300" 
              style={{ width: `${Math.min(100, (clueTokens / nextHintItem.cost) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Clue Tokens - auto-spend as you earn (wait, now manual?) */}
      <motion.div
        className="flex flex-col items-center px-3 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 border-2 border-neo-black rounded-neo"
        animate={clueTokens > 0 ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-1">
          <Coins
            className={cn("w-6 h-6 text-amber-500", isClueGaining && "animate-bounce")}
          />
          <span className="landscape-stat-secondary text-neo-black">{clueTokens}</span>
        </div>
        <div className="landscape-stat-label text-neo-black">COINS</div>
      </motion.div>
    </div>
  </div>
);

interface LandscapeClueBoxesProps {
  currentHint: HintLevel;
  targetWord: string;
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  isProtected: boolean;
  gameDir: 'ltr' | 'rtl';
}

const LandscapeClueBoxes: React.FC<LandscapeClueBoxesProps> = ({
  currentHint,
  targetWord,
  accumulatedClues,
  revealedLetters,
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
        const isHintRevealed = char !== '_';
        const isShopRevealed = revealedLetters.has(idx);

        let displayChar: string;
        let bgClass: string;

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
