'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Share2,
  Trophy,
  ArrowLeft,
  Copy,
  Check,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import { formatValidAnswers } from '@/utils/buzz/answerValidation';

interface BuzzResultsScreenProps {
  challengeData: {
    id: number;
    puzzleDate: string;
    language: string;
    trendingSummary: string;
    challenges: Array<{
      type: string;
      prompt: string;
      answer: string;
      alternatives?: string[];
      trendingContext?: string;
    }>;
  };
  resultData: {
    score: number;
    challengesSolved: Array<{
      challengeIndex: number;
      userAnswer: string;
      correct: boolean;
    }>;
    completionTimeSeconds: number;
  };
  onBack: () => void;
}

/**
 * BuzzResultsScreen - Shows completion results with share functionality
 * Includes per-challenge breakdown with correct answers and explanations
 */
/** Maximum displayable score - matches the "/100" shown in UI */
const MAX_DISPLAY_SCORE = 100;

export default function BuzzResultsScreen({
  challengeData,
  resultData,
  onBack,
}: BuzzResultsScreenProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const correctCount = resultData.challengesSolved.filter((c) => c.correct).length;
  const totalChallenges = resultData.challengesSolved.length;
  const isPerfect = correctCount === totalChallenges;

  // Cap displayed score at MAX_DISPLAY_SCORE to match the "/100" shown in UI
  // This prevents confusing displays like "120/100" when there are >5 challenges
  const displayedScore = Math.min(resultData.score, MAX_DISPLAY_SCORE);

  // Fire confetti on mount if score > 0
  useEffect(() => {
    if (resultData.score > 0) {
      const duration = 1500;
      const end = Date.now() + duration;

      const frame = () => {
        fireConfetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFE135', '#FF6B35', '#00D9FF'],
        });
        fireConfetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFE135', '#FF6B35', '#00D9FF'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Extra burst for perfect score
      if (isPerfect) {
        setTimeout(() => {
          fireConfetti({
            particleCount: 60,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FF6B35', '#FFE135', '#FF1493'],
          });
        }, 500);
      }
    }
  }, [resultData.score, isPerfect]);

  // Generate shareable text (use capped score for consistency with display)
  const shareText = (() => {
    const icon = language === 'he' ? '🔥📰' : '📰🔥';
    const template = t('buzz.share.text');
    if (template && template.includes('{')) {
      return template
        .replace('{topic}', challengeData.trendingSummary)
        .replace('{score}', String(displayedScore));
    }
    return `${icon} Daily Buzz: ${challengeData.trendingSummary} | ${displayedScore}/100 | Beat this? 🔥`;
  })();

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [shareText]);

  // Handle native share
  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      await handleCopy();
    }
  }, [shareText, handleCopy]);

  // State for collapsible challenge review
  const [isReviewExpanded, setIsReviewExpanded] = useState(true);

  // Use capped score for visual feedback color determination
  const scorePercentage = displayedScore;

  // Static class mappings for Tailwind to detect at compile time
  // Dynamic class names like `text-${color}` are NOT included in build output
  const scoreColorStyles = (() => {
    if (scorePercentage >= 80) return { text: 'text-neo-lime', border: 'border-neo-lime/20', cssVar: '--neo-lime' };
    if (scorePercentage >= 60) return { text: 'text-neo-yellow', border: 'border-neo-yellow/20', cssVar: '--neo-yellow' };
    if (scorePercentage >= 40) return { text: 'text-neo-orange', border: 'border-neo-orange/20', cssVar: '--neo-orange' };
    return { text: 'text-neo-pink', border: 'border-neo-pink/20', cssVar: '--neo-pink' };
  })();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-start p-4 pb-24 md:pb-4 overflow-y-auto relative"
    >
      {/* Celebration background effect for high scores */}
      {scorePercentage >= 60 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 30%, var(--neo-yellow) 0%, transparent 50%)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-lg mb-4"
      >
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home')}
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-lg w-full text-center space-y-5 relative z-10">
        {/* Completion badge */}
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neo-cyan/15 rounded-neo-lg border-2 border-neo-cyan/40 shadow-hard-sm">
            <Trophy className="w-5 h-5 text-neo-cyan" />
            <span className="font-black text-neo-cyan text-sm uppercase tracking-wide">
              {t('buzz.results.title')}
            </span>
          </div>
        </motion.div>

        {/* Score Display - Hero Section */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="relative py-4"
        >
          {/* Decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-40 h-40 rounded-full border-4 ${scoreColorStyles.border} animate-ping`} style={{ animationDuration: '2s' }} />
          </div>

          {/* Score container */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="relative cursor-pointer"
            onClick={() =>
              fireConfetti({
                particleCount: 40,
                spread: 90,
                origin: { y: 0.5 },
                colors: ['#FFE135', '#00FF00', '#00FFFF', '#FF1493'],
              })
            }
          >
            <div className="text-xs text-slate-400 uppercase font-black tracking-widest mb-2">
              {t('buzz.yourScore')}
            </div>

            {/* Main score number */}
            <div className="relative inline-block">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`text-7xl sm:text-8xl md:text-9xl font-black ${scoreColorStyles.text} leading-none`}
                style={{
                  textShadow: `0 0 40px var(${scoreColorStyles.cssVar})`,
                }}
              >
                {displayedScore}
              </motion.div>
              <div className="text-slate-300 text-lg font-bold mt-1">/100</div>
            </div>

            {/* Tap to celebrate hint */}
            <p className="text-xs text-slate-500 mt-2">
              {t('buzz.tapToCelebrate')}
            </p>
          </motion.div>
        </motion.div>

        {/* Perfect score badge */}
        {isPerfect && (
          <motion.div
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: 0.35 }}
            className="relative"
          >
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/25 to-orange-500/25 rounded-neo-lg border-3 border-amber-500/50 shadow-hard-sm">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
              <span className="font-black text-amber-400 text-lg">
                {t('buzz.results.perfect')}
              </span>
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-2"
        >
          {/* Correct */}
          <div className="bg-slate-900/80 rounded-neo-lg border-2 border-slate-700 p-3">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-neo-lime" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{correctCount}</div>
            <div className="text-[10px] sm:text-xs text-slate-300 font-bold uppercase">
              {t('buzz.correct')}
            </div>
          </div>

          {/* Total */}
          <div className="bg-slate-900/80 rounded-neo-lg border-2 border-slate-700 p-3">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sparkles className="w-4 h-4 text-neo-cyan" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{totalChallenges}</div>
            <div className="text-[10px] sm:text-xs text-slate-300 font-bold uppercase">
              {t('buzz.total')}
            </div>
          </div>

          {/* Time */}
          <div className="bg-slate-900/80 rounded-neo-lg border-2 border-slate-700 p-3">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-neo-yellow" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums">
              {Math.floor(resultData.completionTimeSeconds / 60)}:
              {(resultData.completionTimeSeconds % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-300 font-bold uppercase">
              {t('results.time')}
            </div>
          </div>
        </motion.div>

        {/* Challenge Review Section - Collapsible */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="bg-slate-900/60 rounded-neo-lg border-2 border-slate-700 overflow-hidden"
        >
          {/* Collapsible Header */}
          <button
            onClick={() => setIsReviewExpanded(!isReviewExpanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors text-left"
          >
            <span className="text-xs text-slate-300 uppercase font-black tracking-wider">
              {t('buzz.results.reviewTitle')}
            </span>
            <motion.div
              animate={{ rotate: isReviewExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-slate-300" />
            </motion.div>
          </button>

          {/* Collapsible Content */}
          <motion.div
            initial={false}
            animate={{
              height: isReviewExpanded ? 'auto' : 0,
              opacity: isReviewExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {resultData.challengesSolved.map((solved, index) => {
                const challenge = challengeData.challenges[solved.challengeIndex];
                if (!challenge) return null;

                const isSkipped = !solved.userAnswer || solved.userAnswer.trim() === '';

                return (
                  <motion.div
                    key={`challenge-${solved.challengeIndex}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className={`
                      p-3 rounded-neo border-2 transition-colors
                      ${
                        solved.correct
                          ? 'bg-emerald-900/20 border-emerald-700/40'
                          : 'bg-red-900/20 border-red-700/40'
                      }
                    `}
                  >
                    {/* Challenge number and status */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-300 font-bold">#{index + 1}</span>
                      <div className="flex items-center gap-1.5">
                        {solved.correct ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-300" />
                        )}
                        <span
                          className={`text-xs font-black ${solved.correct ? 'text-emerald-300' : 'text-red-300'}`}
                        >
                          {solved.correct
                            ? t('buzz.feedback.correct')
                            : isSkipped
                              ? t('buzz.results.skipped')
                              : t('buzz.feedback.incorrect')}
                        </span>
                      </div>
                    </div>

                    {/* Challenge prompt */}
                    <p className="text-white text-sm font-medium mb-2 leading-relaxed text-left">
                      {challenge.prompt}
                    </p>

                    {/* Answer comparison */}
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 min-w-[70px]">
                          {t('buzz.results.correctAnswer')}
                        </span>
                        <span className="text-sm font-black text-emerald-200 uppercase">
                          {formatValidAnswers(challenge.answer, challenge.alternatives)}
                        </span>
                      </div>

                      {!solved.correct && !isSkipped && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-300 min-w-[70px]">
                            {t('buzz.results.yourAnswer')}
                          </span>
                          <span className="text-sm text-red-200 line-through uppercase">
                            {solved.userAnswer}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Trending context */}
                    {challenge.trendingContext && (
                      <div className="mt-2 pt-2 border-t border-slate-700/40">
                        <p className="text-xs text-slate-300 leading-relaxed text-left">
                          {challenge.trendingContext}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        {/* Trending Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900/50 rounded-neo-lg border-2 border-slate-700 p-4 text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-neo-cyan" />
            <span className="text-xs text-slate-300 uppercase font-black tracking-wider">
              {t('buzz.results.trending')}
            </span>
          </div>
          <p className="text-white text-sm leading-relaxed">{challengeData.trendingSummary}</p>
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 pt-2"
        >
          {/* Primary CTA */}
          <Button
            onClick={handleNativeShare}
            className="group relative w-full py-4 text-base font-black uppercase bg-neo-cyan text-neo-black border-4 border-neo-black rounded-neo-lg shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed transition-all overflow-hidden"
          >
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <Share2 className="me-2 w-5 h-5" />
            {t('buzz.results.share')}
          </Button>

          {/* Copy button */}
          <Button
            onClick={handleCopy}
            variant="outline"
            className="w-full py-3 bg-slate-900/80 border-2 border-slate-600 hover:border-neo-cyan hover:bg-neo-cyan/10 rounded-neo font-bold transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 me-2 text-neo-lime" />
                <span className="text-neo-lime">{t('common.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 me-2" />
                {t('daily.copyToClipboard')}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
