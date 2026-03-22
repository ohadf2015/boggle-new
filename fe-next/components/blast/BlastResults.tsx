'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { RotateCcw, Home, Trophy, Zap, Grid3X3, Star } from 'lucide-react';
// canvas-confetti is lazy-loaded (only fires on 3 stars or retrigger)
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import NextStepPrompt from '@/components/results/NextStepPrompt';
import AutoPlayCountdown from '@/components/results/AutoPlayCountdown';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import type { BlastResultsData, BlastDifficulty } from './types';
import { useBlastResultSaver } from './hooks/useBlastResultSaver';
import ResultsWinnerBanner from '@/components/results/ResultsWinnerBanner';
import { StarRating, StatCard, WaveBreakdown } from './BlastResultsComponents';
import { BlastSkillBreakdown } from './BlastSkillBreakdown';
import { GameEmojiShareCard } from '@/components/shared/GameEmojiShareCard';
import TomorrowPreview from '@/components/results/TomorrowPreview';

interface BlastResultsProps {
  results: BlastResultsData;
  difficulty?: BlastDifficulty;
  language?: string;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

/** Animates from 0 to finalValue over ~1.5s using ease-out (fast start, slow end). */
function useCountUp(finalValue: number): number {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.round(finalValue * Math.sqrt(progress)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [finalValue]);
  return display;
}

/**
 * BlastResults - Results screen for Blast Mode.
 * Shows star rating, animated score count-up, confetti on 3 stars, and retrigger button.
 */
export function BlastResults({ results, difficulty = 'medium', language = 'en', onPlayAgain, onBackToHome }: BlastResultsProps) {
  const [autoPlayCancelled, setAutoPlayCancelled] = useState(false);
  const [showTomorrowPreview, setShowTomorrowPreview] = useState(false);

  const handleBackToHome = useCallback(() => {
    setShowTomorrowPreview(true);
  }, []);

  const handleTomorrowDismiss = useCallback(() => {
    setShowTomorrowPreview(false);
    onBackToHome();
  }, [onBackToHome]);

  const { t } = useLanguage();
  const { showInterstitial } = useAdPlacement();
  const { isNewBestScore, isNewBestCombo } = useBlastResultSaver(results, difficulty, language);
  const displayScore = useCountUp(results.finalScore);

  // Show interstitial ad on mount
  useEffect(() => {
    showInterstitial('blast-complete');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fire confetti on mount when 3 stars — only once
  useEffect(() => {
    if (results.stars === 3) {
      import('canvas-confetti').then(({ default: confettiFn }) => {
        confettiFn({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#7FFF00'],
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starLabel = results.stars === 3
    ? (t('blast.stars3'))
    : results.stars === 2
      ? (t('blast.stars2'))
      : (t('blast.stars1'));

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
      {/* Hero Banner */}
      <div className="w-full max-w-sm lg:max-w-md mb-4">
        <ResultsWinnerBanner
          winner={{ username: t('common.you'), score: results.finalScore }}
          isCurrentUserWinner={results.stars >= 2}
          variant={results.stars === 3 ? 'ranking' : results.stars === 2 ? 'highScore' : 'completion'}
          rank={results.stars === 3 ? 1 : results.stars === 2 ? 2 : 3}
          customMessage={starLabel}
          customAnnouncement={`${results.clearPercentage}% ${t('blast.cleared')}`}
          showConfetti={results.stars === 3}
          compact
        />
      </div>

      {/* Star rating */}
      <AdaptiveMotion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
        className="mb-6"
      >
        <StarRating stars={results.stars} />
      </AdaptiveMotion.div>

      {/* Desktop: stats + wave breakdown side by side; mobile: stacked */}
      <div className="w-full max-w-sm lg:max-w-3xl xl:max-w-4xl lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start mb-8">

        {/* Stats grid */}
        <div className="space-y-2 mb-8 lg:mb-0">
          <StatCard
            icon={<Trophy className="w-5 h-5" />}
            label={t('common.score')}
            value={<span data-testid="blast-score-display">{displayScore.toLocaleString()}</span>}
            accentColor="#FFD700"
            delay={0.5}
            index={0}
            isNewBest={isNewBestScore}
          />
          <StatCard
            icon={<Grid3X3 className="w-5 h-5" />}
            label={t('blast.progress')}
            value={`${results.clearPercentage}% (${results.tilesCleared}/${results.totalTiles})`}
            accentColor="#00FFFF"
            delay={0.6}
            index={1}
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label={t('common.words')}
            value={results.wordsFound.length}
            accentColor="#BFFF00"
            delay={0.7}
            index={2}
          />
          {results.bestWord && (
            <StatCard
              icon={<Star className="w-5 h-5" />}
              label={t('results.bestWord')}
              value={results.bestWord.toUpperCase()}
              accentColor="#FF6B35"
              delay={0.8}
              index={3}
            />
          )}
          {results.maxCombo > 0 && (
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              label={t('results.maxCombo')}
              value={`${results.maxCombo}x`}
              accentColor="#FF1493"
              delay={0.9}
              index={4}
              isNewBest={isNewBestCombo}
            />
          )}
          {(results.wavesCompleted ?? 0) > 0 && (
            <StatCard
              icon={<Zap className="w-5 h-5" />}
              label={t('blast.wavesCompleted')}
              value={results.wavesCompleted}
              accentColor="#A855F7"
              delay={1.0}
              index={5}
            />
          )}
        </div>

        {/* Skill breakdown */}
        <div className="space-y-6">
          <BlastSkillBreakdown results={results} t={t} />

          {/* Wave-by-wave breakdown */}
          <WaveBreakdown
            waveResults={results.waveResults ?? []}
            label={t('blast.waveBreakdown')}
          />
        </div>

      </div>{/* end desktop grid */}

      {/* Emoji Share Card */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.9 }}
        className="w-full max-w-sm lg:max-w-md mb-4"
      >
        <GameEmojiShareCard
          data={{
            mode: 'blast',
            score: results.finalScore,
            stars: results.stars,
            clearPercentage: results.clearPercentage,
            wordsFound: results.wordsFound,
            maxCombo: results.maxCombo,
            wavesCompleted: results.wavesCompleted ?? 0,
            waveResults: results.waveResults ?? [],
          }}
          t={t}
          language={language}
        />
      </AdaptiveMotion.div>

      {/* Action buttons */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 1.0 }}
        className="flex flex-col gap-3 w-full max-w-sm lg:max-w-md"
      >
        {!autoPlayCancelled ? (
          <AutoPlayCountdown
            onComplete={onPlayAgain}
            onCancel={() => setAutoPlayCancelled(true)}
            duration={5}
          />
        ) : (
          <>
            <Button
              variant="success"
              size="lg"
              onClick={onPlayAgain}
              className="w-full min-h-[52px] font-black text-lg uppercase border-3 border-neo-black shadow-hard"
            >
              <RotateCcw className="me-2 h-5 w-5" />
              {t('common.playAgain')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleBackToHome}
              className="w-full min-h-[48px] font-bold uppercase border-3 border-neo-black shadow-hard-sm bg-neo-navy text-white hover:shadow-hard hover:-translate-y-0.5 transition-all"
            >
              <Home className="me-2 h-5 w-5" />
              {t('common.home')}
            </Button>
          </>
        )}
      </AdaptiveMotion.div>

      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 1.2 }}
        className="w-full max-w-sm lg:max-w-md"
      >
        <NextStepPrompt
          currentMode="blast"
          onBackToLobby={handleBackToHome}
          variant="mobile"
        />
      </AdaptiveMotion.div>

      <AnimatePresence>
        {showTomorrowPreview && (
          <TomorrowPreview mode="blast" onDismiss={handleTomorrowDismiss} />
        )}
      </AnimatePresence>
    </div>
  );
}
