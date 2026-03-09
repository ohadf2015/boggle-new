'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bomb, HelpCircle, Lightbulb, Shuffle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

import ComboDisplay from '@/components/game/ComboDisplay';
import { DynamicEnergyBackground } from '@/components/singleplayer/game/components/DynamicEnergyBackground';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { BlastGrid } from './BlastGrid';
import { BlastProgressBar } from './BlastProgressBar';
import { BlastFoundWords } from './BlastFoundWords';
import { BlastHelpModal } from './BlastHelpModal';
import WordFormingArea, { type WordFeedback } from '@/components/game/WordFormingArea';
import type { LetterGrid, Language } from '@/shared/types/game';
import { BlastCascadeWordBanner } from './BlastCascadeWordBanner';
import type { BlastTileState, BlastExplosion, BlastScorePopup, BlastGameState, CascadeHighlightData, CascadeHighlightPhase, BlastObjectiveProgress } from './types';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';
import { cn } from '@/lib/utils';
import { ComboMilestoneAnnouncement } from '@/components/game/ComboMilestoneAnnouncement';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import { vibrateBlastBomb, vibrateBlastLightning, vibrateBlastPrism, vibrateBlastCascade } from '@/components/grid/hapticFeedback';
import { calculateEarnedStars } from './utils/blastStarCalculator';
import { Mascot } from '@/components/ui/Mascot';
import { BlastMoveCounter } from './BlastMoveCounter';
import { BlastObjectiveDisplay } from './BlastObjectiveDisplay';
import { BlastChainCounter } from './BlastChainCounter';
import CircularTimer from '@/components/CircularTimer';
import { LeadChangeBanner } from '@/components/game/LeadChangeBanner';
import { useLeadChangeDetection } from '@/hooks/useLeadChangeDetection';

