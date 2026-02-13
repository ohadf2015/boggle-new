# Blast Mode UI Components

## Blast-Specific Components

### BlastGame
Orchestrator connecting useBlastGame hook with word submission, combo system, and the layout component. No timer, no bots. Word submission intercepts valid words to clear tiles.

```tsx
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useComboSystem } from '@/hooks/useComboSystem';
import { useWordSubmission } from '@/components/singleplayer/game/hooks/useWordSubmission';
import { useSpamDetection } from '@/components/singleplayer/game/hooks/useSpamDetection';
import { useBlastGame } from './hooks/useBlastGame';
import { BlastGameLayout } from './BlastGameLayout';
import type { BlastGameConfig, BlastResultsData } from './types';
import type { WaveConfig } from './utils/blastWaveConfig';
import { getComboMultiplier } from '@/shared/utils/scoring';

interface BlastGameProps {
  config: BlastGameConfig;
  /** Current wave number (1-based) */
  waveNumber?: number;
  /** Wave-specific config from blastWaveConfig */
  waveConfig?: WaveConfig;
  /** Cumulative score from previous waves */
  cumulativeScore?: number;
  /** Called when the board is cleared and score threshold is met */
  onWaveComplete?: (waveScore: number, waveWords: string[], clearPct: number) => void;
  onGameEnd: (results: BlastResultsData) => void;
  onQuit: () => void;
}

/**
 * BlastGame - Connects useBlastGame hook with word submission,
 * combo system, and the layout component.
 *
 * Key difference from SinglePlayerGame: no timer, no bots.
 * Word submission intercepts valid words to clear tiles.
 */
export function BlastGame({
  config,
  waveNumber = 1,
  waveConfig,
  cumulativeScore = 0,
  onWaveComplete,
  onGameEnd,
  onQuit,
}: BlastGameProps) {
  const { t } = useLanguage();
  const { playWordAcceptedSound, playComboSound } = useSoundEffects();

  // Combo system
  const combo = useComboSystem({
    trackMaxCombo: true,
    onComboSound: playComboSound,
  });

  // Auto-cascade word callback: increment combo + play sound for each cascade word
  const handleAutoCascadeWord = useCallback(() => {
    combo.incrementCombo(true);
    playWordAcceptedSound();
  }, [combo, playWordAcceptedSound]);

  // Core blast game state (with cascade callback)
  const blast = useBlastGame(config, { onAutoCascadeWord: handleAutoCascadeWord });

  // Spam detection
  const spamDetection = useSpamDetection();

  // Game timing - initialized once via effect
  const gameStartTimeRef = useRef(0);
  useEffect(() => {
    if (gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
    }
  }, []);

  // Word forming state (from GridComponent drag)
  const [formedWord, setFormedWord] = useState('');

  // Quit dialog
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  // End game confirmation dialog
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  // Track last submitted path for tile clearing
  const lastPathRef = useRef<Array<{ row: number; col: number }>>([]);

  // Direct callback when a word is accepted
  const handleWordAccepted = useCallback((data: { word: string; score: number }) => {
    if (lastPathRef.current.length > 0) {
      blast.clearTilesForWord(lastPathRef.current, data.word, data.score);
      lastPathRef.current = [];
    }
  }, [blast]);

  // Min word length from wave config (defaults to 2)
  const minWordLength = waveConfig?.minWordLength ?? 2;

  // Word submission hook - reuses proven validation pipeline
  const wordSubmission = useWordSubmission({
    language: config.language,
    minWordLength,
    grid: blast.modifiedGrid,
    gameStartTime: gameStartTimeRef.current,
    getScoreMultiplier: () => getComboMultiplier(combo.comboLevel),
    fireRoundActive: false,
    combo,
    spamDetection,
    t: (key: string) => t(key) || key,
    playWordAcceptedSound,
    playComboSound,
    announceWordResult: () => {},
    announceCombo: () => {},
    onWordAccepted: handleWordAccepted,
  });

  // Handle word submission: validate via useWordSubmission
  const handleWordSubmit = useCallback((word: string) => {
    wordSubmission.handleWordSubmit(word);
  }, [wordSubmission]);

  // Handle path submission (stores the path for tile clearing)
  const handlePathSubmit = useCallback((cells: Array<{ row: number; col: number }>) => {
    lastPathRef.current = cells;
  }, []);

  // Handle word change from grid (for word display)
  const handleWordChange = useCallback((word: string) => {
    setFormedWord(word);
  }, []);

  // Detect game completion or dead end
  useEffect(() => {
    if (blast.gameState.isComplete) {
      const { score, wordsFound, tilesCleared, totalTiles } = blast.gameState;
      const clearPct = totalTiles > 0 ? Math.min(100, Math.round((tilesCleared / totalTiles) * 100)) : 0;
      const scoreThreshold = waveConfig?.scoreThreshold;

      // Wave complete: board cleared + threshold met (or no threshold)
      if (onWaveComplete && (!scoreThreshold || score >= scoreThreshold)) {
        const timer = setTimeout(() => {
          onWaveComplete(score, wordsFound, clearPct);
        }, 2000);
        return () => clearTimeout(timer);
      }

      // Board cleared but threshold not met — game ends
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (blast.gameState.isDeadEnd) {
      const results = blast.getResultsData(combo.maxCombo);
      const timer = setTimeout(() => {
        onGameEnd(results);
      }, 500);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [blast.gameState.isComplete, blast.gameState.isDeadEnd, blast, combo.maxCombo, onGameEnd, onWaveComplete, waveConfig]);

  const handleQuitRequest = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const handleConfirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    onQuit();
  }, [onQuit]);

  const handleEndGame = useCallback(() => {
    setShowEndGameConfirm(false);
    blast.endGame();
  }, [blast]);

  if (!blast.modifiedGrid) {
    return null; // Grid still loading
  }

  return (
    <BlastGameLayout
      grid={blast.modifiedGrid}
      tileStates={blast.tileStates}
      gridSize={config.gridSize}
      language={config.language}
      explosions={blast.explosions}
      scorePopups={blast.scorePopups}
      cascadePhase={blast.cascadePhase}
      cascadeAnimationData={blast.cascadeAnimationData}
      cascadeChainLevel={blast.cascadeChainLevel}
      cascadeHighlightData={blast.cascadeHighlightData}
      cascadeHighlightPhase={blast.cascadeHighlightPhase}
      gameState={blast.gameState}
      waveNumber={waveNumber}
      cumulativeScore={cumulativeScore}
      scoreThreshold={waveConfig?.scoreThreshold}
      comboLevel={combo.comboLevel}
      comboTimeRemaining={combo.comboTimeRemaining}
      comboDanger={combo.isDangerState}
      formedWord={formedWord}
      currentFeedback={wordSubmission.currentFeedback}
      onWordSubmit={handleWordSubmit}
      onPathSubmit={handlePathSubmit}
      onWordChange={handleWordChange}
      noWordsRemaining={blast.noWordsRemaining}
      onExplosionComplete={blast.dismissExplosion}
      onScorePopupComplete={blast.dismissScorePopup}
      onShuffle={blast.shuffleRemainingTiles}
      onQuitRequest={handleQuitRequest}
      onConfirmQuit={handleConfirmQuit}
      onEndGame={handleEndGame}
      showQuitConfirm={showQuitConfirm}
      setShowQuitConfirm={setShowQuitConfirm}
      showEndGameConfirm={showEndGameConfirm}
      setShowEndGameConfirm={setShowEndGameConfirm}
      t={(key: string) => t(key) || undefined}
    />
  );
}
```

---

