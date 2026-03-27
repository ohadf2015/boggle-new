'use client';

import { Shuffle } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { BlastHUD } from './BlastHUD';
import { BlastBoard } from './BlastBoard';
import BlastChainText from './BlastChainText';
import { BlastEffectsLayer } from './BlastEffectsLayer';
import type { ScoreFlyEvent } from './BlastScoreFly';
import { cn } from '@/lib/utils';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastGameState, BlastObjectiveProgress } from './types';
import type { SequencerState } from './hooks/useBlastSequencer';

interface BlastStageProps {
  // From engine
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  gameState: BlastGameState;
  // Wave
  waveNumber: number;
  // Combo
  comboLevel: number;
  // Objectives
  objectiveProgress?: BlastObjectiveProgress[];
  // Word forming
  formedWord: string;
  currentFeedback: WordFeedback | null;
  // Grid interaction
  interactive: boolean;
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  // Controls
  onShuffle: () => void;
  onQuit: () => void;
  onShowHelp?: () => void;
  // Animation sequencer
  sequencerState?: SequencerState;
  // Dead end
  noWordsRemaining: boolean;
  // Effects
  scoreFlyEvents?: ScoreFlyEvent[];
  onScoreFlyComplete?: (id: string) => void;
  comboFlash?: { id: string; tier: 1 | 2 | 3 } | null;
  onComboFlashComplete?: () => void;
  // Translation
  t: (key: string) => string | undefined;
}

/**
 * BlastStage — layout shell composing HUD + word forming + board + dead-end notification.
 * Purely presentational; all state lives in BlastGame.
 */
export function BlastStage({
  grid,
  tileStates,
  gridSize,
  language,
  gameState,
  waveNumber,
  comboLevel,
  objectiveProgress,
  formedWord,
  currentFeedback,
  interactive,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onShuffle,
  onQuit,
  onShowHelp,
  sequencerState,
  noWordsRemaining,
  scoreFlyEvents = [],
  onScoreFlyComplete,
  comboFlash = null,
  onComboFlashComplete,
  t,
}: BlastStageProps) {
  const { score, wordsFound, movesRemaining, totalMoves, tilesCleared, totalTiles, isComplete } = gameState;

  return (
    <div className="flex-1 flex flex-col h-full bg-neo-navy overflow-hidden" data-testid="blast-stage">
      {/* Effects overlay */}
      <BlastEffectsLayer
        scoreFlyEvents={scoreFlyEvents}
        onScoreFlyComplete={onScoreFlyComplete ?? (() => {})}
        comboFlash={comboFlash}
        onComboFlashComplete={onComboFlashComplete ?? (() => {})}
        intensity={sequencerState?.chainLevel ?? 0}
      />

      {/* 1. HUD */}
      <BlastHUD
        score={score}
        wordsFoundCount={wordsFound.length}
        movesRemaining={movesRemaining}
        totalMoves={totalMoves}
        waveNumber={waveNumber}
        comboLevel={comboLevel}
        tilesCleared={tilesCleared}
        totalTiles={totalTiles}
        onQuit={onQuit}
        onShowHelp={onShowHelp}
        t={t}
      />

      {/* 2. Objective progress bar */}
      {objectiveProgress && objectiveProgress.length > 0 && (
        <div className="px-4 py-1 max-w-md mx-auto w-full flex-shrink-0">
          <div className="flex gap-2">
            {objectiveProgress.map((obj, i) => {
              const target = obj.objective.target;
              return (
                <div key={i} className="flex-1">
                  <div className="flex justify-between text-[9px] font-bold text-white/50 mb-0.5">
                    <span>{obj.objective.type}</span>
                    <span className="tabular-nums">{obj.current}/{target}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        obj.isComplete ? 'bg-neo-lime' : 'bg-neo-cyan',
                      )}
                      style={{ width: `${Math.min(100, target > 0 ? (obj.current / target) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Word forming area */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 relative z-30 px-4 mb-2',
        'max-w-[360px] md:max-w-[480px] mx-auto w-full overflow-visible',
        'min-h-[40px] rounded-neo',
        formedWord ? 'bg-white/5 border border-white/10' : '',
      )}>
        <WordFormingArea word={formedWord} letterCount={formedWord.length} feedback={currentFeedback} compact />
        {formedWord && (
          <span className="absolute end-3 text-[10px] font-bold text-white/60 tabular-nums">
            {formedWord.length}
          </span>
        )}
      </div>

      {/* Chain escalation text */}
      <BlastChainText chainLevel={sequencerState?.chainLevel ?? 0} />

      {/* 4. Board */}
      <div className={cn(
        'flex-1 flex flex-col items-center justify-start px-4 pt-1 relative z-30 min-h-0',
        sequencerState?.chainLevel && sequencerState.chainLevel >= 3 ? 'animate-neo-shake' :
        sequencerState?.chainLevel && sequencerState.chainLevel >= 2 ? 'animate-neo-wobble' : '',
      )}>
        <BlastBoard
          grid={grid}
          tileStates={tileStates}
          gridSize={gridSize}
          language={language}
          interactive={interactive && !isComplete}
          onWordSubmit={onWordSubmit}
          onPathSubmit={onPathSubmit}
          onWordChange={onWordChange}
          sequencerState={sequencerState}
        />
      </div>

      {/* 5. Dead-end notification */}
      <AdaptiveAnimatePresence>
        {noWordsRemaining && !isComplete && (
          <AdaptiveMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="overflow-hidden px-4 max-w-[360px] md:max-w-[480px] mx-auto w-full flex-shrink-0 pb-safe"
          >
            <div className={cn(
              'border-3 border-neo-black rounded-neo shadow-hard-sm p-3',
              'bg-indigo-900/80 border border-indigo-500',
              'flex items-center justify-between gap-2',
            )}>
              <span className="font-bold text-white text-xs sm:text-sm shrink-0">
                {t('blast.stuck')}
              </span>
              <Button
                size="sm"
                onClick={onShuffle}
                className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none bg-neo-lime text-neo-black font-bold text-xs"
              >
                <Shuffle className="h-3.5 w-3.5 me-1" />
                {t('blast.shuffle')}
              </Button>
            </div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
