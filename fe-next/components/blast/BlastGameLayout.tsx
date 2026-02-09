'use client';

import React from 'react';
import { ArrowLeft, Bomb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LetterTileWord } from '@/components/singleplayer/game/components/LetterTileWord';
import ComboDisplay from '@/components/game/ComboDisplay';
import { DynamicEnergyBackground } from '@/components/singleplayer/game/components/DynamicEnergyBackground';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { BlastGrid } from './BlastGrid';
import { BlastProgressBar } from './BlastProgressBar';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastExplosion, BlastGameState } from './types';
import { cn } from '@/lib/utils';

interface BlastGameLayoutProps {
  // Grid
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  explosions: BlastExplosion[];
  // Game state
  gameState: BlastGameState;
  // Combo
  comboLevel: number;
  comboTimeRemaining: number | null;
  comboDanger: boolean;
  // Word forming
  formedWord: string;
  currentFeedback: WordFeedback | null;
  // Handlers
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  onExplosionComplete: (id: string) => void;
  onQuitRequest: () => void;
  onConfirmQuit: () => void;
  onEndGame: () => void;
  // Quit dialog
  showQuitConfirm: boolean;
  setShowQuitConfirm: (show: boolean) => void;
  // Translation
  t: (key: string) => string | undefined;
}

/**
 * BlastGameLayout - Portrait layout for Blast Mode.
 * Simplified from PortraitGameLayout: no timer (untimed), progress bar instead.
 */
export function BlastGameLayout({
  grid,
  tileStates,
  gridSize,
  language,
  explosions,
  gameState,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  formedWord,
  currentFeedback,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onExplosionComplete,
  onQuitRequest,
  onConfirmQuit,
  onEndGame,
  showQuitConfirm,
  setShowQuitConfirm,
  t,
}: BlastGameLayoutProps) {
  const { score, tilesCleared, totalTiles, isComplete, wordsFound } = gameState;

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden h-full bg-neo-navy">
      <DynamicEnergyBackground />

      {/* Header */}
      <header className="flex items-center justify-between px-4 shrink-0 relative z-30 pt-4 pb-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onQuitRequest}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold text-xs tracking-widest"
        >
          <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" />
          {t('common.quit') || 'QUIT'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onEndGame}
          className="border-2 border-neo-black shadow-hard-sm font-bold text-xs"
        >
          <Bomb className="me-1.5 h-4 w-4" />
          {t('blast.giveUp') || 'End Game'}
        </Button>
      </header>

      {/* Combo Display */}
      <div className="h-8 flex items-center justify-center shrink-0 relative z-30">
        <ComboDisplay
          comboLevel={comboLevel}
          compact
          timeRemaining={comboTimeRemaining}
          isDanger={comboDanger}
        />
      </div>

      {/* Stats row: Score (left), Words (center), Progress (right) */}
      <div className="px-4 flex items-center justify-between shrink-0 relative z-30 mb-2 max-w-md mx-auto w-full">
        {/* Score */}
        <motion.div
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="border-3 border-neo-black rounded-lg shadow-hard px-3 py-1 min-w-[70px]"
          style={{
            background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
          }}
        >
          <div className="text-center">
            <div className="font-black text-neo-black text-lg leading-tight">
              {score.toLocaleString()}
            </div>
            <div className="font-bold uppercase tracking-wider text-neo-black/60 text-[8px]">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </motion.div>

        {/* Words found count */}
        <div className="text-center">
          <div className="font-black text-white text-lg">{wordsFound.length}</div>
          <div className="font-bold uppercase tracking-wider text-white/50 text-[8px]">
            {t('common.words') || 'Words'}
          </div>
        </div>

        {/* Progress */}
        <div className="w-24">
          <BlastProgressBar cleared={tilesCleared} total={totalTiles} t={t} />
        </div>
      </div>

      {/* Word Forming Area */}
      <div className="h-12 flex items-center justify-center flex-shrink-0 relative z-30 px-4 mb-2 max-w-[360px] mx-auto w-full overflow-visible">
        <LetterTileWord
          word={formedWord}
          feedback={currentFeedback}
        />
      </div>

      {/* Game grid with overlays */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-2 relative z-30 min-h-[200px]">
        {/* Board complete celebration overlay */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center"
            >
              <div className={cn(
                'px-8 py-4 rounded-neo border-3 border-neo-black shadow-hard-lg',
                'bg-gradient-to-br from-neo-lime via-yellow-300 to-neo-orange',
                'text-center'
              )}>
                <div className="text-2xl font-black uppercase text-neo-black">
                  {t('blast.complete') || 'Board Cleared!'}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <BlastGrid
          grid={grid}
          tileStates={tileStates}
          gridSize={gridSize}
          explosions={explosions}
          language={language}
          interactive={!isComplete}
          comboLevel={comboLevel}
          onWordSubmit={onWordSubmit}
          onPathSubmit={onPathSubmit}
          onWordChange={onWordChange}
          onExplosionComplete={onExplosionComplete}
        />
      </div>

      {/* Quit Confirmation */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle') || 'Quit Game?'}
        description={t('singlePlayer.quitConfirmMessage') || 'You will lose your current progress. Are you sure you want to quit?'}
        confirmText={t('singlePlayer.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={onConfirmQuit}
        variant="danger"
      />
    </div>
  );
}
