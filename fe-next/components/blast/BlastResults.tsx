'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Home, Trophy, Zap, Grid3X3, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastResultsData, BlastDifficulty } from './types';
import { useBlastResultSaver } from './hooks/useBlastResultSaver';
import { StarRating, StatCard, WaveBreakdown } from './BlastResultsComponents';

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
  const { t } = useLanguage();
  const { isNewBestScore, isNewBestCombo } = useBlastResultSaver(results, difficulty, language);
  const displayScore = useCountUp(results.finalScore);

  // Auto-fire confetti on mount when 3 stars — only once
  useEffect(() => {
    if (results.stars === 3) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FFE135', '#FF6B35', '#FF1493', '#00FFFF', '#7FFF00'],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starLabel = results.stars === 3
    ? (t('blast.stars3'))
    : results.stars === 2
      ? (t('blast.stars2'))
      : (t('blast.stars1'));

  const handleRetrigger = () => {
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative z-10">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4"
      >
        <h1 className="text-3xl sm:text-4xl font-black uppercase text-white mb-1">
          {t('blast.title')}
        </h1>
        <p className="text-lg font-bold text-neo-orange">{starLabel}</p>
      </motion.div>

      {/* Star rating + confetti retrigger button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.2 }}
        className="mb-6 flex items-center gap-3"
      >
        <StarRating stars={results.stars} />
        {results.stars === 3 && (
          <button
            data-testid="confetti-retrigger"
            onClick={handleRetrigger}
            className="text-2xl hover:scale-125 transition-transform duration-150 active:scale-90"
            aria-label={t('blast.celebrateAgain')}
          >
            🎉
          </button>
        )}
      </motion.div>

      {/* Stats grid */}
      <div className="w-full max-w-sm space-y-2 mb-8">
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

      {/* Wave-by-wave breakdown */}
      <WaveBreakdown
        waveResults={results.waveResults ?? []}
        label={t('blast.waveBreakdown')}
      />

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 1.0 }}
        className="flex flex-col gap-3 w-full max-w-sm"
      >
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
          onClick={onBackToHome}
          className="w-full min-h-[48px] font-bold uppercase"
        >
          <Home className="me-2 h-5 w-5" />
          {t('common.home')}
        </Button>
      </motion.div>
    </div>
  );
}
