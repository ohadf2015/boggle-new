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
