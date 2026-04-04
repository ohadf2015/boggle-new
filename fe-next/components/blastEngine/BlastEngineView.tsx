// ─── Blast Engine View ────────────────────────────────────────────────
// Top-level component for the new PixiJS-powered Blast mode.
// Wraps GameCanvas with HUD overlay and game state management.
// Phase router: ready → playing → waveTransition → results.

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Zap, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { GameCanvas, type GameCanvasConfig } from '@/lib/gameEngine';
import { BlastReadyScreen, BlastWaveTransitionScreen, BlastResultsScreen } from './BlastPhaseScreens';
import { useBlastGameLoop } from './hooks/useBlastGameLoop';
import { useBlastEngineSounds } from './hooks/useBlastEngineSounds';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import { ComboMilestoneAnnouncement } from '@/components/game/ComboMilestoneAnnouncement';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useCrazyGamesLifecycle } from '@/hooks/useCrazyGamesLifecycle';
import { resolveBlastConfig, type BlastPhase, type BlastResultsData, type WaveResult } from '@/components/blast/types';
import { getWaveConfig, getWaveDistribution, getWaveObjectives } from '@/components/blast/utils/blastWaveConfig';
import { calculateEarnedStars } from '@/components/blast/utils/blastStarCalculator';
import type { Language } from '@/shared/types/game';

// Dynamically import the PixiJS game canvas (SSR-unsafe)
const BlastGameCanvas = dynamic(
  () => import('./BlastGameCanvas').then((m) => ({ default: m.BlastGameCanvas })),
  { ssr: false },
);

// ─── Responsive Canvas Size Hook ──────────────────────────────────────

const MIN_WIDTH = 320;
const MAX_WIDTH = 560;
// border-neo = 3px each side = 6px total; account for it so grid isn't clipped
const BORDER_TOTAL = 6;

function useResponsiveCanvasSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 400, height: 560 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      // Subtract padding (px-2 = 16px) AND border (border-neo = 6px) so canvas fits
      const w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, el.clientWidth - 16 - BORDER_TOTAL));
      // Use visualViewport for accurate mobile height (accounts for keyboard, notch, etc.)
      const vp = typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 800;
      const viewH = vp - 16 - BORDER_TOTAL;
      const idealH = w + 140;
      const h = Math.min(viewH, idealH);
      setSize({ width: w, height: Math.round(h) });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [containerRef]);

  return size;
}

// ─── Component ────────────────────────────────────────────────────────

