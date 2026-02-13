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

/** Star display with fill animation and gold burst */
function StarRating({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{
            scale: i <= stars ? 1 : 0.6,
            rotate: i <= stars ? [0, -5, 5, 0] : 0,
            opacity: i <= stars ? 1 : 0.25,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 15,
            delay: 0.3 + i * 0.2,
            rotate: { delay: 0.5 + i * 0.2, duration: 0.3 },
          }}
          style={{
            filter: i <= stars ? 'drop-shadow(0 0 8px rgba(255,215,0,0.6)) drop-shadow(0 0 16px rgba(255,215,0,0.3))' : 'none',
          }}
        >
          <Star
            className={cn(
              'w-11 h-11 sm:w-14 sm:h-14',
              i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}

/** Alternating rotation angles for playful card tilt */
const CARD_ROTATIONS = [0.8, -0.6, 0.5, -0.8, 0.6, -0.5];

/** Stat card — neo-brutalist with colored accent border and tilt */
function StatCard({
  icon,
  label,
  value,
  accentColor = '#00FFFF',
  delay = 0,
  index = 0,
  isNewBest = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accentColor?: string;
  delay?: number;
  index?: number;
  isNewBest?: boolean;
}) {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: rotation * 2 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'bg-white/5 rounded-neo border-3 border-neo-black/50 shadow-hard-sm',
      )}
      style={{ borderLeftColor: accentColor, borderLeftWidth: '4px' }}
    >
      <div style={{ color: accentColor }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-white text-lg leading-tight font-neo-display">{value}</div>
        <div className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{label}</div>
      </div>
      {isNewBest && (
        <span
          className="px-2 py-0.5 text-[9px] font-black uppercase bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black shadow-hard-sm"
          style={{ transform: 'rotate(-3deg)' }}
        >
          NEW!
        </span>
      )}
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
          value={results.finalScore.toLocaleString()}
          accentColor="#FFD700"
          delay={0.5}
          index={0}
          isNewBest={isNewBestScore}
        />
        <StatCard
          icon={<Grid3X3 className="w-5 h-5" />}
          label={t('blast.progress') || 'Cleared'}
          value={`${results.clearPercentage}% (${results.tilesCleared}/${results.totalTiles})`}
          accentColor="#00FFFF"
          delay={0.6}
          index={1}
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label={t('common.words') || 'Words'}
          value={results.wordsFound.length}
          accentColor="#BFFF00"
          delay={0.7}
          index={2}
        />
        {results.bestWord && (
          <StatCard
            icon={<Star className="w-5 h-5" />}
            label={t('results.bestWord') || 'Best Word'}
            value={results.bestWord.toUpperCase()}
            accentColor="#FF6B35"
            delay={0.8}
            index={3}
          />
        )}
        {results.maxCombo > 0 && (
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label={t('results.maxCombo') || 'Max Combo'}
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
            label={t('blast.wavesCompleted') || 'Waves'}
            value={results.wavesCompleted}
            accentColor="#A855F7"
            delay={1.0}
            index={5}
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
          <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 text-center">
            {t('blast.waveBreakdown') || 'Wave Breakdown'}
          </div>
          <div className="space-y-1.5 rounded-neo border-3 border-neo-black/50 bg-white/5 p-2 shadow-hard-sm">
            {results.waveResults.map((wr, idx) => (
              <motion.div
                key={wr.waveNumber}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + idx * 0.08 }}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-neo overflow-hidden',
                  idx % 2 === 0 ? 'bg-white/5' : 'bg-white/[0.02]',
                )}
                style={{
                  borderLeft: '3px solid',
                  borderLeftColor: idx === 0 ? '#A855F7' : idx === 1 ? '#06B6D4' : '#6366F1',
                }}
              >
                {/* Clear % background bar */}
                <div
                  className="absolute inset-y-0 left-0 opacity-10 rounded-neo"
                  style={{
                    width: `${wr.clearPercentage}%`,
                    background: idx === 0 ? '#A855F7' : idx === 1 ? '#06B6D4' : '#6366F1',
                  }}
                />
                <span className="font-black text-xs text-fuchsia-300 relative z-10 shrink-0">
                  W{wr.waveNumber}
                </span>
                <span className="font-black text-sm text-white tabular-nums relative z-10">
                  {wr.score}
                </span>
                <span className="text-[10px] text-white/40 relative z-10">pts</span>
                <div className="flex-1" />
                <span className="text-[10px] font-bold text-white/50 tabular-nums relative z-10">
                  {wr.wordsFound}w · {wr.clearPercentage}%
                </span>
              </motion.div>
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
