'use client';

import { useState } from 'react';
import { ArrowLeft, Bomb, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LetterTileWord } from '@/components/singleplayer/game/components/LetterTileWord';
import ComboDisplay from '@/components/game/ComboDisplay';
import { DynamicEnergyBackground } from '@/components/singleplayer/game/components/DynamicEnergyBackground';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { BlastGrid } from './BlastGrid';
import { BlastProgressBar } from './BlastProgressBar';
import { BlastFoundWords } from './BlastFoundWords';
import { BlastHelpModal } from './BlastHelpModal';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastExplosion, BlastGameState } from './types';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';
import { cn } from '@/lib/utils';

interface BlastGameLayoutProps {
  // Grid
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  explosions: BlastExplosion[];
  // Cascade
  cascadePhase: BlastCascadePhase;
  cascadeAnimationData: CascadeAnimationData | null;
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
  // End game dialog
  showEndGameConfirm: boolean;
  setShowEndGameConfirm: (show: boolean) => void;
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
  cascadePhase,
  cascadeAnimationData,
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
  showEndGameConfirm,
  setShowEndGameConfirm,
  t,
}: BlastGameLayoutProps) {
  const { score, tilesCleared, totalTiles, isComplete, wordsFound } = gameState;
  const [showHelp, setShowHelp] = useState(false);
  const [showFoundWords, setShowFoundWords] = useState(false);

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
          <span className="hidden sm:inline">{t('common.quit') || 'QUIT'}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(true)}
          className="text-white/60 hover:text-white"
          aria-label={t('blast.helpTitle') || 'Help'}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowEndGameConfirm(true)}
          className="border-2 border-neo-black shadow-hard-sm font-bold text-xs"
        >
          <Bomb className="h-4 w-4 sm:me-1.5" />
          <span className="hidden sm:inline">{t('blast.giveUp') || 'End Game'}</span>
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
          initial={{ scale: 1.2, rotate: -1 }}
          animate={{ scale: 1, rotate: -1.5 }}
          className="border-3 border-neo-black rounded-neo shadow-hard px-3 py-1.5 min-w-[80px]"
          style={{
            background: 'linear-gradient(135deg, #FFE135 0%, #BFFF00 100%)',
          }}
        >
          <div className="text-center">
            <div className="font-black text-neo-black text-xl sm:text-2xl leading-tight tabular-nums">
              {score.toLocaleString()}
            </div>
            <div className="font-bold uppercase tracking-wider text-neo-black/60 text-[10px] sm:text-xs">
              {t('common.score') || 'Score'}
            </div>
          </div>
        </motion.div>

        {/* Words found count - clickable to expand list */}
        <button
          onClick={() => setShowFoundWords(prev => !prev)}
          className="text-center cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="font-black text-white text-xl sm:text-2xl">{wordsFound.length}</div>
          <div className="font-bold uppercase tracking-wider text-white/50 text-[10px] sm:text-xs">
            {t('common.words') || 'Words'}
          </div>
        </button>

        {/* Progress */}
        <div className="w-28 sm:w-32">
          <BlastProgressBar cleared={tilesCleared} total={totalTiles} t={t} />
        </div>
      </div>

      {/* Word Forming Area */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 relative z-30 px-4 mb-2',
        'max-w-[360px] mx-auto w-full overflow-visible',
        'min-h-[48px] rounded-neo',
        formedWord ? 'bg-white/5 border border-white/10' : ''
      )}>
        <LetterTileWord
          word={formedWord}
          feedback={currentFeedback}
        />
        {formedWord && (
          <span className="absolute end-3 text-[10px] font-bold text-white/40 tabular-nums">
            {formedWord.length}
          </span>
        )}
      </div>

      {/* Found words expandable list */}
      <AnimatePresence>
        {showFoundWords && wordsFound.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden relative z-30 px-4 max-w-[360px] mx-auto w-full"
          >
            <BlastFoundWords words={wordsFound} t={t} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game grid with overlays */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pt-2 relative z-30 min-h-0">
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
          cascadePhase={cascadePhase}
          cascadeAnimationData={cascadeAnimationData}
          onWordSubmit={onWordSubmit}
          onPathSubmit={onPathSubmit}
          onWordChange={onWordChange}
          onExplosionComplete={onExplosionComplete}
          ariaLabel={t('blast.gridLabel') || 'Letter grid'}
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

      {/* End Game Confirmation */}
      <ConfirmationDialog
        open={showEndGameConfirm}
        onOpenChange={setShowEndGameConfirm}
        title={t('blast.endGameConfirmTitle') || 'End Game?'}
        description={t('blast.endGameConfirmMessage') || 'Your current score will be saved. Are you sure you want to end this game?'}
        confirmText={t('blast.giveUp') || 'End Game'}
        cancelText={t('common.cancel') || 'Cancel'}
        onConfirm={onEndGame}
        variant="warning"
      />

      {/* Help Modal */}
      <BlastHelpModal
        open={showHelp}
        onOpenChange={setShowHelp}
        t={t}
      />
    </div>
  );
}