### BlastGameLayout
Portrait layout for Blast Mode. Contains header, stats row, word forming area, grid with overlays, and dialogs. Simplified from PortraitGameLayout: no timer (untimed), progress bar instead.

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bomb, HelpCircle, Shuffle, Star } from 'lucide-react';
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
import { BlastCascadeWordBanner } from './BlastCascadeWordBanner';
import type { BlastTileState, BlastExplosion, BlastScorePopup, BlastGameState, CascadeHighlightData, CascadeHighlightPhase } from './types';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';
import { cn } from '@/lib/utils';

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
  t,
}: BlastGameLayoutProps) {
  const { score, tilesCleared, totalTiles, isComplete, wordsFound } = gameState;
  const [showHelp, setShowHelp] = useState(false);
  const [showFoundWords, setShowFoundWords] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [shakeClass, setShakeClass] = useState('');
  const [comboMilestone, setComboMilestone] = useState<string | null>(null);
  const [cascadeAnnouncement, setCascadeAnnouncement] = useState<string | null>(null);
  const prevWordsRef = useRef(wordsFound.length);
  const prevExplosionsRef = useRef(0);
  const prevComboRef = useRef(comboLevel);
  const prevCascadeRef = useRef(0);

  // Screen flash when a word is cleared (cascade starts)
  useEffect(() => {
    if (wordsFound.length > prevWordsRef.current) {
      setScreenFlash(true);
      const timer = setTimeout(() => setScreenFlash(false), 200);
      prevWordsRef.current = wordsFound.length;
      return () => clearTimeout(timer);
    }
    prevWordsRef.current = wordsFound.length;
    return undefined;
  }, [wordsFound.length]);

  // Screen shake on bomb explosions
  useEffect(() => {
    const bombCount = explosions.filter(e => e.type === 'bomb').length;
    if (bombCount > prevExplosionsRef.current) {
      const intensity = bombCount >= 4 ? 'animate-neo-shake' : 'animate-neo-wobble';
      setShakeClass(intensity);
      const timer = setTimeout(() => setShakeClass(''), 350);
      prevExplosionsRef.current = bombCount;
      return () => clearTimeout(timer);
    }
    prevExplosionsRef.current = bombCount;
    return undefined;
  }, [explosions]);

  // Combo milestone announcements
  useEffect(() => {
    const milestones: Record<number, string> = { 3: 'NICE!', 5: 'FIRE!', 7: 'MYTHIC!', 10: 'GODLIKE!' };
    if (comboLevel > prevComboRef.current && milestones[comboLevel]) {
      setComboMilestone(milestones[comboLevel]);
      const timer = setTimeout(() => setComboMilestone(null), 1200);
      prevComboRef.current = comboLevel;
      return () => clearTimeout(timer);
    }
    prevComboRef.current = comboLevel;
    return undefined;
  }, [comboLevel]);

  // Cascade chain announcement
  useEffect(() => {
    if (cascadeChainLevel > prevCascadeRef.current && cascadeChainLevel >= 1) {
      setCascadeAnnouncement(`CASCADE x${cascadeChainLevel}`);
      const timer = setTimeout(() => setCascadeAnnouncement(null), 1500);
      prevCascadeRef.current = cascadeChainLevel;
      return () => clearTimeout(timer);
    }
    if (cascadeChainLevel === 0) {
      prevCascadeRef.current = 0;
    }
    return undefined;
  }, [cascadeChainLevel]);

  // Combo-based grid glow color
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

      {/* Screen flash on word clear */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 z-40 pointer-events-none bg-white"
          />
        )}
      </AnimatePresence>

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

        {/* Wave badge */}
        {waveNumber > 1 && (
          <motion.div
            key={waveNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="px-2 py-0.5 rounded-neo border-2 border-fuchsia-400/60 bg-fuchsia-500/20"
          >
            <span className="font-black text-xs text-fuchsia-300 uppercase tracking-wider">
              Wave {waveNumber}
            </span>
          </motion.div>
        )}

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

      {/* Combo milestone announcement */}
      <AnimatePresence>
        {comboMilestone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.5, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={cn(
              'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard font-black text-lg uppercase tracking-wider',
              comboLevel >= 10 ? 'bg-gradient-to-r from-neo-pink via-neo-cyan to-neo-lime text-neo-black' :
              comboLevel >= 7 ? 'bg-gradient-to-r from-pink-500 via-cyan-500 to-yellow-500 text-white' :
              comboLevel >= 5 ? 'bg-gradient-to-r from-neo-yellow to-neo-orange text-neo-black' :
              'bg-neo-cyan text-neo-black'
            )}>
              {comboMilestone}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cascade word showcase banner (replaces simple text announcement) */}
      <AnimatePresence>
        {cascadeHighlightPhase === 'highlighting' && cascadeHighlightData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
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
            className="absolute top-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
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

      {/* Score threshold progress (visible on wave 3+) */}
      {scoreThreshold && score < scoreThreshold && (
        <div className="px-4 max-w-md mx-auto w-full relative z-30 mb-1">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider text-center">
            {t('blast.needScore') || 'Need'} {scoreThreshold - score} {t('blast.morePoints') || 'more pts'}
          </div>
        </div>
      )}

      {/* Cumulative score indicator (wave 2+) */}
      {cumulativeScore > 0 && (
        <div className="px-4 max-w-md mx-auto w-full relative z-30 mb-1">
          <div className="text-[10px] font-bold text-fuchsia-300/50 uppercase tracking-wider text-center tabular-nums">
            {t('blast.totalScore') || 'Total'}: {(cumulativeScore + score).toLocaleString()}
          </div>
        </div>
      )}

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
              'bg-gradient-to-r from-neo-orange/90 to-neo-pink/90',
              'flex items-center justify-between gap-2'
            )}>
              <span className="font-bold text-white text-xs sm:text-sm">
                {t('blast.noWordsLeft') || 'No words left!'}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onShuffle}
                  className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none bg-neo-lime text-neo-black font-bold text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5 me-1" />
                  {t('blast.shuffle') || 'Shuffle'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowEndGameConfirm(true)}
                  className="border-2 border-neo-black shadow-hard-sm font-bold text-xs"
                >
                  {t('blast.giveUp') || 'End Game'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game grid with overlays */}
      <div className={cn('flex-1 flex flex-col items-center justify-start px-4 pt-2 relative z-30 min-h-0 transition-shadow duration-500', comboGlow)}>
        {/* Board complete celebration overlay */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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
                {/* Stars */}
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 + i * 0.15 }}
                    >
                      <Star className="h-8 w-8 fill-neo-orange text-neo-black" />
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-black uppercase text-neo-black"
                >
                  {t('blast.complete') || 'Board Cleared!'}
                </motion.div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  className="text-lg font-bold text-neo-black/70 tabular-nums"
                >
                  {score.toLocaleString()} {t('common.points') || 'pts'}
                </motion.div>
              </motion.div>
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
          cascadeHighlightData={cascadeHighlightData}
          scorePopups={scorePopups}
          onWordSubmit={onWordSubmit}
          onPathSubmit={onPathSubmit}
          onWordChange={onWordChange}
          onExplosionComplete={onExplosionComplete}
          onScorePopupComplete={onScorePopupComplete}
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
```

---

### BlastGrid
Wraps GridComponent with blast-specific overlays. Layers (bottom to top): GridComponent (word input), BlastTileOverlay (special tile backgrounds), BlastCascadeHighlight (word glow), BlastCascadeOverlay (gravity animations), BlastExplosionLayer (particles + score popups).

```tsx
'use client';

import { useRef, useState, useEffect } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTileOverlay } from './BlastTileOverlay';
import { BlastExplosionLayer } from './BlastExplosionLayer';
import { BlastCascadeOverlay } from './BlastCascadeOverlay';
import { BlastCascadeHighlight } from './BlastCascadeHighlight';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastExplosion, BlastScorePopup, CascadeHighlightData } from './types';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';