export function BlastEngineView() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasSize = useResponsiveCanvasSize(containerRef);

  const [phase, setPhase] = useState<BlastPhase>('ready');
  const [results, setResults] = useState<BlastResultsData | null>(null);
  const gameKeyRef = useRef(0);

  // Wave tracking
  const [currentWave, setCurrentWave] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [allWordsFound, setAllWordsFound] = useState<string[]>([]);
  const [waveHistory, setWaveHistory] = useState<WaveResult[]>([]);
  const [lastWaveStats, setLastWaveStats] = useState({ score: 0, words: 0, clearPct: 0 });

  const baseConfig = resolveBlastConfig((language as Language) || 'en', 'medium');
  const waveConfig = getWaveConfig(currentWave);
  const config = useMemo(
    () => ({
      ...baseConfig,
      specialTileChance: waveConfig.specialTileChance,
      customDistribution: getWaveDistribution(waveConfig),
    }),
    [baseConfig, waveConfig],
  );

  // ─── Game loop hook ─────────────────────────────────────────────

  const game = useBlastGameLoop({
    config,
    wave: currentWave,
    language: (language as Language) || 'en',
    movesAllowed: waveConfig.movesAllowed,
  });

  // ─── Sound effects ──────────────────────────────────────────────

  useBlastEngineSounds({
    tilesCleared: game.tilesCleared,
    comboLevel: game.comboLevel,
    cascadeLevel: game.cascadeLevel,
    waveCleared: game.isWaveCleared,
    gameOver: phase === 'results',
    swapOccurred: false,
    wordsFoundCount: game.wordsFound.length,
  });

  // ─── Move warning sounds (3, 2, 1 remaining) ──────────────────
  const sfx = useSoundEffects();
  const prevMovesRef = useRef(game.movesRemaining);
  useEffect(() => {
    if (phase !== 'playing') return;
    if (game.movesRemaining < prevMovesRef.current && game.movesRemaining >= 1 && game.movesRemaining <= 3) {
      sfx.playCountdownBeep?.(game.movesRemaining);
    }
    prevMovesRef.current = game.movesRemaining;
  }, [game.movesRemaining, phase, sfx]);

  // ─── Round start sound ─────────────────────────────────────────
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'playing' && prevPhaseRef.current !== 'playing') {
      sfx.playRoundStartSound?.();
    }
    prevPhaseRef.current = phase;
  }, [phase, sfx]);

  // ─── CrazyGames SDK lifecycle ──────────────────────────────────
  useCrazyGamesLifecycle({
    isGameActive: phase === 'playing',
    isGameOver: phase === 'results',
    score: totalScore + game.score,
    maxCombo: game.comboLevel,
    wordsFound: game.wordsFound.length,
  });

  // ─── Phase handlers ─────────────────────────────────────────────

  const handleStart = useCallback(() => {
    gameKeyRef.current += 1;
    setCurrentWave(1);
    setTotalScore(0);
    setAllWordsFound([]);
    setWaveHistory([]);
    game.reset();
    setPhase('playing');
  }, [game]);

  const handleWaveComplete = useCallback(
    (waveScore: number, waveWords: string[], clearPct: number, tilesCleared: number, totalTilesCount: number) => {
      const stars = calculateEarnedStars(tilesCleared, totalTilesCount);
      const waveResult: WaveResult = {
        waveNumber: currentWave,
        score: waveScore,
        wordsFound: waveWords.length,
        clearPercentage: clearPct,
      };

      setWaveHistory((prev) => [...prev, waveResult]);
      setTotalScore((prev) => prev + waveScore);
      setAllWordsFound((prev) => [...prev, ...waveWords]);
      setLastWaveStats({ score: waveScore, words: waveWords.length, clearPct });

      if (clearPct >= 50) {
        setPhase('waveTransition');
      } else {
        // Game over — didn't clear enough
        const allWords = [...allWordsFound, ...waveWords];
        setResults({
          finalScore: totalScore + waveScore,
          tilesCleared,
          totalTiles: totalTilesCount,
          clearPercentage: clearPct,
          wordsFound: allWords,
          bestWord: allWords.sort((a, b) => b.length - a.length)[0] ?? '',
          maxCombo: game.comboLevel,
          stars,
          wavesCompleted: currentWave,
          waveResults: [...waveHistory, waveResult],
        });
        setPhase('results');
      }
    },
    [currentWave, totalScore, allWordsFound, waveHistory, game.comboLevel],
  );

  // ─── React to wave completion / game over from game loop ──────
  useEffect(() => {
    if (phase !== 'playing') return;

    const pct = game.totalTiles > 0 ? (game.tilesCleared / game.totalTiles) * 100 : 0;

    if (game.isWaveCleared) {
      handleWaveComplete(game.score, game.wordsFound, pct, game.tilesCleared, game.totalTiles);
    } else if (game.movesRemaining <= 0 && !game.isProcessing) {
      // Out of moves — game over
      handleWaveComplete(game.score, game.wordsFound, pct, game.tilesCleared, game.totalTiles);
    }
  }, [game.isWaveCleared, game.movesRemaining, game.isProcessing, phase, game.score, game.wordsFound, game.tilesCleared, game.totalTiles, handleWaveComplete]);

  const handleNextWave = useCallback(() => {
    setCurrentWave((prev) => prev + 1);
    game.reset();
    setPhase('playing');
  }, [game]);

  const handleBackToMenu = useCallback(() => {
    router.push('/');
  }, [router]);

  // Canvas config (must be before early returns — no hooks after conditionals)
  const canvasConfig: GameCanvasConfig = {
    width: canvasSize.width,
    height: canvasSize.height,
    background: 0x0d0d1a,
    antialias: true,
  };

  // Wave objectives (used by BlastStage path, kept for reference)
  void getWaveObjectives;

  // ─── Render by phase ────────────────────────────────────────────

  if (phase === 'ready') {
    return <BlastReadyScreen onStart={handleStart} onBack={handleBackToMenu} t={t} />;
  }

  if (phase === 'waveTransition') {
    const waveStars = calculateEarnedStars(game.tilesCleared, game.totalTiles);
    return (
      <BlastWaveTransitionScreen
        currentWave={currentWave}
        lastWaveStats={lastWaveStats}
        stars={waveStars}
        onNextWave={handleNextWave}
        t={t}
      />
    );
  }

  if (phase === 'results') {
    return (
      <BlastResultsScreen
        results={results}
        onPlayAgain={handleStart}
        onBack={handleBackToMenu}
        t={t}
      />
    );
  }

  // ─── Playing phase — PixiJS canvas + HUD overlay ────────────────

  // Clear progress percentage for HUD
  const clearPct = game.totalTiles > 0 ? Math.round((game.tilesCleared / game.totalTiles) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-start min-h-dvh w-full px-2 py-2"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
    >
      <GameCanvas
        config={canvasConfig}
        usePhysics={true}
        physicsConfig={{ gravity: { x: 0, y: 1.5 }, gravityScale: 0.001 }}
        className="rounded-neo border-neo shadow-hard"
      >
        {/* HUD — compact translucent top bar */}
        <div
          className="pointer-events-auto flex items-center justify-between gap-2 px-3 py-2 pt-safe"
          style={{
            background: 'linear-gradient(180deg, rgba(15,12,41,0.85) 0%, rgba(15,12,41,0.5) 100%)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            onClick={handleBackToMenu}
            className="pointer-events-auto text-white/30 hover:text-neo-red transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm">★</span>
            <span
              className="font-neo-display text-xl font-black tabular-nums"
              style={{
                background: 'linear-gradient(180deg, #FFE566 0%, #FFD700 50%, #B8860B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
              }}
            >
              {totalScore + game.score}
            </span>
          </div>

          <div
            className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/20 bg-white/5"
          >
            <span className="text-white font-neo-display text-lg font-black tabular-nums leading-none">
              {game.movesRemaining}
            </span>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 border-neo-cyan/40">
            <Zap className="w-3 h-3 text-neo-cyan" />
            <span className="text-neo-cyan font-neo-display text-xs font-bold" style={{ textShadow: '0 0 6px rgba(0,255,255,0.3)' }}>
              W{currentWave}
            </span>
          </div>

          {game.comboLevel >= 2 && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-neo-lime text-neo-black border-2 border-neo-black animate-neo-pop">
              x{game.comboLevel}
            </span>
          )}
        </div>

        {/* Progress bar — thin glowing line */}
        <div className="pointer-events-none px-2">
          <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(clearPct * 2, 100)}%`,
                background: clearPct >= 50
                  ? 'linear-gradient(90deg, #BFFF00, #D9FF66)'
                  : 'linear-gradient(90deg, #00FFFF, #66FFFF)',
                boxShadow: clearPct >= 50
                  ? '0 0 8px rgba(191,255,0,0.5)'
                  : '0 0 8px rgba(0,255,255,0.5)',
              }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
          </div>
        </div>

        {/* Word display — golden ribbon at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-center pb-3">
          {game.currentWord ? (
            <div
              className="px-6 py-2.5 rounded-xl border border-amber-500/20"
              style={{
                background: 'linear-gradient(90deg, rgba(184,134,11,0.2) 0%, rgba(255,215,0,0.15) 50%, rgba(184,134,11,0.2) 100%)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="font-neo-display text-white text-xl font-black tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {game.currentWord.toUpperCase()}
              </span>
              <span className={`ml-2 text-xs font-bold ${game.currentWord.length >= 3 ? 'text-neo-lime' : 'text-white/30'}`}>
                {game.currentWord.length >= 3 ? '✓' : `${3 - game.currentWord.length} more`}
              </span>
            </div>
          ) : game.wordsFound.length > 0 ? (
            <motion.div
              key={game.wordsFound.length}
              initial={{ scale: 1.3, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-neo-cyan/30"
              style={{
                background: 'linear-gradient(90deg, rgba(0,255,255,0.12) 0%, rgba(15,12,41,0.8) 50%, rgba(0,255,255,0.12) 100%)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="text-neo-lime text-lg">✓</span>
              <span className="font-neo-display text-neo-cyan text-lg font-black tracking-wide" style={{ textShadow: '0 0 8px rgba(0,255,255,0.4)' }}>
                {game.wordsFound[game.wordsFound.length - 1]?.toUpperCase()}
              </span>
              {game.lastScoreFly && (
                <span className="font-neo-display text-neo-lime text-sm font-bold">
                  +{game.lastScoreFly.score}
                </span>
              )}
              {game.comboLevel > 1 && (
                <span className="text-neo-pink text-xs font-bold px-1.5 py-0.5 rounded bg-neo-pink/15 border border-neo-pink/30">
                  {game.comboLevel}x
                </span>
              )}
              <span className="text-white/30 text-xs font-neo-body tabular-nums ml-1">
                {game.wordsFound.length} {t('blast.words') || 'words'}
              </span>
            </motion.div>
          ) : null}
        </div>

        {/* ─── Overlays ─────────────────────────────────────────── */}
        <ScreenFlashOverlay trigger={game.wordsFound.length} />
        <ComboMilestoneAnnouncement comboLevel={game.comboLevel} />

        {/* Low-moves urgency vignette (≤3 moves) */}
        {game.movesRemaining <= 3 && game.movesRemaining > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-40 transition-opacity duration-300"
            style={{
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(255,0,0,${0.15 + (3 - game.movesRemaining) * 0.1}) 100%)`,
            }}
          />
        )}

        {/* PixiJS game canvas layer */}
        <BlastGameCanvas
          tileStates={game.tileStates}
          letterGrid={game.letterGrid}
          selectedPath={game.selectedPath}
          gridSize={config.gridSize}
          onTileSelect={game.selectTile}
          onSubmitWord={game.submitWord}
          clearedTiles={game.lastClearedTiles}
          comboLevel={game.comboLevel}
          cascadeLevel={game.cascadeLevel}
          scoreFly={game.lastScoreFly}
          waveCleared={game.isWaveCleared}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
        />
      </GameCanvas>
    </div>
  );
}
