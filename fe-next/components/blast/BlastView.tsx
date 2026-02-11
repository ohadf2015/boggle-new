'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useMusic } from '@/contexts/MusicContext';
import { PlayfulBackground } from '@/components/ui/PlayfulBackground';
import { BlastGame } from './BlastGame';
import { BlastResults } from './BlastResults';
import { resolveBlastConfig, type BlastPhase, type BlastResultsData } from './types';
import type { Language } from '@/shared/types/game';

/**
 * BlastView - Page orchestrator for Blast Mode.
 * Manages phase transitions between playing and results.
 */
const BlastView: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { unlockAudio } = useMusic();
  const setIsInGame = useHideNavigation();

  const [phase, setPhase] = useState<BlastPhase>('playing');
  const [results, setResults] = useState<BlastResultsData | null>(null);
  // Monotonically increasing key to force remount on play again
  const gameKeyRef = useRef(0);

  const config = resolveBlastConfig((language as Language) || 'en', 'medium');

  // Hide bottom navigation during gameplay
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Unlock audio on mount (user navigated here intentionally)
  useEffect(() => {
    unlockAudio();
  }, [unlockAudio]);

  const handleGameEnd = useCallback((resultsData: BlastResultsData) => {
    setResults(resultsData);
    setPhase('results');
  }, []);

  const handlePlayAgain = useCallback(() => {
    setResults(null);
    gameKeyRef.current += 1;
    setPhase('playing');
  }, []);

  const handleBackToHome = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

  const handleQuit = useCallback(() => {
    router.push(`/${language}/`);
  }, [router, language]);

  return (
    <div className="flex flex-col min-h-full bg-neo-navy relative">
      <PlayfulBackground intensity="low" colorScheme="game" />

      {phase === 'playing' && (
        <BlastGame
          key={`game-${gameKeyRef.current}`}
          config={config}
          onGameEnd={handleGameEnd}
          onQuit={handleQuit}
        />
      )}

      {phase === 'results' && results && (
        <BlastResults
          results={results}
          difficulty={config.difficulty}
          language={config.language}
          onPlayAgain={handlePlayAgain}
          onBackToHome={handleBackToHome}
        />
      )}
    </div>
  );
};

export default BlastView;
