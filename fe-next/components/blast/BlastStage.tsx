'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Shuffle } from 'lucide-react';
import { formatObjectiveLabel } from './utils/blastObjectiveUtils';

const BlastTileGuide = dynamic(() => import('./BlastTileGuide'), { ssr: false });
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Button } from '@/components/ui/button';

const BlastEffectsCanvas = dynamic(
  () => import('./BlastEffectsCanvas'),
  { ssr: false },
);
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import { BlastHUD } from './BlastHUD';
import { BlastBoard } from './BlastBoard';
import BlastChainText from './BlastChainText';
import BlastWaveClearText from './BlastWaveClearText';
import { BlastWordRewardPreview } from './BlastWordRewardPreview';
import { BlastEffectsLayer } from './BlastEffectsLayer';
import type { ScoreFlyEvent } from './BlastScoreFly';
import { BlastBackground } from './BlastBackground';
import { cn } from '@/lib/utils';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastGameState, BlastObjectiveProgress } from './types';
import type { SequencerState } from './hooks/useBlastSequencer';
import type { ClearedTileEvent } from './BlastEffectsCanvas';

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
  comboTypeName?: string;
  // Near-miss shimmer
  nearMissCells?: Array<{ row: number; col: number }>;
  // PixiJS effects layer events
  clearedTilesForEffects?: ClearedTileEvent[];
  waveCleared?: boolean;
  // Multiplayer leaderboard
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: any }>;
  username?: string;
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
  comboTypeName,
  nearMissCells = [],
  clearedTilesForEffects = [],
  waveCleared = false,
  leaderboard,
  username,
  t,
}: BlastStageProps) {
  const { score, wordsFound, movesRemaining, totalMoves, tilesCleared, totalTiles, isComplete } = gameState;

  const [showTileGuide, setShowTileGuide] = useState(false);

  // Measure board container for PixiJS effects canvas
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setBoardSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const comboFlashTier = comboFlash?.tier ?? 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative pb-safe" data-testid="blast-stage">
      {/* Reactive background */}
      <BlastBackground intensity={sequencerState?.chainLevel ?? 0} />
      {/* Effects overlay */}
      <BlastEffectsLayer
        scoreFlyEvents={scoreFlyEvents}
        onScoreFlyComplete={onScoreFlyComplete ?? (() => {})}
        comboFlash={comboFlash}
        onComboFlashComplete={onComboFlashComplete ?? (() => {})}
        comboTypeName={comboTypeName}
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
        onShowHelp={onShowHelp ?? (() => setShowTileGuide(true))}
        t={t}
      />

      {/* 1b. Live leaderboard ticker (MP only) */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="absolute top-14 end-2 z-40 flex flex-col gap-0.5 pointer-events-none" data-testid="blast-leaderboard">
          {leaderboard
            .slice()
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map((entry, i) => (
              <div
                key={entry.username}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-neo text-[10px] font-bold tabular-nums',
                  'border border-neo-black/40 shadow-hard-sm',
                  entry.username === username
                    ? 'bg-neo-lime/80 text-neo-navy'
                    : 'bg-neo-navy/70 text-neo-white/80',
                )}
              >
                <span className="text-white/50 w-3">{i + 1}.</span>
                <span className="truncate max-w-[60px]">{entry.username}</span>
                <span className="ms-auto">{entry.score}</span>
              </div>
            ))}
        </div>
      )}

      {/* 2. Objective progress bar */}
      {objectiveProgress && objectiveProgress.length > 0 && (
        <div className="px-4 py-1 max-w-md mx-auto w-full flex-shrink-0">
          <div className="flex gap-2">
            {objectiveProgress.map((obj, i) => {
              const target = obj.objective.target;
              return (
                <div key={i} className="flex-1">
                  <div className="flex justify-between text-[9px] font-bold text-white/50 mb-0.5">
                    <span>{formatObjectiveLabel(obj.objective, t)}</span>
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

      {/* 3. Board — AAA Royal Blast ornate frame, fills most of screen */}
      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-center px-2 pt-1 relative z-30 min-h-0',
          sequencerState?.chainLevel && sequencerState.chainLevel >= 3 ? 'animate-neo-shake' :
          sequencerState?.chainLevel && sequencerState.chainLevel >= 2 ? 'animate-neo-wobble' :
          sequencerState?.phase === 'clearing' ? 'animate-neo-wobble' : '',
        )}
        style={{
          transform: sequencerState?.chainLevel
            ? `scale(${1 + Math.min(sequencerState.chainLevel, 5) * 0.008})`
            : undefined,
          transition: 'transform 200ms ease-out',
        }}
      >
        {/* Ornate board frame — golden trim with recessed interior */}
        <div
          className="relative w-full max-w-[min(96vw,96dvh-180px)] sm:max-w-[min(460px,90dvh-180px)] lg:max-w-[min(500px,55vh)]"
          style={{
            padding: '6px',
            borderRadius: '20px',
            background: 'linear-gradient(180deg, #B8860B 0%, #8B6914 40%, #6B4F10 100%)',
            boxShadow: 'inset 0 1px 2px rgba(255,230,150,0.5), 0 8px 24px rgba(0,0,0,0.5), 0 2px 0 #4a3508',
          }}
        >
          {/* Inner recessed board surface */}
          <div
            ref={boardContainerRef}
            className="relative w-full overflow-hidden"
            style={{
              borderRadius: '14px',
              background: 'linear-gradient(180deg, #0d0b20 0%, #0a0818 100%)',
              boxShadow: 'inset 0 3px 12px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,0,0,0.4)',
            }}
          >
            {/* PixiJS effects layer */}
            {boardSize.width > 0 && (
              <div className="absolute inset-0 z-0 overflow-hidden" style={{ borderRadius: '14px' }}>
                <BlastEffectsCanvas
                  width={boardSize.width}
                  height={boardSize.height || boardSize.width}
                  gridSize={gridSize}
                  clearedTiles={clearedTilesForEffects}
                  chainLevel={sequencerState?.chainLevel ?? 0}
                  comboTier={comboFlashTier}
                  waveCleared={waveCleared}
                />
              </div>
            )}
            {/* DOM board */}
            <div className="relative z-10">
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
                nearMissCells={nearMissCells}
              />
            </div>
          </div>
          {/* Golden corner accents */}
          <div className="absolute top-1 left-1 w-3 h-3 rounded-tl-lg border-t-2 border-l-2 border-amber-400/40 pointer-events-none" />
          <div className="absolute top-1 right-1 w-3 h-3 rounded-tr-lg border-t-2 border-r-2 border-amber-400/40 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-3 h-3 rounded-bl-lg border-b-2 border-l-2 border-amber-400/40 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-3 h-3 rounded-br-lg border-b-2 border-r-2 border-amber-400/40 pointer-events-none" />
        </div>
        {/* Chain escalation text — scoped within board area */}
        <BlastChainText chainLevel={sequencerState?.chainLevel ?? 0} />
        <BlastWaveClearText waveCleared={waveCleared} movesRemaining={movesRemaining} />
      </div>

      {/* 4. Word forming area — golden ribbon style */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 relative z-30 px-4 py-2',
        'max-w-[360px] md:max-w-[480px] mx-auto w-full overflow-visible',
        'min-h-[44px]',
      )}>
        <div
          className={cn(
            'flex items-center justify-center gap-2 px-5 py-2 w-full',
            formedWord ? 'opacity-100' : 'opacity-40',
          )}
          style={{
            background: formedWord
              ? 'linear-gradient(90deg, rgba(184,134,11,0.15) 0%, rgba(255,215,0,0.12) 50%, rgba(184,134,11,0.15) 100%)'
              : 'transparent',
            borderRadius: '12px',
            border: formedWord ? '1px solid rgba(255,215,0,0.2)' : '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <WordFormingArea word={formedWord} letterCount={formedWord.length} feedback={currentFeedback} compact />
          <BlastWordRewardPreview wordLength={formedWord.length} />
          {formedWord && (
            <span className="text-[10px] font-bold text-amber-400/60 tabular-nums">
              {formedWord.length}
            </span>
          )}
        </div>
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

      {/* Tile Guide modal */}
      <BlastTileGuide isOpen={showTileGuide} onClose={() => setShowTileGuide(false)} t={t} />
    </div>
  );
}
