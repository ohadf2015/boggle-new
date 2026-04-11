'use client';

import React, { useEffect, useState } from 'react';
import { motion, animate as fmAnimate } from 'framer-motion';
import { Star, ArrowRight, Flame, Crown, Zap } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import DailyLeaderboard from './DailyLeaderboard';
import type { Language } from '@/types';
import type { WordWheelGameResult } from './WordWheelGame';

interface WordWheelResultsProps {
  result: WordWheelGameResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  hasPlayedWordHunt: boolean;
  currentPlayerId?: string | null;
  currentGuestFingerprint?: string | null;
}

function getResultTier(score: number): {
  key: string; color: string; bg: string; icon: React.ReactNode; glowColor: string;
} {
  if (score >= 80) return {
    key: 'wordWheel.excellent', color: 'text-neo-lime', bg: 'bg-neo-lime/10',
    icon: <Crown className="w-8 h-8" />, glowColor: 'shadow-[0_0_30px_rgba(191,255,0,0.4)]',
  };
  if (score >= 50) return {
    key: 'wordWheel.great', color: 'text-neo-cyan', bg: 'bg-neo-cyan/10',
    icon: <Flame className="w-8 h-8" />, glowColor: 'shadow-[0_0_25px_rgba(0,255,255,0.3)]',
  };
  if (score >= 25) return {
    key: 'wordWheel.good', color: 'text-neo-purple', bg: 'bg-neo-purple/10',
    icon: <Zap className="w-8 h-8" />, glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
  };
  return {
    key: 'wordWheel.tryAgain', color: 'text-neo-pink', bg: 'bg-neo-pink/10',
    icon: <Star className="w-8 h-8" />, glowColor: '',
  };
}

// Pre-generated confetti configs (pure — no Math.random in render)
interface ConfettiConfig {
  left: number; size: number; heightRatio: number;
  duration: number; rotation: number; xDrift: number; isRound: boolean;
}

function generateConfettiConfigs(count: number): ConfettiConfig[] {
  const configs: ConfettiConfig[] = [];
  // Simple seeded-ish spread using golden ratio
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const phi = (1 + Math.sqrt(5)) / 2;
    const pseudo = ((i * phi) % 1);
    const pseudo2 = ((i * phi * phi) % 1);
    const pseudo3 = (((i + 7) * phi) % 1);
    configs.push({
      left: t * 100,
      size: 6 + pseudo * 8,
      heightRatio: 0.6 + pseudo2 * 0.8,
      duration: 2 + pseudo * 2,
      rotation: pseudo2 * 720 - 360,
      xDrift: (pseudo3 - 0.5) * 200,
      isRound: pseudo > 0.5,
    });
  }
  return configs;
}

const CONFETTI_CONFIGS = generateConfettiConfigs(40);

function ConfettiParticle({ delay, color, config }: { delay: number; color: string; config: ConfettiConfig }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${config.left}%`,
        top: -10,
        width: config.size,
        height: config.size * config.heightRatio,
        backgroundColor: color,
        borderRadius: config.isRound ? '50%' : '2px',
      }}
      initial={{ y: -20, opacity: 1, rotate: 0 }}
      animate={{
        y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800,
        opacity: [1, 1, 0.8, 0],
        rotate: config.rotation,
        x: config.xDrift,
      }}
      transition={{ duration: config.duration, delay, ease: 'easeIn' }}
    />
  );
}

const CONFETTI_COLORS = ['#BFFF00', '#00FFFF', '#FF1493', '#8B5CF6', '#FFD700', '#FF3366', '#44FF44'];

const WordWheelResults: React.FC<WordWheelResultsProps> = ({
  result, puzzleNumber, puzzleDate, language: gameLang, hasPlayedWordHunt,
  currentPlayerId, currentGuestFingerprint,
}) => {
  const { t, language, dir } = useLanguage();
  const tier = getResultTier(result.score);
  const isRTL = dir === 'rtl';
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score counting up with natural deceleration
  useEffect(() => {
    if (result.score === 0) return;
    const controls = fmAnimate(0, result.score, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setAnimatedScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [result.score]);

  // Trigger confetti for good scores
  useEffect(() => {
    if (result.score >= 25) {
      const timer = setTimeout(() => setShowConfetti(true), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [result.score]);

  const confettiCount = result.score >= 80 ? 40 : result.score >= 50 ? 25 : 15;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-5 w-full max-w-md mx-auto px-4 py-8 overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* DOM Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {CONFETTI_CONFIGS.slice(0, confettiCount).map((config, i) => (
            <ConfettiParticle
              key={i}
              delay={i * 0.08}
              color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
              config={config}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <motion.div
        className="text-center z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h2 className="font-neo-display font-black text-2xl text-neo-white mb-1">
          {t('wordWheel.results.title')}
        </h2>
        <span className="text-neo-cream/60 text-sm">#{puzzleNumber}</span>
      </motion.div>

      {/* Score circle */}
      <motion.div
        className={cn(
          'relative flex flex-col items-center justify-center w-36 h-36 rounded-full',
          'border-3 border-neo-black shadow-hard-lg z-10',
          tier.bg, tier.glowColor,
        )}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <motion.div
          className={tier.color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          {tier.icon}
        </motion.div>
        <span className={cn('font-neo-display font-black text-4xl', tier.color)}>
          {animatedScore}
        </span>
        <span className="text-neo-cream/50 text-xs">{t('wordWheel.scoreLabel')}</span>
      </motion.div>

      {/* Tier message */}
      <motion.p
        className={cn('font-neo-display font-bold text-xl z-10', tier.color)}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        {t(tier.key)}
      </motion.p>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-2 gap-3 w-full z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex flex-col items-center p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard">
          <span className="text-neo-lime font-black text-xl">{result.wordsFound.length}</span>
          <span className="text-neo-cream/60 text-xs">{t('wordWheel.results.wordsFound')}</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard">
          <span className="text-neo-cyan font-black text-xl">
            {Math.floor(result.timeSeconds / 60)}:{(result.timeSeconds % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-neo-cream/60 text-xs">{t('wordWheel.results.time')}</span>
        </div>
      </motion.div>

      {/* Words found list */}
      {result.wordsFound.length > 0 && (
        <motion.div
          className="w-full z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-neo-cream/70 text-xs font-bold uppercase mb-2">
            {t('wordWheel.foundWords')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.wordsFound.map((word, i) => (
              <motion.span
                key={word}
                className="px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-cream text-xs font-semibold shadow-hard-xs"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.7 + i * 0.05 }}
              >
                {word} <span className="text-neo-lime">+{scoreWord(word)}</span>
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Leaderboard */}
      <motion.div
        className="w-full z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <DailyLeaderboard
          puzzleDate={puzzleDate}
          language={gameLang}
          currentPlayerId={currentPlayerId}
          currentGuestFingerprint={currentGuestFingerprint}
          gameType="wordWheel"
          t={t}
          maxVisible={5}
          compact
        />
      </motion.div>

      {/* CTA */}
      {!hasPlayedWordHunt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="z-10"
        >
          <Link
            href={`/${language}/daily/word-hunt`}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black',
              'bg-gradient-to-r from-neo-lime to-neo-cyan text-neo-black font-neo-display font-black',
              'shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)] transition-all',
              isRTL ? 'active:-translate-x-px active:translate-y-px' : 'active:translate-x-px active:translate-y-px',
              'active:shadow-hard-pressed',
            )}
          >
            <Star className="w-5 h-5" />
            {t('wordWheel.results.playWordHunt')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
};

export default WordWheelResults;