interface BlastGameLayoutProps {
  // Grid
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  explosions: BlastExplosion[];
  scorePopups: BlastScorePopup[];
  // Cascade
  cascadePhase: BlastCascadePhase;
  cascadeAnimationData: CascadeAnimationData | null;
  /** Current cascade chain level (0 = no active chain) */
  cascadeChainLevel: number;
  /** Cascade highlight data (words being showcased) */
  cascadeHighlightData: CascadeHighlightData | null;
  /** Cascade highlight phase */
  cascadeHighlightPhase: CascadeHighlightPhase;
  // Game state
  gameState: BlastGameState;
  noWordsRemaining: boolean;
  // Wave info
  /** Current wave number */
  waveNumber?: number;
  /** Cumulative score from previous waves */
  cumulativeScore?: number;
  /** Score threshold for current wave (undefined = no threshold) */
  scoreThreshold?: number;
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
  onScorePopupComplete: (id: string) => void;
  onShuffle: () => void;
  onQuitRequest: () => void;
  onConfirmQuit: () => void;
  onEndGame: () => void;
  // Hint system
  hintPath?: Array<{ row: number; col: number }> | null;
  hasHintAvailable?: boolean;
  onRequestHint?: () => void;
  onClearHint?: () => void;
  // Objectives
  /** Objective progress for current wave */
  objectiveProgress?: BlastObjectiveProgress[];
  // Move counter
  /** Bonus move popup trigger (number of bonus moves just awarded) */
  bonusMoveAwarded?: number;
  // Quit dialog
  showQuitConfirm: boolean;
  setShowQuitConfirm: (show: boolean) => void;
  // End game dialog
  showEndGameConfirm: boolean;
  setShowEndGameConfirm: (show: boolean) => void;
  /** When true, grid input is blocked (discovery banner showing) */
  isDiscoveryActive?: boolean;
  /** Cells to pulse with near-miss shimmer animation (empty = none) */
  shimmerCells?: Array<{ row: number; col: number }>;
  /** Tile types matching current wave objectives — highlighted with pulsing ring */
  objectiveTileTypes?: Set<string>;
  // Multiplayer
  /** When true, show MP UI (timer, leaderboard) and hide SP controls */
  isMultiplayer?: boolean;
  /** Multiplayer: seconds remaining from server timer */
  remainingTime?: number | null;
  /** Multiplayer: total game duration in seconds */
  totalTime?: number;
  /** Multiplayer: current leaderboard */
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: any }>;
  /** Multiplayer: current player's username */
  username?: string;
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
  scorePopups,
  cascadePhase,
  cascadeAnimationData,
  cascadeChainLevel,
  cascadeHighlightData,
  cascadeHighlightPhase,
  gameState,
  waveNumber = 1,
  cumulativeScore = 0,
  scoreThreshold,
  noWordsRemaining,
  comboLevel,
  comboTimeRemaining,
  comboDanger,
  formedWord,
  currentFeedback,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onExplosionComplete,
  onScorePopupComplete,
  onShuffle,
  onQuitRequest,
  onConfirmQuit,
  onEndGame,
  showQuitConfirm,
  setShowQuitConfirm,
  showEndGameConfirm,
  setShowEndGameConfirm,
  objectiveProgress,
  bonusMoveAwarded,
  hintPath = null,
  hasHintAvailable = false,
  onRequestHint,
  onClearHint,
  isDiscoveryActive = false,
  shimmerCells = [],
  objectiveTileTypes,
  isMultiplayer = false,
  remainingTime,
  totalTime,
  leaderboard,
  username,
  t,
}: BlastGameLayoutProps) {
  const { score, tilesCleared, totalTiles, isComplete, wordsFound, movesRemaining, totalMoves } = gameState;
  const earnedStars = calculateEarnedStars(tilesCleared, totalTiles);

  // Lead change detection for multiplayer pop-up banners
  const leadChangeEvent = useLeadChangeDetection(
    isMultiplayer && leaderboard ? leaderboard : [],
    username ?? '',
  );

  const [showHelp, setShowHelp] = useState(false);
  const [showFoundWords, setShowFoundWords] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const [cascadeAnnouncement, setCascadeAnnouncement] = useState<string | null>(null);
  const [showMpCelebration, setShowMpCelebration] = useState(false);
  const prevExplosionsRef = useRef(0);
  const prevCascadeRef = useRef(0);

  // Screen shake on bomb, prism, and lightning explosions
  useEffect(() => {
    const shakeTypes = new Set(['bomb', 'prism', 'lightning']);
    const shakeCount = explosions.filter(e => shakeTypes.has(e.type)).length;
    if (shakeCount > prevExplosionsRef.current) {
      const hasPrism = explosions.some(e => e.type === 'prism');
      const hasBomb = explosions.some(e => e.type === 'bomb');
      const hasLightning = explosions.some(e => e.type === 'lightning');
      // Prism = strongest shake, bomb cluster = strong, lightning/single = wobble
      const intensity = hasPrism || (hasBomb && shakeCount >= 4)
        ? 'animate-neo-shake'
        : 'animate-neo-wobble';
      setShakeClass(intensity);
      // Haptic feedback for blast effects
      if (hasPrism) vibrateBlastPrism();
      else if (hasBomb) vibrateBlastBomb();
      else if (hasLightning) vibrateBlastLightning();
      const timer = setTimeout(() => setShakeClass(''), 350);
      prevExplosionsRef.current = shakeCount;
      return () => clearTimeout(timer);
    }
    prevExplosionsRef.current = shakeCount;
    return undefined;
  }, [explosions]);

  // Cascade chain announcement + haptic
  useEffect(() => {
    if (cascadeChainLevel > prevCascadeRef.current && cascadeChainLevel >= 1) {
      setCascadeAnnouncement(t('blast.cascadeChain')?.replace('{level}', String(cascadeChainLevel)) || `CASCADE x${cascadeChainLevel}`);
      vibrateBlastCascade();
      const timer = setTimeout(() => setCascadeAnnouncement(null), 1500);
      prevCascadeRef.current = cascadeChainLevel;
      return () => clearTimeout(timer);
    }
    if (cascadeChainLevel === 0) {
      prevCascadeRef.current = 0;
    }
    return undefined;
  }, [cascadeChainLevel, t]);

  // Auto-clear hint after 2000ms
  useEffect(() => {
    if (!hintPath) return;
    const timer = setTimeout(() => {
      onClearHint?.();
    }, 2000);
    return () => clearTimeout(timer);
  }, [hintPath, onClearHint]);

  // MP board-clear celebration: show briefly then auto-dismiss
  useEffect(() => {
    if (isMultiplayer && isComplete) {
      setShowMpCelebration(true);
      const timer = setTimeout(() => setShowMpCelebration(false), 2500);
      return () => clearTimeout(timer);
    }
    if (!isComplete) {
      setShowMpCelebration(false);
    }
    return undefined;
  }, [isMultiplayer, isComplete]);

  // Combo-based grid glow color
  // Glow shadows are symmetric (0 x-offset) so they work in both LTR and RTL
  const comboGlow = comboLevel >= 7
    ? 'shadow-[0_0_20px_rgba(255,0,255,0.4)]'
    : comboLevel >= 5
    ? 'shadow-[0_0_15px_rgba(255,225,53,0.4)]'
    : comboLevel >= 3
    ? 'shadow-[0_0_10px_rgba(0,255,255,0.3)]'
    : '';

  return (
    <div className={cn('relative flex-1 flex flex-col overflow-hidden h-full bg-neo-navy', shakeClass)}>
      <DynamicEnergyBackground />

      {/* Powerup mascot — overlays when hint path is active */}
      {hintPath && hintPath.length > 0 && (
        <div className="absolute top-4 end-4 z-20 pointer-events-none">
          <Mascot variant="powerup" size="sm" animated />
        </div>
      )}

      {/* Screen flash on word clear */}
      <ScreenFlashOverlay trigger={wordsFound.length} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 shrink-0 relative z-30 pb-1" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)' }}>
        <Button
          variant="destructive"
          size="sm"
          onClick={onQuitRequest}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold text-xs tracking-widest"
        >
          <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" />
          <span className="hidden sm:inline">
            {isMultiplayer
              ? (t('common.leave'))
              : (t('common.quit'))}
          </span>
        </Button>

        {/* MP: CircularTimer between quit and help */}
        {isMultiplayer && remainingTime != null && (
          <CircularTimer remainingTime={remainingTime} totalTime={totalTime} size="xs" />
        )}

        {/* Wave badge — SP only */}
        {!isMultiplayer && waveNumber > 1 && (
          <motion.div
            key={waveNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2 py-0.5 rounded-neo border-2 border-fuchsia-400/60 bg-fuchsia-500/20"
          >
            <span className="font-black text-xs text-fuchsia-300 uppercase tracking-wider">
              {t('blast.waveBadge')?.replace('{wave}', String(waveNumber)) || `Wave ${waveNumber}`}
            </span>
          </motion.div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(true)}
          className="text-white/60 hover:text-white"
          aria-label={t('blast.helpTitle')}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* End Game button — SP only */}
        {!isMultiplayer && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowEndGameConfirm(true)}
            className="border-2 border-neo-black shadow-hard-sm font-bold text-xs"
          >
            <Bomb className="h-4 w-4 sm:me-1.5" />
            <span className="hidden sm:inline">{t('blast.giveUp')}</span>
          </Button>
        )}
      </header>

      {/* Combo Display */}
      <div className="h-6 flex items-center justify-center shrink-0 relative z-30">
        <ComboDisplay
          comboLevel={comboLevel}
          compact
          timeRemaining={comboTimeRemaining}
          isDanger={comboDanger}
        />
      </div>

      {/* Combo milestone announcement */}
      <ComboMilestoneAnnouncement comboLevel={comboLevel} />

      {/* Cascade word showcase banner (replaces simple text announcement) */}
      <AnimatePresence>
        {cascadeHighlightPhase === 'highlighting' && cascadeHighlightData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 short:top-8 sm:top-32 start-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <BlastCascadeWordBanner highlightData={cascadeHighlightData} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback cascade chain announcement (when no highlight data, e.g. chain level text) */}
      <AnimatePresence>
        {cascadeAnnouncement && cascadeHighlightPhase !== 'highlighting' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute top-32 start-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={cn(
              'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-black text-xl uppercase tracking-wider',
              cascadeChainLevel >= 4 ? 'bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-purple-500 text-white' :
              cascadeChainLevel >= 2 ? 'bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white' :
              'bg-gradient-to-r from-fuchsia-400 to-purple-500 text-white'
            )}>
              {cascadeAnnouncement}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row: Score (left), Words (center), Progress (right) */}
      <div className="px-4 flex items-center justify-between shrink-0 relative z-30 mb-1 max-w-md mx-auto w-full">
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
              {t('common.score')}
            </div>
          </div>
        </motion.div>

        {/* Move counter (visible when move limit is finite) */}
        <BlastMoveCounter
          movesRemaining={movesRemaining}
          totalMoves={totalMoves}
          t={t}
          bonusMoveAwarded={bonusMoveAwarded}
        />

        {/* Words found count - clickable to expand list */}
        <button
          onClick={() => setShowFoundWords(prev => !prev)}
          className="text-center cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="font-black text-white text-xl sm:text-2xl">{wordsFound.length}</div>
          <div className="font-bold uppercase tracking-wider text-white/70 text-[10px] sm:text-xs">
            {t('common.words')}
          </div>
        </button>

        {/* Progress */}
        <div className="w-28 sm:w-32">
          <BlastProgressBar cleared={tilesCleared} total={totalTiles} t={t} />
        </div>
      </div>

      {/* MP Lead Change Banner — pop-up style like classic game */}
      {isMultiplayer && (
        <div className="relative z-50">
          <LeadChangeBanner event={leadChangeEvent} />
        </div>
      )}

      {/* Score threshold progress (visible on wave 3+) */}
      {scoreThreshold && score < scoreThreshold && (
        <div className="px-4 max-w-md mx-auto w-full relative z-30 mb-1">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider text-center">
            {t('blast.needScore')} {scoreThreshold - score} {t('blast.morePoints')}
          </div>
        </div>
      )}

      {/* Cumulative score indicator (wave 2+) */}
      {cumulativeScore > 0 && (
        <div className="px-4 max-w-md mx-auto w-full relative z-30 mb-1">
          <div className="text-[10px] font-bold text-fuchsia-300/50 uppercase tracking-wider text-center tabular-nums">
            {t('blast.totalScore')}: {(cumulativeScore + score).toLocaleString()}
          </div>
        </div>
      )}

      {/* Objective progress */}
      {objectiveProgress && objectiveProgress.length > 0 && (
        <div className="px-4 max-w-md mx-auto w-full relative z-30 mb-1">
          <BlastObjectiveDisplay objectiveProgress={objectiveProgress} t={t} />
        </div>
      )}

      {/* Word Forming Area */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0 relative z-30 px-4 mb-2',
        'max-w-[360px] mx-auto w-full overflow-visible',
        'min-h-[40px] rounded-neo',
        formedWord ? 'bg-white/5 border border-white/10' : ''
      )}>
        <WordFormingArea word={formedWord} letterCount={formedWord.length} feedback={currentFeedback} compact />
        {formedWord && (
          <span className="absolute end-3 text-[10px] font-bold text-white/60 tabular-nums">
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

      {/* Dead-end notification */}
      <AnimatePresence>
        {noWordsRemaining && !isComplete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="overflow-hidden relative z-30 px-4 max-w-[360px] mx-auto w-full"
          >
            <div className={cn(
              'border-3 border-neo-black rounded-neo shadow-hard-sm p-3',
              'bg-indigo-900/80 border border-indigo-500',
              'flex items-center justify-between gap-2'
            )}>
              <span className="font-bold text-white text-xs sm:text-sm shrink-0">
                {t('blast.stuck')}
              </span>
              <div className="flex gap-2 flex-wrap justify-end">
                {!isMultiplayer && hasHintAvailable && !hintPath && (
                  <Button
                    size="sm"
                    onClick={onRequestHint}
                    className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none bg-lime-400 text-black font-bold text-xs"
                  >
                    <Lightbulb className="h-3.5 w-3.5 me-1" />
                    {t('blast.hint')}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onShuffle}
                  className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none bg-neo-lime text-neo-black font-bold text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5 me-1" />
                  {t('blast.shuffle')}
                </Button>
                {!isMultiplayer && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowEndGameConfirm(true)}
                    className="border-2 border-neo-black shadow-hard-sm font-bold text-xs"
                  >
                    {t('blast.giveUp')}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game grid with overlays */}
      <div className={cn('flex-1 flex flex-col items-center justify-start px-4 pt-1 relative z-30 min-h-0 transition-shadow duration-500', comboGlow)}>
        {/* Cascade chain counter — shown above grid during active cascades */}
        {cascadeChainLevel > 0 && (
          <div className="absolute top-2 start-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <BlastChainCounter chainLevel={cascadeChainLevel} />
          </div>
        )}

        {/* Board complete celebration — SP: blocking overlay, MP: lightweight auto-dismiss toast */}
        <AnimatePresence>
          {!isMultiplayer && isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-neo-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.3, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                className={cn(
                  'px-8 py-6 rounded-neo border-3 border-neo-black shadow-hard-lg',
                  'bg-gradient-to-br from-neo-lime via-yellow-300 to-neo-orange',
                  'text-center space-y-3'
                )}
              >
                {/* Stars — filled count based on tilesCleared percentage */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 + i * 0.15 }}
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 text-neo-black',
                          i < earnedStars ? 'fill-neo-orange' : 'fill-neo-black/20',
                        )}
                      />
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.5 }}
                  className="text-2xl font-black uppercase text-neo-black"
                >
                  {t('blast.complete')}
                </motion.div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.65 }}
                  className="text-lg font-bold text-neo-black/70 tabular-nums"
                >
                  {score.toLocaleString()} {t('common.points')}
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MP board-clear toast — non-blocking, auto-dismisses */}
        <AnimatePresence>
          {isMultiplayer && showMpCelebration && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute top-4 start-1/2 -translate-x-1/2 z-50 pointer-events-none"
            >
              <div className={cn(
                'px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard',
                'bg-gradient-to-r from-neo-lime via-yellow-300 to-neo-orange',
                'flex items-center gap-2'
              )}>
                <Star className="h-5 w-5 text-neo-black fill-neo-orange" />
                <span className="font-black text-lg uppercase text-neo-black">
                  {t('blast.complete')}
                </span>
                <Star className="h-5 w-5 text-neo-black fill-neo-orange" />
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
          interactive={!isComplete && !isDiscoveryActive}
          comboLevel={comboLevel}
          cascadePhase={cascadePhase}
          cascadeAnimationData={cascadeAnimationData}
          cascadeHighlightData={cascadeHighlightData}
          scorePopups={scorePopups}
          onWordSubmit={onWordSubmit}
          onPathSubmit={onPathSubmit}
          onWordChange={onWordChange}
          onExplosionComplete={onExplosionComplete}
          onScorePopupComplete={onScorePopupComplete}
          ariaLabel={t('blast.gridLabel')}
          highlightedPath={hintPath ?? undefined}
          shimmerCells={shimmerCells}
          objectiveTileTypes={objectiveTileTypes}
        />
      </div>

      {/* Quit Confirmation */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('singlePlayer.quitConfirmTitle') ?? ''}
        description={t('singlePlayer.quitConfirmMessage') ?? ''}
        confirmText={t('singlePlayer.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={onConfirmQuit}
        variant="danger"
      />

      {/* End Game Confirmation */}
      <ConfirmationDialog
        open={showEndGameConfirm}
        onOpenChange={setShowEndGameConfirm}
        title={t('blast.endGameConfirmTitle') ?? ''}
        description={t('blast.endGameConfirmMessage') ?? ''}
        confirmText={t('blast.giveUp')}
        cancelText={t('common.cancel')}
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
