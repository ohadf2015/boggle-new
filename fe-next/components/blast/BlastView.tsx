'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BlastGame } from './BlastGame';
import { getWaveConfig, getWaveDistribution } from './utils/blastWaveConfig';
import { calculateEarnedStars } from './utils/blastStarCalculator';
import { resolveBlastConfig, type BlastPhase, type BlastResultsData, type WaveResult } from './types';
import type { Language } from '@/shared/types/game';
import { Button } from '@/components/ui/button';
import { saveBlastResult } from './utils/saveBlastResult';

/**
 * BlastView — Phase router for Blast Mode.
 * Phases: ready → playing → waveTransition → results
 */
export function BlastView() {
  const router = useRouter();
  const { language, t } = useLanguage();

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

  // Apply wave-specific overrides
  const waveConfig = getWaveConfig(currentWave);
  const config = {
    ...baseConfig,
    specialTileChance: waveConfig.specialTileChance,
    customDistribution: getWaveDistribution(waveConfig),
    // Always shrink — cleared cells stay empty so full board clear is achievable
    boardClearMode: 'shrink' as const,
  };

  /** Wave completed — transition to next wave */
  const handleWaveComplete = useCallback((waveScore: number, waveWords: string[], clearPct: number) => {
    const waveResult: WaveResult = {
      waveNumber: currentWave,
      score: waveScore,
      wordsFound: waveWords.length,
      clearPercentage: clearPct,
    };
    setTotalScore(prev => prev + waveScore);
    setAllWordsFound(prev => [...prev, ...waveWords]);
    setWaveHistory(prev => [...prev, waveResult]);
    setLastWaveStats({ score: waveScore, words: waveWords.length, clearPct });
    setPhase('waveTransition');
  }, [currentWave]);

  /** Game ended */
  const handleGameEnd = useCallback((resultsData: BlastResultsData) => {
    const mergedResults: BlastResultsData = {
      ...resultsData,
      finalScore: totalScore + resultsData.finalScore,
      wordsFound: [...allWordsFound, ...resultsData.wordsFound],
      wavesCompleted: waveHistory.length,
      waveResults: [
        ...waveHistory,
        {
          waveNumber: currentWave,
          score: resultsData.finalScore,
          wordsFound: resultsData.wordsFound.length,
          clearPercentage: resultsData.clearPercentage,
        },
      ],
    };
    setResults(mergedResults);
    setPhase('results');

    // Persist to DB (fire-and-forget)
    saveBlastResult(mergedResults, config.difficulty ?? 'medium', language);
  }, [totalScore, allWordsFound, waveHistory, currentWave, config.difficulty, language]);

  /** Advance to next wave */
  const handleWaveAdvance = useCallback(() => {
    setCurrentWave(prev => prev + 1);
    gameKeyRef.current += 1;
    setPhase('playing');
  }, []);

  const handleStart = useCallback(() => {
    setPhase('playing');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setResults(null);
    setCurrentWave(1);
    setTotalScore(0);
    setAllWordsFound([]);
    setWaveHistory([]);
    gameKeyRef.current += 1;
    setPhase('ready');
  }, []);

  const handleQuit = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-neo-navy relative">
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <h1 className="text-4xl font-black uppercase text-white font-neo-display">
            {t('blast.ready.title') || 'BLAST MODE'}
          </h1>
          <p className="text-sm text-white/60 text-center max-w-xs">
            {t('blast.ready.subtitle') || 'Clear the board, chain combos, survive the waves'}
          </p>
          <Button
            data-testid="play-button"
            size="lg"
            onClick={handleStart}
            className="min-h-[56px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
          >
            {t('blast.ready.play') || 'PLAY'}
          </Button>
        </div>
      )}

      {phase === 'playing' && (
        <BlastGame
          key={`game-${gameKeyRef.current}`}
          config={config}
          waveNumber={currentWave}
          waveConfig={waveConfig}
          cumulativeScore={totalScore}
          onWaveComplete={handleWaveComplete}
          onGameEnd={handleGameEnd}
          onQuit={handleQuit}
        />
      )}

      {phase === 'waveTransition' && (() => {
        const stars = calculateEarnedStars(
          Math.round(lastWaveStats.clearPct * config.gridSize * config.gridSize / 100),
          config.gridSize * config.gridSize,
        );
        return (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
            <AdaptiveMotion.h2
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-3xl font-black uppercase text-neo-cyan font-neo-display"
            >
              {t('blast.waveComplete', { wave: String(currentWave) }) || `Wave ${currentWave} Complete!`}
            </AdaptiveMotion.h2>

            {/* Stars */}
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <AdaptiveMotion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 + i * 0.2 }}
                >
                  <Star className={`h-10 w-10 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-white/20 fill-white/10'}`} />
                </AdaptiveMotion.div>
              ))}
            </div>

            <AdaptiveMotion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/80 text-center space-y-1"
            >
              <p className="text-lg font-bold tabular-nums">{lastWaveStats.score} {t('common.points') || 'pts'}</p>
              <p className="text-sm">{lastWaveStats.words} {t('blast.wordsFound') || 'words'} · {Math.round(lastWaveStats.clearPct)}% {t('blast.cleared') || 'cleared'}</p>
            </AdaptiveMotion.div>

            <AdaptiveMotion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="w-full max-w-xs"
            >
              <Button
                data-testid="next-wave-button"
                size="lg"
                onClick={handleWaveAdvance}
                className="min-h-[56px] w-full font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-cyan text-neo-black hover:bg-neo-cyan/90"
              >
                {t('blast.nextWave', { wave: currentWave + 1 }) || 'NEXT WAVE'}
              </Button>
            </AdaptiveMotion.div>
          </div>
        );
      })()}

      {phase === 'results' && results && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <h2 className="text-3xl font-black uppercase text-neo-pink font-neo-display">
            {t('blast.gameOver') || 'GAME OVER'}
          </h2>
          <div className="text-white text-center space-y-2">
            <p className="text-4xl font-black">{results.finalScore}</p>
            <p className="text-sm text-white/60">
              {results.wordsFound.length} {t('blast.wordsFound') || 'words'} &middot; {results.wavesCompleted} {t('blast.waves') || 'waves'}
            </p>
            {results.bestWord && (
              <p className="text-sm text-neo-lime font-bold uppercase">{t('blast.bestWord') || 'Best'}: {results.bestWord}</p>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button
              data-testid="play-again-button"
              size="lg"
              onClick={handlePlayAgain}
              className="min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
            >
              {t('blast.playAgain') || 'PLAY AGAIN'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleQuit}
              className="min-h-[48px] font-bold uppercase border-3 border-neo-lime/50 text-neo-lime bg-neo-navy/80 hover:bg-neo-navy"
            >
              {t('common.home') || 'HOME'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlastView;
