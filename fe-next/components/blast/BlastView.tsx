'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasRealAdProvider } from '@/hooks/useHasRealAdProvider';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { BlastGame } from './BlastGame';
import { BlastResultsSummary } from './BlastResultsSummary';
import { BlastPregameBuffModal, type BlastPregameBuff } from './BlastPregameBuffModal';
import { useBlastCheckpoint } from './hooks/useBlastCheckpoint';
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
  const hasRealAdProvider = useHasRealAdProvider();

  const [phase, setPhase] = useState<BlastPhase>('ready');
  const [results, setResults] = useState<BlastResultsData | null>(null);
  const gameKeyRef = useRef(0);

  // Wave tracking
  const checkpoint = useBlastCheckpoint();
  const [currentWave, setCurrentWave] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [allWordsFound, setAllWordsFound] = useState<string[]>([]);
  const [waveHistory, setWaveHistory] = useState<WaveResult[]>([]);
  const [lastWaveStats, setLastWaveStats] = useState({ score: 0, words: 0, clearPct: 0 });

  // Pre-game buff (rewarded-ad picker, single-use per run)
  const [pregameBuff, setPregameBuff] = useState<BlastPregameBuff | null>(null);
  const [buffModalOpen, setBuffModalOpen] = useState(false);

  // Apply wave-specific overrides.
  // `config` is memoized so BlastGame doesn't see a new object reference on
  // every BlastView render (e.g. phase flips, score ticks). A fresh config
  // prop would invalidate every downstream memo + effect dep that touches it.
  const waveConfig = getWaveConfig(currentWave);
  const config = useMemo(
    () => ({
      ...resolveBlastConfig((language as Language) || 'en', 'medium'),
      specialTileChance: waveConfig.specialTileChance,
      customDistribution: getWaveDistribution(waveConfig),
      // Always shrink — cleared cells stay empty so full board clear is achievable
      boardClearMode: 'shrink' as const,
    }),
    [language, waveConfig],
  );

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
    checkpoint.recordWaveReached(currentWave);
    setPhase('waveTransition');
  }, [currentWave, checkpoint]);

  /** Game ended */
  const handleGameEnd = useCallback((resultsData: BlastResultsData) => {
    // Persist progress even on game-over so the player can resume from the
    // highest wave reached (not just the last wave *completed*).
    if (currentWave > 1) {
      checkpoint.recordWaveReached(currentWave - 1);
    }

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

    // Persist to DB and merge the server's enrichment (percentile, previousBest)
    // back into results state so the rank card and PB delta render.
    saveBlastResult(mergedResults, config.difficulty ?? 'medium', language).then(
      (patch) => {
        if (!patch) return;
        setResults((prev) => (prev ? { ...prev, ...patch } : prev));
      },
    );
  }, [totalScore, allWordsFound, waveHistory, currentWave, config.difficulty, language, checkpoint]);

  /** Advance to next wave */
  const handleWaveAdvance = useCallback(() => {
    setCurrentWave(prev => prev + 1);
    gameKeyRef.current += 1;
    setPhase('playing');
  }, []);

  const handleStart = useCallback(() => {
    setCurrentWave(1);
    setPhase('playing');
  }, []);

  const handleResume = useCallback(() => {
    setCurrentWave(checkpoint.resumeFromWave);
    setPhase('playing');
  }, [checkpoint.resumeFromWave]);

  const handlePlayAgain = useCallback(() => {
    setResults(null);
    setCurrentWave(1);
    setTotalScore(0);
    setAllWordsFound([]);
    setWaveHistory([]);
    setPregameBuff(null);
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
            {t('blast.ready.title')}
          </h1>
          <p className="text-sm text-white/60 text-center max-w-xs">
            {t('blast.ready.subtitle')}
          </p>
          {checkpoint.checkpoint && checkpoint.resumeFromWave > 1 ? (
            <>
              <Button
                data-testid="resume-button"
                size="lg"
                onClick={handleResume}
                className="min-h-[56px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
              >
                {t('blast.ready.resume', { wave: checkpoint.resumeFromWave })}
              </Button>
              <Button
                data-testid="play-button"
                size="sm"
                variant="ghost"
                onClick={handleStart}
                className="min-h-[40px] w-full max-w-xs font-bold text-sm uppercase text-white/70 hover:text-white underline underline-offset-4 decoration-white/40 hover:bg-transparent"
              >
                {t('blast.ready.play')}
              </Button>
            </>
          ) : (
            <Button
              data-testid="play-button"
              size="lg"
              onClick={handleStart}
              className="min-h-[56px] w-full max-w-xs font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-lime text-neo-black hover:bg-neo-lime/90"
            >
              {t('blast.ready.play')}
            </Button>
          )}
          {pregameBuff ? (
            <div
              data-testid="blast-claimed-buff-chip"
              className="rounded-neo border-neo-thick border-black bg-neo-cyan px-4 py-2 font-neo-display text-xs font-black uppercase text-neo-navy shadow-hard"
            >
              {t(`blast.pregameBuff.${pregameBuff}`)}
            </div>
          ) : hasRealAdProvider ? (
            <button
              data-testid="blast-claim-boost-button"
              onClick={() => setBuffModalOpen(true)}
              className="rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-2 font-neo-display text-xs font-black uppercase text-neo-navy shadow-hard hover:bg-neo-pink/90"
            >
              {t('blast.pregameBuff.claim')}
            </button>
          ) : null}
        </div>
      )}

      <BlastPregameBuffModal
        isOpen={buffModalOpen}
        onPick={(b) => { setPregameBuff(b); setBuffModalOpen(false); }}
        onSkip={() => setBuffModalOpen(false)}
        t={t}
      />

      {phase === 'playing' && (
        <BlastGame
          key={`game-${gameKeyRef.current}`}
          config={config}
          waveNumber={currentWave}
          waveConfig={waveConfig}
          cumulativeScore={totalScore}
          initialBuff={pregameBuff}
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
                  key={`star-${i}`}
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
              <p className="text-lg font-bold tabular-nums">{lastWaveStats.score} {t('common.points')}</p>
              <p className="text-sm">{lastWaveStats.words} {t('blast.wordsFound')} · {Math.round(lastWaveStats.clearPct)}% {t('blast.cleared')}</p>
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
                {t('blast.nextWave', { wave: currentWave + 1 })}
              </Button>
            </AdaptiveMotion.div>
          </div>
        );
      })()}

      {phase === 'results' && results && (
        <BlastResultsSummary
          results={results}
          t={t}
          onPlayAgain={handlePlayAgain}
          onQuit={handleQuit}
        />
      )}
    </div>
  );
}

export default BlastView;
