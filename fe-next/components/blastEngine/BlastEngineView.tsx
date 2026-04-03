// ─── Blast Engine View ────────────────────────────────────────────────
// Top-level component for the new PixiJS-powered Blast mode.
// Wraps GameCanvas with HUD overlay and game state management.
// Phase router: ready → playing → waveTransition → results.

'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Star, Zap, RotateCcw, ArrowLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GameCanvas, type GameCanvasConfig } from '@/lib/gameEngine';
import { useBlastGameLoop } from './hooks/useBlastGameLoop';
import { useBlastEngineSounds } from './hooks/useBlastEngineSounds';
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
      const viewH = typeof window !== 'undefined' ? window.innerHeight - 16 - BORDER_TOTAL : 800;
      const idealH = w + 140;
      const h = Math.min(viewH, idealH);
      setSize({ width: w, height: Math.round(h) });
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
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
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4 gap-6"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="text-center">
            <h1
              className="text-5xl font-neo-display font-black mb-3"
              style={{
                background: 'linear-gradient(180deg, #FFE566 0%, #FFD700 50%, #B8860B 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))',
              }}
            >
              <Zap className="inline w-10 h-10 mr-2 text-neo-cyan" style={{ WebkitTextFillColor: 'initial' }} />
              {t('blast.ready.title') || 'BLAST MODE'}
            </h1>
            <p className="text-white/50 font-neo-body text-lg">
              {t('blast.ready.subtitle') || 'Chain words. Clear tiles. Survive waves.'}
            </p>
          </div>
        </motion.div>

        <div
          className="rounded-2xl p-5 max-w-xs text-sm text-white/70 space-y-2.5 font-neo-body"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <p className="font-bold text-neo-cyan text-base">{t('blast.help') || 'How to Play'}</p>
          <p>↔ {t('blast.ready.rule1') || 'Swap adjacent tiles to form words'}</p>
          <p>→↓ {t('blast.ready.rule2') || 'Words detected horizontally & vertically (3+ letters)'}</p>
          <p>💣⚡🔷 {t('blast.ready.rule3') || 'Special tiles trigger explosive chain reactions'}</p>
          <p>📐 {t('blast.ready.rule4') || 'Clear 50%+ of tiles to advance to the next wave'}</p>
        </div>

        <Button
          onClick={handleStart}
          className="border-3 border-neo-black font-neo-display text-xl px-10 py-5 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 16px rgba(0,255,255,0.3)',
            color: '#1a1a2e',
          }}
        >
          {t('blast.ready.play') || 'START'}
        </Button>

        <Button
          onClick={handleBackToMenu}
          variant="ghost"
          className="text-white/30 hover:text-white/50"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {t('common.back') || 'Back'}
        </Button>
      </div>
    );
  }

  if (phase === 'waveTransition') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4 gap-6"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
      >
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150 }}
        >
          <div
            className="text-center p-8 rounded-2xl max-w-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,215,0,0.15)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          >
            <h2
              className="text-2xl font-neo-display font-black mb-5"
              style={{
                background: 'linear-gradient(180deg, #FFE566, #FFD700, #B8860B)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {t('blast.waveComplete', { wave: currentWave }) || `Wave ${currentWave} Complete!`}
            </h2>
            <div className="flex gap-6 text-white mb-5" dir="ltr">
              <div className="text-center">
                <div className="text-3xl font-black tabular-nums">{lastWaveStats.score}</div>
                <div className="text-xs text-white/40">{t('blast.score') || t('common.score') || 'Score'}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black tabular-nums">{lastWaveStats.words}</div>
                <div className="text-xs text-white/40">{t('blast.words') || 'Words'}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-black tabular-nums">{Math.round(lastWaveStats.clearPct)}%</div>
                <div className="text-xs text-white/40">{t('blast.cleared') || 'Cleared'}</div>
              </div>
            </div>
            <div className="flex gap-1.5 justify-center mb-4" dir="ltr">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-9 h-9 ${
                    s <= calculateEarnedStars(game.tilesCleared, game.totalTiles)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-white/10'
                  }`}
                  style={s <= calculateEarnedStars(game.tilesCleared, game.totalTiles) ? { filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.5))' } : undefined}
                />
              ))}
            </div>
          </div>
        </motion.div>

        <Button
          onClick={handleNextWave}
          className="border-3 border-neo-black font-neo-display text-lg px-8 py-4 rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 16px rgba(0,255,255,0.3)',
            color: '#1a1a2e',
          }}
        >
          {t('blast.nextWave', { wave: currentWave + 1 }) || `Wave ${currentWave + 1}`}
          <ChevronRight className="w-5 h-5 ms-1" />
        </Button>
      </div>
    );
  }

  if (phase === 'results') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen p-4 gap-6"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #2d1b4e 0%, #0f0c29 70%, #080618 100%)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div
            className="text-center p-8 rounded-2xl max-w-sm"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            }}
          >
            <h2 className="text-2xl font-neo-display font-black text-white/80 mb-2">
              {t('blast.gameOver') || 'Game Over'}
            </h2>
            <div
              className="text-5xl font-black mb-5"
              style={{
                background: 'linear-gradient(180deg, #FFE566, #FFD700, #B8860B)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              }}
            >
              {results?.finalScore ?? 0}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-white/50 mb-4">
              <div>
                <span className="block text-xl font-black text-white tabular-nums">
                  {results?.wavesCompleted ?? 0}
                </span>
                {t('blast.waves') || 'Waves'}
              </div>
              <div>
                <span className="block text-xl font-black text-white tabular-nums">
                  {results?.wordsFound.length ?? 0}
                </span>
                {t('blast.words') || 'Words'}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-3">
          <Button
            onClick={handleStart}
            className="border-3 border-neo-black font-neo-display rounded-xl"
            style={{
              background: 'linear-gradient(180deg, #66FFFF 0%, #00FFFF 50%, #00B3B3 100%)',
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 0 #008888, 0 6px 12px rgba(0,255,255,0.25)',
              color: '#1a1a2e',
            }}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            {t('blast.playAgain') || 'Play Again'}
          </Button>
          <Button
            onClick={handleBackToMenu}
            variant="ghost"
            className="text-white/30 hover:text-white/50 font-neo-display"
          >
            {t('common.back') || 'Menu'}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Playing phase — PixiJS canvas + HUD overlay ────────────────

  // Clear progress percentage for HUD
  const clearPct = game.totalTiles > 0 ? Math.round((game.tilesCleared / game.totalTiles) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-start min-h-screen w-full px-2 py-2"
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
          className="pointer-events-auto flex items-center justify-between gap-2 px-3 py-2"
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