interface BlastGridProps {
  /** Modified grid (cleared cells are empty strings) */
  grid: LetterGrid;
  /** Tile states for overlay rendering */
  tileStates: BlastTileState[][];
  /** Grid dimensions */
  gridSize: number;
  /** Active explosions */
  explosions: BlastExplosion[];
  /** Game language */
  language: Language;
  /** Whether grid is interactive */
  interactive: boolean;
  /** Combo level for grid visual effects */
  comboLevel: number;
  /** Cascade animation state */
  cascadePhase: BlastCascadePhase;
  /** Cascade animation data */
  cascadeAnimationData: CascadeAnimationData | null;
  /** Cascade highlight data (words being showcased before clearing) */
  cascadeHighlightData: CascadeHighlightData | null;
  /** Score popups from useBlastGame */
  scorePopups: BlastScorePopup[];
  /** Callbacks */
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  onExplosionComplete: (id: string) => void;
  onScorePopupComplete: (id: string) => void;
  /** Accessibility label for grid */
  ariaLabel?: string;
  /** Optional highlighted path (for hints/tutorials) */
  highlightedPath?: Array<{ row: number; col: number }>;
}

/**
 * BlastGrid - Wraps GridComponent with blast-specific overlays.
 *
 * Layers (bottom to top):
 * 1. GridComponent — proven word input mechanics
 * 2. BlastTileOverlay — special tile full-cell backgrounds
 * 3. BlastCascadeOverlay — gravity/refill animations (anime.js)
 * 4. BlastExplosionLayer — particle effects
 */
