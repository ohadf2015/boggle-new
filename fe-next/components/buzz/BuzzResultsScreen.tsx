'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2, Trophy, ArrowLeft, Copy, Check, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { fireConfetti } from '@/utils/confettiUtils';

interface BuzzResultsScreenProps {
  challengeData: {
    id: number;
    puzzleDate: string;
    language: string;
    trendingSummary: string;
  };
  resultData: {
    score: number;
    challengesSolved: Array<{
      correct: boolean;
    }>;
    completionTimeSeconds: number;
  };
  onBack: () => void;
}

/**
 * BuzzResultsScreen - Shows completion results with share functionality
 */
export default function BuzzResultsScreen({
  challengeData,
  resultData,
  onBack,
}: BuzzResultsScreenProps) {
  const { t, language } = useLanguage();
  const { profile, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

  const correctCount = resultData.challengesSolved.filter((c) => c.correct).length;
  const totalChallenges = resultData.challengesSolved.length;
  const isPerfect = correctCount === totalChallenges;

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

  // Generate shareable text
  const shareText = (() => {
    const icon = language === 'he' ? '🔥📰' : '📰🔥';
    const template = t('buzz.share.text');
    if (template && template.includes('{')) {
      return template
        .replace('{topic}', challengeData.trendingSummary)
        .replace('{score}', String(resultData.score));
    }
    return `${icon} Daily Buzz: ${challengeData.trendingSummary} | ${resultData.score}/100 | Beat this? 🔥`;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-start p-4 pb-24 md:pb-4 overflow-y-auto"
    >
      {/* Back button */}
      <motion.div className="absolute top-24 sm:top-28 start-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" />
          {t('daily.home') || 'Home'}
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-md w-full text-center space-y-5 py-6">
        {/* Completion badge */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neo-cyan/20 rounded-full border border-neo-cyan/40">
            <Trophy className="w-4 h-4 text-neo-cyan" />
            <span className="font-bold text-neo-cyan text-sm uppercase tracking-wide">
              {t('buzz.results.title') || 'BUZZ COMPLETE!'}
            </span>
          </div>
        </motion.div>

        {/* Score */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] py-2"
          onClick={() =>
            fireConfetti({
              particleCount: 30,
              spread: 80,
              origin: { y: 0.6 },
            })
          }
        >
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            {t('buzz.yourScore') || 'YOUR SCORE'}
          </div>
          <div className="text-7xl md:text-8xl font-black text-neo-yellow drop-shadow-[0_0_20px_rgba(255,225,53,0.3)] my-1">
            {resultData.score}
          </div>
          <div className="text-slate-400 text-sm font-medium">/100</div>
        </motion.div>

        {/* Perfect score badge */}
        {isPerfect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.3 }}
            className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/40"
          >
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="font-black text-amber-400">
              {t('buzz.results.perfect') || '🔥 PERFECT SCORE!'}
            </span>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3"
        >
          <div className="flex items-center justify-around">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">{correctCount}</div>
              <div className="text-xs text-slate-400 font-medium">
                {t('buzz.correct') || 'CORRECT'}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">{totalChallenges}</div>
              <div className="text-xs text-slate-400 font-medium">
                {t('buzz.total') || 'TOTAL'}
              </div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-white">
                {Math.floor(resultData.completionTimeSeconds / 60)}:
                {(resultData.completionTimeSeconds % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {t('results.time') || 'TIME'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Trending Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 text-left"
        >
          <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
            {t('buzz.results.trending') || "TODAY'S TOPICS"}
          </div>
          <p className="text-white text-sm leading-relaxed">
            {challengeData.trendingSummary}
          </p>
        </motion.div>

        {/* Share Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          {/* Primary CTA */}
          <Button
            onClick={handleNativeShare}
            className="w-full py-4 text-base font-black uppercase bg-neo-cyan text-neo-black border-3 border-neo-black rounded-xl shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all duration-150"
          >
            <Share2 className="mr-2 w-5 h-5" />
            {t('buzz.results.share') || 'SHARE YOUR BUZZ'}
          </Button>

          {/* Copy button */}
          <Button
            onClick={handleCopy}
            variant="outline"
            className="w-full bg-slate-800 border-2 border-slate-600 hover:border-neo-cyan"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 me-2 text-neo-cyan" />
                {t('common.copied') || 'COPIED!'}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 me-2" />
                {t('daily.copyToClipboard') || 'COPY TO CLIPBOARD'}
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
