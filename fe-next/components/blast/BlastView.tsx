'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useMusic } from '@/contexts/MusicContext';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { BlastGame } from './BlastGame';
import { BlastResults } from './BlastResults';
import { BlastWaveTransition } from './BlastWaveTransition';
import { BlastWaveIntro } from './BlastWaveIntro';
import { getWaveConfig, getWaveDistribution, getWaveObjectives } from './utils/blastWaveConfig';
import { resolveBlastConfig, type BlastPhase, type BlastResultsData, type WaveResult } from './types';
import type { Language } from '@/shared/types/game';
import { BlastReadyScreen } from './BlastReadyScreen';
import { useBlastComboDiscovery } from './hooks/useBlastComboDiscovery';

/**
 * BlastView - Page orchestrator for Blast Mode.
 * Manages wave-based phase transitions: playing → waveTransition → playing → ... → results.
 */
const BlastView: React.FC = () => {
  const router = useRouter();
  const { language, t } = useLanguage();
  const { unlockAudio } = useMusic();
  const setIsInGame = useHideNavigation();

  const [phase, setPhase] = useState<BlastPhase>('ready');
  const [results, setResults] = useState<BlastResultsData | null>(null);
  // Monotonically increasing key to force remount on play again / wave advance
  const gameKeyRef = useRef(0);

  // Wave tracking
  const [currentWave, setCurrentWave] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [allWordsFound, setAllWordsFound] = useState<string[]>([]);
  const [waveHistory, setWaveHistory] = useState<WaveResult[]>([]);
  const [lastWaveStats, setLastWaveStats] = useState({ score: 0, words: 0, clearPct: 0 });

  const { discoveredCombos, pendingDiscovery, onComboDetected, acknowledgeDiscovery } = useBlastComboDiscovery();

  const baseConfig = resolveBlastConfig((language as Language) || 'en', 'medium');

  // Apply wave-specific overrides to config
  const waveConfig = getWaveConfig(currentWave);
  const config = {
    ...baseConfig,
    specialTileChance: waveConfig.specialTileChance,
    customDistribution: getWaveDistribution(waveConfig),
  };

  // Hide bottom navigation during gameplay
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Unlock audio on mount
  useEffect(() => {
    unlockAudio();
  }, [unlockAudio]);

  /** Wave completed successfully — transition to next wave */
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

  /** Game ended (dead end, give up, or failed threshold) */
  const handleGameEnd = useCallback((resultsData: BlastResultsData) => {
    // Merge wave-level cumulative data into final results
    const mergedResults: BlastResultsData = {
      ...resultsData,
      finalScore: totalScore + resultsData.finalScore,
      wordsFound: [...allWordsFound, ...resultsData.wordsFound],
      wavesCompleted: waveHistory.length,
      waveResults: [
        ...waveHistory,
        // Add current (incomplete) wave
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
  }, [totalScore, allWordsFound, waveHistory, currentWave]);

  /** Advance to next wave after transition */
  const handleWaveAdvance = useCallback(() => {
    setCurrentWave(prev => prev + 1);
    gameKeyRef.current += 1;
    setPhase('waveIntro');
  }, []);

  const handleStart = useCallback(() => {
    setPhase('waveIntro');
  }, []);

  /** Wave intro dismissed — start playing */
  const handleWaveIntroReady = useCallback(() => {
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

  const handleBackToHome = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

  const handleQuit = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

  return (
    <div className="flex flex-col h-full bg-neo-navy relative">
      <PlayfulBackground intensity="low" colorScheme="game" />

      {phase === 'ready' && (
        <BlastReadyScreen onStart={handleStart} discoveredCombos={discoveredCombos} />
      )}

      {phase === 'waveIntro' && (
        <BlastWaveIntro
          waveNumber={currentWave}
          objectives={getWaveObjectives(currentWave)}
          movesAllowed={waveConfig.movesAllowed}
          onReady={handleWaveIntroReady}
          t={(key: string) => t(key) || undefined}
        />
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
          onComboDetected={onComboDetected}
          pendingDiscovery={pendingDiscovery}
          acknowledgeDiscovery={acknowledgeDiscovery}
        />
      )}

      {phase === 'waveTransition' && (
        <BlastWaveTransition
          waveNumber={currentWave + 1}
          previousWaveScore={lastWaveStats.score}
          previousWaveWords={lastWaveStats.words}
          previousClearPercentage={lastWaveStats.clearPct}
          onAdvance={handleWaveAdvance}
        />
      )}

      {phase === 'results' && results && (
        <BlastResults
          results={results}
          difficulty={baseConfig.difficulty}
          language={baseConfig.language}
          onPlayAgain={handlePlayAgain}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
};

export default BlastView;