export function BlastGrid({
  grid,
  tileStates,
  gridSize,
  explosions,
  language,
  interactive,
  comboLevel,
  cascadePhase,
  cascadeAnimationData,
  cascadeHighlightData,
  scorePopups,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onExplosionComplete,
  onScorePopupComplete,
  ariaLabel,
  highlightedPath = [],
}: BlastGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container for overlay positioning
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const cellSize = containerWidth / gridSize;

  // Block interaction during cascade
  const isInteractive = interactive && cascadePhase === 'idle';

  return (
    <div
      ref={containerRef}
      className="blast-game relative w-full aspect-square max-w-[360px]"
      aria-label={ariaLabel}
    >
      {/* Base grid - proven word input */}
      <GridComponent
        grid={grid}
        interactive={isInteractive}
        onWordSubmit={onWordSubmit}
        onPathSubmit={onPathSubmit}
        onWordChange={onWordChange}
        hideWordPreview
        hideComboIndicator
        comboLevel={comboLevel}
        largeText
        highlightedPath={highlightedPath}
        language={language}
      />

      {/* Special tile full-cell backgrounds (below letters) */}
      {containerWidth > 0 && (
        <BlastTileOverlay
          tileStates={tileStates}
          gridSize={gridSize}
          containerWidth={containerWidth}
        />
      )}

      {/* Cascade word highlight glow (z-15, between tile overlay and cascade overlay) */}
      {containerWidth > 0 && cascadeHighlightData && (
        <BlastCascadeHighlight
          highlightData={cascadeHighlightData}
          gridSize={gridSize}
          cellSize={cellSize}
        />
      )}

      {/* Cascade gravity/refill animations */}
      {containerWidth > 0 && cascadePhase !== 'idle' && (
        <BlastCascadeOverlay
          phase={cascadePhase}
          data={cascadeAnimationData}
          gridSize={gridSize}
          containerWidth={containerWidth}
        />
      )}

      {/* Explosion particles + score popups */}
      {containerWidth > 0 && (
        <BlastExplosionLayer
          explosions={explosions}
          scorePopups={scorePopups}
          onExplosionComplete={onExplosionComplete}
          onScorePopupComplete={onScorePopupComplete}
          cellSize={cellSize}
          containerOffset={{ x: 0, y: 0 }}
        />
      )}
    </div>
  );
}
```

---

### BlastTileOverlay
Full-cell background treatments for special tiles + cleared gap cells. Renders underneath grid letters as colored overlays with CSS animations. Supports 10 tile types: gold, bomb, rainbow, ice, wildcard, lightning, magnet, prism, gem, frozen.

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { BlastTileState } from './types';

interface BlastTileOverlayProps {
  tileStates: BlastTileState[][];
  gridSize: number;
  containerWidth: number;
}

/**
 * Full-cell background config for each special tile type.
 * These render BEHIND the letter (z-index below GridComponent's cells)
 * to create distinctive visual treatments.
 */
const TILE_BACKGROUNDS: Record<string, {
  background: string;
  border: string;
  shadow: string;
  animationClass: string;
}> = {
  gold: {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.45) 0%, rgba(255,180,0,0.3) 40%, rgba(255,230,80,0.45) 100%)',
    border: '2px solid rgba(255,215,0,0.6)',
    shadow: 'inset 0 0 16px rgba(255,215,0,0.35), 0 0 10px rgba(255,200,0,0.25)',
    animationClass: 'blast-tile-gold',
  },
  bomb: {
    background: 'radial-gradient(circle at 35% 35%, rgba(255,100,60,0.45) 0%, rgba(180,20,0,0.35) 60%, rgba(80,0,0,0.25) 100%)',
    border: '2px solid rgba(255,70,40,0.55)',
    shadow: 'inset 0 0 14px rgba(255,30,0,0.3), 0 0 8px rgba(255,50,20,0.2)',
    animationClass: 'blast-tile-bomb',
  },
  rainbow: {
    background: 'linear-gradient(135deg, rgba(255,100,200,0.4) 0%, rgba(160,80,255,0.4) 33%, rgba(80,200,255,0.4) 66%, rgba(100,255,160,0.4) 100%)',
    border: '2px solid rgba(168,85,247,0.55)',
    shadow: 'inset 0 0 14px rgba(168,85,247,0.25), 0 0 10px rgba(168,85,247,0.2)',
    animationClass: 'blast-tile-rainbow',
  },
  ice: {
    background: 'linear-gradient(135deg, rgba(180,230,255,0.45) 0%, rgba(130,200,255,0.35) 50%, rgba(200,240,255,0.4) 100%)',
    border: '2px solid rgba(150,220,255,0.6)',
    shadow: 'inset 0 0 16px rgba(150,220,255,0.3), 0 0 8px rgba(180,230,255,0.25)',
    animationClass: 'blast-tile-ice',
  },
  wildcard: {
    background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35) 0%, rgba(200,200,255,0.25) 60%, rgba(150,150,200,0.2) 100%)',
    border: '2px dashed rgba(255,255,255,0.5)',
    shadow: 'inset 0 0 12px rgba(255,255,255,0.2), 0 0 8px rgba(200,200,255,0.15)',
    animationClass: 'blast-tile-wildcard',
  },
  lightning: {
    background: 'linear-gradient(135deg, rgba(255,225,0,0.45) 0%, rgba(0,191,255,0.35) 50%, rgba(255,255,0,0.4) 100%)',
    border: '2px solid rgba(255,225,0,0.6)',
    shadow: 'inset 0 0 16px rgba(255,255,0,0.3), 0 0 10px rgba(0,191,255,0.25)',
    animationClass: 'blast-tile-lightning',
  },
  magnet: {
    background: 'radial-gradient(circle at 40% 40%, rgba(139,0,255,0.45) 0%, rgba(255,0,64,0.35) 60%, rgba(139,0,255,0.25) 100%)',
    border: '2px solid rgba(139,0,255,0.6)',
    shadow: 'inset 0 0 14px rgba(139,0,255,0.3), 0 0 10px rgba(255,0,64,0.2)',
    animationClass: 'blast-tile-magnet',
  },
  prism: {
    background: 'conic-gradient(from 0deg, rgba(255,0,0,0.35), rgba(255,165,0,0.35), rgba(255,255,0,0.35), rgba(0,255,0,0.35), rgba(0,100,255,0.35), rgba(148,0,211,0.35), rgba(255,0,0,0.35))',
    border: '2px solid rgba(255,255,255,0.6)',
    shadow: 'inset 0 0 16px rgba(255,255,255,0.3), 0 0 10px rgba(168,85,247,0.25)',
    animationClass: 'blast-tile-prism',
  },
  gem: {
    background: 'radial-gradient(circle at 40% 35%, rgba(80,200,120,0.5) 0%, rgba(0,128,80,0.35) 60%, rgba(0,80,40,0.25) 100%)',
    border: '2px solid rgba(80,200,120,0.6)',
    shadow: 'inset 0 0 14px rgba(80,200,120,0.3), 0 0 10px rgba(0,200,100,0.25)',
    animationClass: 'blast-tile-gem',
  },
  frozen: {
    background: 'linear-gradient(135deg, rgba(200,220,255,0.5) 0%, rgba(160,200,240,0.4) 50%, rgba(220,240,255,0.45) 100%)',
    border: '3px solid rgba(180,220,255,0.7)',
    shadow: 'inset 0 0 18px rgba(180,220,255,0.35), 0 0 12px rgba(200,230,255,0.3)',
    animationClass: 'blast-tile-frozen',
  },
};

/**
 * BlastTileOverlay - Full-cell background treatments for special tiles + cleared gap cells.
 * Renders underneath the grid letters as colored overlays with animations.
 * Cleared cells render as dark inset gaps so the board visually "breathes" during cascade.
 */
export function BlastTileOverlay({
  tileStates,
  gridSize,
  containerWidth,
}: BlastTileOverlayProps) {
  const cellSize = containerWidth / gridSize;
  const inset = 2; // Small inset to not cover cell borders

  return (
    <div className="absolute inset-0 pointer-events-none z-[5]">
      <AnimatePresence mode="sync">
        {tileStates.flat().map(tile => {
          const x = tile.col * cellSize;
          const y = tile.row * cellSize;

          // Cleared tile — dark gap cell
          if (tile.isCleared) {
            return (
              <motion.div
                key={`gap-${tile.row}-${tile.col}`}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute rounded-lg"
                style={{
                  left: x + inset,
                  top: y + inset,
                  width: cellSize - inset * 2,
                  height: cellSize - inset * 2,
                  background: 'rgba(10, 10, 30, 0.7)',
                  border: '2px solid rgba(255,255,255,0.05)',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)',
                }}
              />
            );
          }

          // Standard tile — no overlay
          if (tile.type === 'standard') return null;

          const config = TILE_BACKGROUNDS[tile.type];
          if (!config) return null;

          // Multi-hit tile visual states
          const isCrackedIce = tile.type === 'ice' && tile.hitsRemaining === 1;
          const isCrackedPrism = tile.type === 'prism' && tile.hitsRemaining === 1;
          const isCrackedFrozen = tile.type === 'frozen' && tile.hitsRemaining <= 2;
          const isWeakened = isCrackedIce || isCrackedPrism || isCrackedFrozen;

          // Gem glow intensifies as hitsRemaining decreases (3->2->1)
          const gemGlowIntensity = tile.type === 'gem' ? (3 - tile.hitsRemaining + 1) : 0;

          let background = config.background;
          let border = config.border;
          if (isCrackedIce) {
            background = 'linear-gradient(135deg, rgba(180,230,255,0.3) 0%, rgba(100,180,220,0.2) 50%, rgba(180,230,255,0.3) 100%)';
            border = '2px solid rgba(255,255,255,0.4)';
          } else if (isCrackedPrism) {
            background = 'conic-gradient(from 0deg, rgba(255,0,0,0.25), rgba(255,165,0,0.25), rgba(255,255,0,0.25), rgba(0,255,0,0.25), rgba(0,100,255,0.25), rgba(148,0,211,0.25), rgba(255,0,0,0.25))';
            border = '2px solid rgba(255,255,255,0.7)';
          } else if (isCrackedFrozen) {
            background = tile.hitsRemaining === 1
              ? 'linear-gradient(135deg, rgba(200,220,255,0.3) 0%, rgba(140,180,220,0.2) 50%, rgba(200,220,255,0.3) 100%)'
              : 'linear-gradient(135deg, rgba(200,220,255,0.4) 0%, rgba(160,200,240,0.3) 50%, rgba(220,240,255,0.35) 100%)';
            border = tile.hitsRemaining === 1
              ? '2px solid rgba(255,255,255,0.5)'
              : '3px solid rgba(180,220,255,0.5)';
          }

          const gemShadow = gemGlowIntensity > 0
            ? `inset 0 0 ${14 + gemGlowIntensity * 4}px rgba(80,200,120,${0.2 + gemGlowIntensity * 0.1}), 0 0 ${8 + gemGlowIntensity * 4}px rgba(0,200,100,${0.15 + gemGlowIntensity * 0.1})`
            : config.shadow;

          return (
            <motion.div
              key={`bg-${tile.row}-${tile.col}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: isWeakened ? [1, 0.85, 1] : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={isWeakened
                ? { opacity: { duration: 1, repeat: Infinity, ease: 'easeInOut' }, type: 'spring', stiffness: 300, damping: 20 }
                : { type: 'spring', stiffness: 300, damping: 20 }
              }
              className={`absolute rounded-lg ${config.animationClass}`}
              style={{
                left: x + inset,
                top: y + inset,
                width: cellSize - inset * 2,
                height: cellSize - inset * 2,
                background,
                border,
                boxShadow: gemGlowIntensity > 0 ? gemShadow : config.shadow,
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

---

### BlastExplosionLayer
Renders particle explosions and score popups. Reuses ExplosionEffect and ScorePopup from adventure mode. Positioned absolutely over the grid.

```tsx
'use client';

import { ExplosionEffect } from '@/components/adventure/juice/ExplosionEffect';
import { ScorePopup } from '@/components/adventure/juice/ScorePopup';
import type { BlastExplosion, BlastScorePopup } from './types';

/** Varied colors per explosion type — avoids monotone orange */
const EXPLOSION_COLORS: Record<BlastExplosion['type'], string> = {
  bomb: '#FF4444',      // red
  clear: '#FFD700',     // gold
  word: '#00FFFF',      // cyan (was orange — now varied via palette in ExplosionEffect)
  cascade: '#FF00FF',   // magenta — distinct from player word clears
  lightning: '#FFFF00', // electric yellow
  magnet: '#8B00FF',    // purple
  prism: '#FF69B4',     // hot pink — spectrum detonation
  gem: '#50C878',       // emerald green — collection sparkle
};

interface BlastExplosionLayerProps {
  explosions: BlastExplosion[];
  scorePopups: BlastScorePopup[];
  onExplosionComplete: (id: string) => void;
  onScorePopupComplete: (id: string) => void;
  /** Cell size for converting grid coords to pixel positions */
  cellSize: number;
  /** Container offset for positioning */
  containerOffset: { x: number; y: number };
}

/**
 * BlastExplosionLayer - Renders particle explosions and score popups
 * Reuses ExplosionEffect and ScorePopup from adventure mode.
 * Positioned absolutely over the grid.
 */
export function BlastExplosionLayer({
  explosions,
  scorePopups,
  onExplosionComplete,
  onScorePopupComplete,
  cellSize,
  containerOffset,
}: BlastExplosionLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Particle explosions */}
      {explosions.map(exp => {
        const x = containerOffset.x + exp.col * cellSize + cellSize / 2;
        const y = containerOffset.y + exp.row * cellSize + cellSize / 2;

        return (
          <ExplosionEffect
            key={exp.id}
            position={{ x, y }}
            intensity={exp.intensity}
            color={EXPLOSION_COLORS[exp.type]}
            onComplete={() => onExplosionComplete(exp.id)}
          />
        );
      })}

      {/* Score popups — convert grid coords to pixel positions */}
      {scorePopups.map(popup => {
        const x = containerOffset.x + popup.col * cellSize + cellSize / 2;
        const y = containerOffset.y + popup.row * cellSize + cellSize / 2;

        return (
          <ScorePopup
            key={popup.id}
            score={popup.score}
            position={{ x, y }}
            onComplete={() => onScorePopupComplete(popup.id)}
          />
        );
      })}
    </div>
  );
}
```

---

### BlastCascadeOverlay
Renders anime.js-powered cascade animations. During cascade phases, this overlay renders animated tile representations: clearing (scale up + shrink away), falling (gravity slide down), appearing (pop in from above).

```tsx
'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { BLAST_ANIM, type BlastCascadePhase, type CascadeAnimationData } from './hooks/useBlastCascade';

interface BlastCascadeOverlayProps {
  /** Current cascade phase */
  phase: BlastCascadePhase;
  /** Animation data (cleared tiles, falling tiles, new tiles) */
  data: CascadeAnimationData | null;
  /** Grid dimensions */
  gridSize: number;
  /** Container width in pixels */
  containerWidth: number;
}

/**
 * BlastCascadeOverlay - Renders anime.js-powered cascade animations.
 *
 * During cascade phases, this overlay renders animated tile representations:
 * - clearing: cleared tiles scale up then shrink away with staggered rotation
 * - falling: surviving tiles slide down with gravity-proportional duration
 * - appearing: new tiles pop in from above with subtle overshoot
 *
 * Animation parameters stay synchronized with useBlastCascade via BLAST_ANIM config.
 */
export function BlastCascadeOverlay({
  phase,
  data,
  gridSize,
  containerWidth,
}: BlastCascadeOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cellSize = containerWidth / gridSize;

  // Run anime.js animations when phase changes
  useEffect(() => {
    if (!overlayRef.current || !data || phase === 'idle') return;

    const el = overlayRef.current;

    if (phase === 'clearing') {
      const clearTargets = el.querySelectorAll('.blast-cascade-clear');
      if (clearTargets.length > 0) {
        anime({
          targets: clearTargets,
          scale: [1, 1.2, 0],
          opacity: [1, 1, 0],
          rotate: anime.stagger([-8, 8]),
          filter: ['brightness(1)', 'brightness(1.5)', 'brightness(0.3)'],
          duration: BLAST_ANIM.clear.duration,
          easing: BLAST_ANIM.clear.easing,
          delay: anime.stagger(BLAST_ANIM.clear.stagger, { from: 'center' }),
        });
      }
    }

    if (phase === 'falling') {
      const fallTargets = el.querySelectorAll('.blast-cascade-fall');
      if (fallTargets.length > 0) {
        anime({
          targets: fallTargets,
          translateY: [
            function (el: Element) {
              const dist = Number((el as HTMLElement).dataset.fallDistance || 0);
              return -dist * cellSize;
            },
            0,
          ],
          scaleY: [0.92, 1.06, 1.0],
          scaleX: [1.04, 0.97, 1.0],
          duration: function (el: Element) {
            const dist = Number((el as HTMLElement).dataset.fallDistance || 1);
            return BLAST_ANIM.fall.baseDuration + dist * BLAST_ANIM.fall.perRowDuration;
          },
          easing: BLAST_ANIM.fall.easing,
        });
      }
    }

    if (phase === 'appearing') {
      const newTargets = el.querySelectorAll('.blast-cascade-new');
      if (newTargets.length > 0) {
        anime({
          targets: newTargets,
          translateY: [
            function (el: Element) {
              const offset = Number((el as HTMLElement).dataset.spawnOffset || 1);
              return -offset * cellSize;
            },
            0,
          ],
          scale: [0.5, 1],
          opacity: [0, 1],
          boxShadow: ['0 0 12px rgba(255,255,255,0.6)', '0 0 0px rgba(255,255,255,0)'],
          duration: BLAST_ANIM.appear.duration,
          easing: BLAST_ANIM.appear.easing,
          delay: anime.stagger(BLAST_ANIM.appear.stagger, { from: 'first' }),
        });
      }
    }
  }, [phase, data, cellSize]);

  if (!data || phase === 'idle') return null;

  const inset = 3;

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20">
      {/* Clearing phase: render ghost tiles at cleared positions that animate away */}
      {phase === 'clearing' && data.clearedTiles.map(tile => (
        <div
          key={`clear-${tile.row}-${tile.col}`}
          className="blast-cascade-clear absolute flex items-center justify-center rounded-lg font-black text-neo-black letter-tile-gradient"
          style={{
            left: tile.col * cellSize + inset,
            top: tile.row * cellSize + inset,
            width: cellSize - inset * 2,
            height: cellSize - inset * 2,
            fontSize: cellSize * 0.45,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tile.letter}
        </div>
      ))}

      {/* Falling phase: render tiles at final positions with translateY offset */}
      {phase === 'falling' && data.fallingTiles.map(tile => (
        <div
          key={`fall-${tile.row}-${tile.col}`}
          className="blast-cascade-fall absolute flex items-center justify-center rounded-lg font-black text-neo-black letter-tile-gradient"
          data-fall-distance={tile.fallDistance}
          style={{
            left: tile.col * cellSize + inset,
            top: tile.row * cellSize + inset,
            width: cellSize - inset * 2,
            height: cellSize - inset * 2,
            fontSize: cellSize * 0.45,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: `0 ${Math.min(tile.fallDistance * 3, 12)}px ${Math.min(tile.fallDistance * 4, 16)}px rgba(0,0,0,0.2)`,
          }}
        >
          {tile.letter}
        </div>
      ))}

      {/* Appearing phase: new tiles pop in from above */}
      {phase === 'appearing' && data.newTiles.map(tile => (
        <div
          key={`new-${tile.row}-${tile.col}`}
          className="blast-cascade-new absolute flex items-center justify-center rounded-lg font-black text-neo-black letter-tile-gradient opacity-0"
          data-spawn-offset={tile.spawnOffset}
          style={{
            left: tile.col * cellSize + inset,
            top: tile.row * cellSize + inset,
            width: cellSize - inset * 2,
            height: cellSize - inset * 2,
            fontSize: cellSize * 0.45,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tile.letter}
        </div>
      ))}
    </div>
  );
}
```

---

### BlastCascadeHighlight
Grid overlay showing cascade word paths. Renders at z-15 (between tile overlay z-5 and cascade overlay z-20). Each tile in the cascade word path gets a glow pulse + connecting line.

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { CascadeHighlightData } from './types';

interface BlastCascadeHighlightProps {
  highlightData: CascadeHighlightData | null;
  gridSize: number;
  cellSize: number;
}

/**
 * BlastCascadeHighlight — Grid overlay showing cascade word paths.
 * Renders at z-15 (between tile overlay z-5 and cascade overlay z-20).
 * Each tile in the cascade word path gets a glow pulse + connecting line.
 */
export function BlastCascadeHighlight({
  highlightData,
  cellSize,
}: BlastCascadeHighlightProps) {
  if (!highlightData) return null;

  const inset = 2;

  return (
    <div
      data-testid="cascade-highlight-overlay"
      className="absolute inset-0 pointer-events-none z-[15]"
    >
      <AnimatePresence mode="sync">
        {highlightData.words.map((wordData, wordIdx) => (
          <div key={`word-${wordIdx}`}>
            {/* Connecting line through the word column */}
            {wordData.path.length >= 2 && (
              <motion.div
                data-testid={`cascade-connector-${wordIdx}`}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 0.6 }}
                exit={{ scaleY: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="absolute origin-top"
                style={{
                  left: wordData.path[0].col * cellSize + cellSize / 2 - 1.5,
                  top: wordData.path[0].row * cellSize + cellSize / 2,
                  width: 3,
                  height: (wordData.path[wordData.path.length - 1].row - wordData.path[0].row) * cellSize,
                  background: 'linear-gradient(to bottom, rgba(255,0,255,0.8), rgba(168,85,247,0.6))',
                  borderRadius: 2,
                }}
              />
            )}

            {/* Glow cells for each tile in the path */}
            {wordData.path.map(cell => (
              <motion.div
                key={`glow-${cell.row}-${cell.col}`}
                data-testid={`cascade-glow-${cell.row}-${cell.col}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: [0.6, 0.9, 0.6],
                  scale: [1, 1.05, 1],
                }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{
                  opacity: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
                  scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
                }}
                className="absolute rounded-lg"
                style={{
                  left: cell.col * cellSize + inset,
                  top: cell.row * cellSize + inset,
                  width: cellSize - inset * 2,
                  height: cellSize - inset * 2,
                  background: 'radial-gradient(circle, rgba(255,0,255,0.35) 0%, rgba(168,85,247,0.2) 60%, transparent 100%)',
                  border: '2px solid rgba(255,0,255,0.5)',
                  boxShadow: '0 0 12px rgba(255,0,255,0.4), inset 0 0 8px rgba(255,0,255,0.2)',
                }}
              />
            ))}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

---

### BlastCascadeWordBanner
Floating banner(s) showing cascade word details. Displays word text (uppercase), CHAIN x{level} badge, and +{score}. Multiple banners stack vertically for simultaneous cascade words.

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { CascadeHighlightData } from './types';

interface BlastCascadeWordBannerProps {
  highlightData: CascadeHighlightData | null;
}

/** Gradient class by chain level — intensity scales with chain depth */
function getBannerGradient(chainLevel: number): string {
  if (chainLevel >= 4) return 'bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-purple-500';
  if (chainLevel >= 2) return 'bg-gradient-to-r from-fuchsia-500 to-purple-600';
  return 'bg-gradient-to-r from-fuchsia-400 to-purple-500';
}

/**
 * BlastCascadeWordBanner — Floating banner(s) showing cascade word details.
 * Displays word text (uppercase), CHAIN x{level} badge, and +{score}.
 * Multiple banners stack vertically for simultaneous cascade words.
 */
export function BlastCascadeWordBanner({ highlightData }: BlastCascadeWordBannerProps) {
  if (!highlightData) return null;

  return (
    <AnimatePresence>
      {highlightData.words.map((wordData, idx) => (
        <motion.div
          key={`banner-${idx}`}
          data-testid={`cascade-word-banner-${idx}`}
          initial={{ opacity: 0, scale: 0.5, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.3, y: -10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: idx * 0.1 }}
          className={cn(
            'px-4 py-2 rounded-neo border-3 border-neo-black shadow-hard',
            'flex items-center gap-3 text-white',
            getBannerGradient(wordData.chainLevel),
            idx > 0 ? 'mt-2' : '',
          )}
        >
          {/* Word text */}
          <span className="font-black text-xl uppercase tracking-wider">
            {wordData.word.toUpperCase()}
          </span>

          {/* Chain level badge */}
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            CHAIN x{wordData.chainLevel}
          </span>

          {/* Score */}
          <span className="font-black text-lg tabular-nums">
            +{wordData.score}
          </span>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
```

---

### BlastProgressBar
Shows board clear progress with milestone markers (25%, 50%, 75%, 100%). Color transitions: white -> cyan -> lime -> gold. Spring-animated fill with milestone pulse effects.

```tsx
'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlastProgressBarProps {
  cleared: number;
  total: number;
  t: (key: string) => string | undefined;
}

/** Color stops for progress: white -> cyan -> lime -> gold */
function getProgressColor(pct: number): string {
  if (pct >= 100) return '#FFD700'; // gold
  if (pct >= 75) return '#BFFF00';  // lime
  if (pct >= 50) return '#00FFFF';  // cyan
  return '#FFFFFF';                  // white
}

const MILESTONES = [25, 50, 75, 100];

/** Which milestone threshold was just crossed? */
function getMilestoneCrossed(prev: number, curr: number): number | null {
  for (const m of MILESTONES) {
    if (prev < m && curr >= m) return m;
  }
  return null;
}

/**
 * BlastProgressBar - Shows board clear progress with milestone markers.
 * Uses motion.div animate prop for reliable FM v12 spring animation.
 */
export function BlastProgressBar({ cleared, total, t }: BlastProgressBarProps) {
  const percentage = total > 0 ? Math.min(Math.round((cleared / total) * 100), 100) : 0;
  const color = getProgressColor(percentage);
  const prevPctRef = useRef(0);
  const [milestonePulse, setMilestonePulse] = useState<number | null>(null);

  // Detect milestone crossings for celebration pulse
  useEffect(() => {
    const milestone = getMilestoneCrossed(prevPctRef.current, percentage);
    prevPctRef.current = percentage;
    if (milestone) {
      setMilestonePulse(milestone);
      const timer = setTimeout(() => setMilestonePulse(null), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [percentage]);

  return (
    <div className="w-full">
      {/* Label */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
          {t('blast.progress') || 'Cleared'}
        </span>
        <span className="text-xs font-black text-white tabular-nums">
          {cleared}/{total}
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
        {/* Milestone markers */}
        {MILESTONES.map(m => (
          <div
            key={m}
            className="absolute top-0 bottom-0 w-px"
            style={{
              left: `${m}%`,
              backgroundColor: percentage >= m ? `${getProgressColor(m)}60` : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}

        {/* Animated fill — uses animate prop for reliable FM v12 updates */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: '0%' }}
          animate={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 ${milestonePulse ? '16px' : '8px'} ${color}${milestonePulse ? '80' : '40'}`,
          }}
          transition={{
            width: { type: 'spring', stiffness: 120, damping: 20, mass: 0.8 },
            backgroundColor: { duration: 0.3 },
            boxShadow: { duration: 0.3 },
          }}
        />

        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />

        {/* Milestone pulse flash */}
        <AnimatePresence>
          {milestonePulse && (
            <motion.div
              key={`pulse-${milestonePulse}`}
              initial={{ opacity: 0.8, scaleX: 0 }}
              animate={{ opacity: 0, scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full origin-left"
              style={{ backgroundColor: `${getProgressColor(milestonePulse)}30` }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Percentage badge */}
      {percentage > 0 && (
        <motion.div
          key={percentage}
          initial={{ scale: 1.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mt-1"
        >
          <span
            className="text-[10px] font-black uppercase tracking-wide"
            style={{ color }}
          >
            {percentage}%
          </span>
        </motion.div>
      )}
    </div>
  );
}
```

---

### BlastResults
Results screen for Blast Mode. Shows star rating (1-3), stat cards (score, cleared %, words, best word, max combo, waves), wave-by-wave breakdown, and play again/home buttons.

```tsx
'use client';

import { motion } from 'framer-motion';
import { Star, RotateCcw, Home, Trophy, Zap, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastResultsData, BlastDifficulty } from './types';
import { useBlastResultSaver } from './hooks/useBlastResultSaver';

interface BlastResultsProps {
  results: BlastResultsData;
  difficulty?: BlastDifficulty;
  language?: string;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

/** Star display with fill animation */
function StarRating({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{
            scale: i <= stars ? 1 : 0.6,
            rotate: 0,
            opacity: i <= stars ? 1 : 0.3,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 15,
            delay: 0.3 + i * 0.15,
          }}
        >
          <Star
            className={cn(
              'w-10 h-10 sm:w-12 sm:h-12',
              i <= stars ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg' : 'text-white/20'
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}

/** Stat card for results display */
function StatCard({
  icon,
  label,
  value,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'bg-white/5 rounded-neo border-2 border-white/10',
        'backdrop-blur-sm'
      )}
    >
      <div className="text-neo-cyan">{icon}</div>
      <div>
        <div className="font-black text-white text-lg leading-tight">{value}</div>
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</div>
      </div>
    </motion.div>
  );
}

/**
 * BlastResults - Results screen for Blast Mode.
 * Shows star rating, stats, and play again options.
 */
export function BlastResults({ results, difficulty = 'medium', language = 'en', onPlayAgain, onBackToHome }: BlastResultsProps) {
  const { t } = useLanguage();
  const { isNewBestScore, isNewBestCombo } = useBlastResultSaver(results, difficulty, language);

  const starLabel = results.stars === 3
    ? (t('blast.stars3') || 'Perfect!')
    : results.stars === 2
      ? (t('blast.stars2') || 'Great')
      : (t('blast.stars1') || 'Good');

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4"
      >
        <h1 className="text-3xl sm:text-4xl font-black uppercase text-white mb-1">
          {t('blast.title') || 'Blast Mode'}
        </h1>
        <p className="text-lg font-bold text-neo-orange">
          {starLabel}
        </p>
      </motion.div>

      {/* Star rating */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <StarRating stars={results.stars} />
      </motion.div>

      {/* Stats grid */}
      <div className="w-full max-w-sm space-y-2 mb-8">
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label={t('common.score') || 'Score'}
          value={`${results.finalScore.toLocaleString()}${isNewBestScore ? ' ★' : ''}`}
          delay={0.5}
        />
        <StatCard
          icon={<Grid3X3 className="w-5 h-5" />}
          label={t('blast.progress') || 'Cleared'}
          value={`${results.clearPercentage}% (${results.tilesCleared}/${results.totalTiles})`}
          delay={0.6}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label={t('common.words') || 'Words'}
          value={results.wordsFound.length}
          delay={0.7}
        />
        {results.bestWord && (
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label={t('results.bestWord') || 'Best Word'}
            value={results.bestWord.toUpperCase()}
            delay={0.8}
          />
        )}
        {results.maxCombo > 0 && (
          <StatCard
            icon={<Zap className="w-5 h-5 text-neo-orange" />}
            label={t('results.maxCombo') || 'Max Combo'}
            value={`${results.maxCombo}x${isNewBestCombo ? ' ★' : ''}`}
            delay={0.9}
          />
        )}
        {(results.wavesCompleted ?? 0) > 0 && (
          <StatCard
            icon={<Zap className="w-5 h-5 text-fuchsia-400" />}
            label={t('blast.wavesCompleted') || 'Waves'}
            value={results.wavesCompleted}
            delay={1.0}
          />
        )}
      </div>

      {/* Wave-by-wave breakdown */}
      {(results.waveResults?.length ?? 0) > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="w-full max-w-sm mb-8"
        >
          <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 text-center">
            {t('blast.waveBreakdown') || 'Wave Breakdown'}
          </div>
          <div className="space-y-1">
            {results.waveResults.map((wr) => (
              <div
                key={wr.waveNumber}
                className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded border border-white/10 text-sm"
              >
                <span className="font-bold text-fuchsia-300">Wave {wr.waveNumber}</span>
                <span className="text-white/70 tabular-nums">
                  {wr.score} pts · {wr.wordsFound} words · {wr.clearPercentage}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
        <Button
          variant="success"
          size="lg"
          onClick={onPlayAgain}
          className="w-full min-h-[52px] font-black text-lg uppercase border-3 border-neo-black shadow-hard"
        >
          <RotateCcw className="me-2 h-5 w-5" />
          {t('common.playAgain') || 'Play Again'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onBackToHome}
          className="w-full min-h-[48px] font-bold uppercase"
        >
          <Home className="me-2 h-5 w-5" />
          {t('common.home') || 'Home'}
        </Button>
      </motion.div>
    </div>
  );
}
```

---

### BlastWaveTransition
Full-screen overlay between waves. Shows "WAVE N" with previous wave stats (score, words, cleared %). Auto-advances after 2.5s or on tap to skip.

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BlastWaveTransitionProps {
  /** The upcoming wave number */
  waveNumber: number;
  /** Score from the wave that just ended */
  previousWaveScore: number;
  /** Words found in the wave that just ended */
  previousWaveWords: number;
  /** Clear percentage from the wave that just ended */
  previousClearPercentage: number;
  /** Called when transition ends (auto after 2.5s or on tap) */
  onAdvance: () => void;
}

/**
 * BlastWaveTransition — Full-screen overlay between waves.
 * Shows "WAVE N" with previous wave stats. Auto-advances or tap to skip.
 */
export function BlastWaveTransition({
  waveNumber,
  previousWaveScore,
  previousWaveWords,
  previousClearPercentage,
  onAdvance,
}: BlastWaveTransitionProps) {
  const hasAdvancedRef = useRef(false);

  const advance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  // Auto-advance after 2.5s
  useEffect(() => {
    const timer = setTimeout(advance, 2500);
    return () => clearTimeout(timer);
  }, [advance]);

  return (
    <div
      data-testid="wave-transition-overlay"
      onClick={advance}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center',
        'bg-neo-black/60 backdrop-blur-sm cursor-pointer'
      )}
    >
      {/* Wave number */}
      <motion.div
        initial={{ scale: 0.3, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={cn(
          'px-8 py-4 rounded-neo border-3 border-neo-black shadow-hard-lg',
          'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-700',
          'text-center mb-6'
        )}
      >
        <div className="font-black text-4xl uppercase text-white tracking-wider">
          WAVE {waveNumber}
        </div>
      </motion.div>

      {/* Previous wave stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className={cn(
          'flex gap-6 text-center',
          'bg-white/10 rounded-neo border-2 border-white/20 px-6 py-3'
        )}
      >
        <div>
          <div className="font-black text-xl text-white">{previousWaveScore}</div>
          <div className="text-[10px] font-bold text-white/50 uppercase">Score</div>
        </div>
        <div>
          <div className="font-black text-xl text-white">{previousWaveWords}</div>
          <div className="text-[10px] font-bold text-white/50 uppercase">Words</div>
        </div>
        <div>
          <div className="font-black text-xl text-white">{previousClearPercentage}%</div>
          <div className="text-[10px] font-bold text-white/50 uppercase">Cleared</div>
        </div>
      </motion.div>

      {/* Tap hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="mt-6 text-white/40 text-xs font-bold uppercase tracking-wider"
      >
        Tap to continue
      </motion.div>
    </div>
  );
}
```

---

### BlastHelpModal
Explains Blast mode mechanics and special tiles. Uses AlertDialog from ui/alert-dialog.tsx. Lists tile types: Gold (3x), Bomb (clears 8 surrounding), Rainbow (+5 bonus), Prism (2-hit cross-clear), Gem (+3/+8), Frozen (3-hit blocker).

```tsx
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Gem, Bomb, Rainbow, Hand, Diamond, Snowflake, Sparkles } from 'lucide-react';

interface BlastHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string | undefined;
}

/**
 * BlastHelpModal - Explains Blast mode mechanics and special tiles.
 */
export function BlastHelpModal({ open, onOpenChange, t }: BlastHelpModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm border-3 border-neo-black shadow-hard-lg bg-neo-navy text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black uppercase text-center text-neo-yellow">
            {t('blast.helpTitle') || 'How to Play'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-white/80 text-sm">
              {/* Drag instruction */}
              <div className="flex items-start gap-3">
                <Hand className="w-5 h-5 text-neo-cyan shrink-0 mt-0.5" />
                <p>{t('blast.helpDrag') || 'Drag across letters to form words. Words must be at least 2 letters long.'}</p>
              </div>

              {/* Special tiles */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-yellow-300 to-amber-500 border border-yellow-600 shrink-0 flex items-center justify-center">
                    <Gem className="w-3 h-3 text-yellow-900" />
                  </div>
                  <p><span className="font-bold text-yellow-400">{t('blast.helpGoldLabel') || 'Gold'}</span> — {t('blast.helpGold') || '3x score multiplier for the word.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-red-500 to-red-800 border border-red-600 shrink-0 flex items-center justify-center">
                    <Bomb className="w-3 h-3 text-white" />
                  </div>
                  <p><span className="font-bold text-red-400">{t('blast.helpBombLabel') || 'Bomb'}</span> — {t('blast.helpBomb') || 'Clears all 8 surrounding tiles.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 border border-purple-500 shrink-0 flex items-center justify-center">
                    <Rainbow className="w-3 h-3 text-white" />
                  </div>
                  <p><span className="font-bold text-purple-400">{t('blast.helpRainbowLabel') || 'Rainbow'}</span> — {t('blast.helpRainbow') || '+5 bonus points.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded border border-white/60 shrink-0 flex items-center justify-center" style={{ background: 'conic-gradient(from 0deg, #f00, #f90, #ff0, #0f0, #06f, #93f, #f00)' }}>
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p><span className="font-bold text-pink-400">{t('blast.helpPrismLabel') || 'Prism'}</span> — {t('blast.helpPrism') || 'Use in 2 words to trigger a cross-clear.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-emerald-400 to-emerald-700 border border-emerald-500 shrink-0 flex items-center justify-center">
                    <Diamond className="w-3 h-3 text-white" />
                  </div>
                  <p><span className="font-bold text-emerald-400">{t('blast.helpGemLabel') || 'Gem'}</span> — {t('blast.helpGem') || '+3 per use, +8 on collection.'}</p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-gradient-to-br from-blue-200 to-blue-400 border-2 border-blue-300 shrink-0 flex items-center justify-center">
                    <Snowflake className="w-3 h-3 text-blue-800" />
                  </div>
                  <p><span className="font-bold text-blue-300">{t('blast.helpFrozenLabel') || 'Frozen'}</span> — {t('blast.helpFrozen') || '3 hits to break. Blocks cascades.'}</p>
                </div>
              </div>

              {/* Goal */}
              <p className="text-white/60 text-xs border-t border-white/10 pt-3">
                {t('blast.helpGoal') || 'Clear as many tiles as possible for the highest score!'}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="w-full bg-neo-yellow text-neo-black font-black border-2 border-neo-black shadow-hard-sm hover:shadow-hard">
            {t('common.gotIt') || 'Got it!'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

### BlastFoundWords
Compact pill list of found words during gameplay. Displayed inline when user taps the words count.

```tsx
'use client';

interface BlastFoundWordsProps {
  words: string[];
  t: (key: string) => string | undefined;
}

/**
 * BlastFoundWords - Compact pill list of found words during gameplay.
 * Displayed inline when user taps the words count.
 */
export function BlastFoundWords({ words, t }: BlastFoundWordsProps) {
  return (
    <div className="py-2 mb-2">
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
        {t('blast.foundWords') || 'Found Words'}
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="px-2.5 py-0.5 rounded-neo bg-white/10 border border-white/15 text-white/80 text-xs font-bold uppercase shadow-sm"
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}
```

---

## Shared UI Components (used by Blast)

### Button (ui/button.tsx)
Neo-Brutalist button with thick borders, hard shadows, physical press effect, uppercase text. Variants: default (lime), destructive (red), outline (cream), secondary (pink), ghost, link, success, accent, cyan. Sizes: default, sm, lg, xl, 2xl, icon, icon-lg, icon-xl.

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

// Neo-Brutalist Button Variants
// Features: Thick borders, hard shadows, physical press effect, uppercase text
const buttonVariants = cva(
  // Base styles: Neo-Brutalist foundation
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-bold uppercase tracking-wide",
    "border-3 border-neo-black rounded-neo",
    "shadow-hard",
    "transition-all duration-100",
    // Press effect: translate to close shadow gap
    "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg",
    "active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed",
    // Focus styling
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-white dark:focus-visible:ring-offset-neo-navy",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0",
    // SVG icons - responsive sizes
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg]:w-5 [&_svg]:h-5",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: Electric Yellow - main CTA
        default: "bg-neo-lime text-neo-black hover:bg-neo-lime-hover",
        // Destructive: Red for danger actions
        destructive: "bg-neo-red text-neo-black hover:brightness-110",
        // Outline: Transparent with border
        outline: [
          "bg-neo-cream text-neo-black",
          "hover:bg-neo-white",
        ].join(" "),
        // Secondary: Pink accent
        secondary: "bg-neo-pink text-neo-black hover:brightness-110",
        // Ghost: Minimal, with high-contrast visible border for accessibility (WCAG AA 3:1 for UI components)
        ghost: [
          "bg-transparent text-neo-black dark:text-neo-white border-3 border-neo-black dark:border-neo-cream shadow-none",
          "hover:bg-neo-navy-light/50 hover:border-neo-cyan hover:shadow-hard-sm",
          "hover:translate-x-0 hover:translate-y-0",
          "active:translate-x-0 active:translate-y-0 active:shadow-none",
        ].join(" "),
        // Link: Text only with always-visible underline for accessibility
        link: [
          "bg-transparent text-neo-black dark:text-neo-cyan border-0 shadow-none",
          "underline underline-offset-4 decoration-2 decoration-neo-cyan",
          "hover:brightness-110 hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
          "active:translate-x-0 active:translate-y-0",
        ].join(" "),
        // NEW: Success variant (green)
        success: "bg-neo-lime text-neo-black hover:brightness-110",
        // NEW: Accent variant (pink)
        accent: "bg-neo-pink text-neo-black hover:brightness-110",
        // NEW: Cyan variant
        cyan: "bg-neo-cyan text-neo-black hover:brightness-110",
      },
      size: {
        // Consistent sizing with proper touch targets (48px minimum)
        default: "h-12 min-h-[48px] px-5 py-3 [&_svg]:w-5 [&_svg]:h-5",
        sm: "h-11 min-h-[44px] px-4 py-2 text-xs [&_svg]:w-4 [&_svg]:h-4",
        lg: "h-14 min-h-[56px] px-8 py-4 text-base [&_svg]:w-6 [&_svg]:h-6",
        // Desktop-optimized larger sizes
        xl: "h-16 min-h-[64px] px-10 py-5 text-lg [&_svg]:w-7 [&_svg]:h-7",
        "2xl": "h-18 min-h-[72px] px-12 py-6 text-xl [&_svg]:w-8 [&_svg]:h-8",
        icon: "h-12 w-12 min-h-[48px] min-w-[48px] p-0 [&_svg]:w-5 [&_svg]:h-5",
        "icon-lg": "h-14 w-14 min-h-[56px] min-w-[56px] p-0 [&_svg]:w-6 [&_svg]:h-6",
        "icon-xl": "h-16 w-16 min-h-[64px] min-w-[64px] p-0 [&_svg]:w-7 [&_svg]:h-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

---

### AlertDialog (ui/alert-dialog.tsx)
Radix UI AlertDialog primitives with Neo-Brutalist styling. Used by BlastHelpModal.

```tsx
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "../../lib/utils"
import { buttonVariants } from "./button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-[100] bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[101] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 sm:rtl:space-x-reverse sm:gap-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

// dir="auto" ensures proper punctuation placement in mixed RTL/LTR contexts
const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    dir="auto"
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

// dir="auto" ensures proper punctuation placement in mixed RTL/LTR contexts
const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    dir="auto"
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
```
