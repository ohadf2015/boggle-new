'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, RotateCw, Home, Share2, Crown, TrendingUp, TrendingDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fireConfetti } from '@/utils/confettiUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import { getChallengeUrl, generateChallengeShareMessage, type ScoreChallenge } from '@/utils/challenges';
import type { SinglePlayerResultsData } from '@/components/singleplayer/SinglePlayerView';

interface ChallengeResultsProps {
  results: SinglePlayerResultsData;
  challenge: ScoreChallenge;
  attemptResult: { beatCreator: boolean; scoreDifference: number } | null;
  onPlayAgain: () => void;
  onBackToHome: () => void;
}

/**
 * ChallengeResults - Shows results after completing a challenge
 * Compares player's score against the challenge creator
 */
const ChallengeResults: React.FC<ChallengeResultsProps> = ({
  results,
  challenge,
  attemptResult,
  onPlayAgain,
  onBackToHome,
}) => {
  const { language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copied, setCopied] = useState(false);

  const beatCreator = attemptResult?.beatCreator ?? results.playerScore > challenge.creatorScore;
  const scoreDiff = attemptResult?.scoreDifference ?? (results.playerScore - challenge.creatorScore);

  // Celebration effect
  useEffect(() => {
    if (beatCreator) {
      // Winner confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        fireConfetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
        });
        fireConfetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [beatCreator]);

  // Copy challenge link
  const handleCopyLink = useCallback(async () => {
    const url = getChallengeUrl(challenge.challengeCode, 'results-share');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
    }
  }, [challenge.challengeCode]);

  // Share challenge
  const handleShare = useCallback(async () => {
    const message = generateChallengeShareMessage(challenge, language);
    const url = getChallengeUrl(challenge.challengeCode, 'results-share');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LexiClash Challenge',
          text: message,
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback to copy
      handleCopyLink();
    }
  }, [challenge, language, handleCopyLink]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6"
      >
        {/* Result Card - Click to fire confetti */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => beatCreator && fireConfetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })}
          className={cn(
            'p-6 rounded-neo border-4 border-neo-black shadow-hard-xl overflow-hidden relative cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]',
            beatCreator
              ? 'bg-gradient-to-br from-green-400 to-emerald-500'
              : isDark
              ? 'bg-gradient-to-br from-slate-700 to-slate-800'
              : 'bg-gradient-to-br from-gray-100 to-gray-200'
          )}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`,
            }} />
          </div>

          {/* Result Header */}
          <div className="relative text-center mb-6">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className={cn(
                'inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-4',
                beatCreator
                  ? 'bg-yellow-400 border-yellow-600'
                  : isDark
                  ? 'bg-slate-600 border-slate-500'
                  : 'bg-gray-300 border-gray-400'
              )}
            >
              {beatCreator ? (
                <Trophy className="w-10 h-10 text-yellow-900" />
              ) : (
                <Target className="w-10 h-10 text-gray-600 dark:text-gray-300" />
              )}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                'text-3xl font-black uppercase tracking-wide',
                beatCreator ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'
              )}
            >
              {beatCreator
                ? (language === 'he' ? 'ניצחת!' : 'You Won!')
                : (language === 'he' ? 'כמעט!' : 'So Close!')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={cn(
                'text-sm mt-1',
                beatCreator ? 'text-white/80' : isDark ? 'text-gray-300' : 'text-gray-600'
              )}
            >
              {beatCreator
                ? (language === 'he' ? `ניצחת את ${challenge.creatorUsername}!` : `You beat ${challenge.creatorUsername}!`)
                : (language === 'he' ? 'נסה שוב!' : 'Try again!')}
            </motion.p>
          </div>

          {/* Score Comparison */}
          <div className="relative grid grid-cols-3 gap-4 mb-6">
            {/* Your Score */}
            <div className={cn(
              'text-center p-4 rounded-neo border-2',
              beatCreator ? 'bg-white/20 border-white/30' : isDark ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-300'
            )}>
              <p className={cn(
                'text-xs font-bold uppercase mb-1',
                beatCreator ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                {language === 'he' ? 'אתה' : 'You'}
              </p>
              <p className={cn(
                'text-3xl font-black',
                beatCreator ? 'text-white' : isDark ? 'text-cyan-400' : 'text-cyan-600'
              )}>
                {results.playerScore}
              </p>
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className={cn(
                'px-3 py-1 rounded-full text-xs font-black uppercase',
                beatCreator ? 'bg-white/30 text-white' : isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-600'
              )}>
                VS
              </div>
            </div>

            {/* Creator Score */}
            <div className={cn(
              'text-center p-4 rounded-neo border-2',
              beatCreator ? 'bg-white/20 border-white/30' : isDark ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-300'
            )}>
              <p className={cn(
                'text-xs font-bold uppercase mb-1',
                beatCreator ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                {challenge.creatorUsername}
              </p>
              <p className={cn(
                'text-3xl font-black',
                beatCreator ? 'text-white/80' : isDark ? 'text-yellow-400' : 'text-yellow-600'
              )}>
                {challenge.creatorScore}
              </p>
            </div>
          </div>

          {/* Score Difference */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className={cn(
              'flex items-center justify-center gap-2 p-3 rounded-neo border-2 mb-6',
              beatCreator
                ? 'bg-white/30 border-white/40'
                : scoreDiff < 0
                ? isDark ? 'bg-red-500/20 border-red-500/30' : 'bg-red-100 border-red-300'
                : isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
            )}
          >
            {beatCreator ? (
              <TrendingUp className="w-5 h-5 text-white" />
            ) : (
              <TrendingDown className={cn('w-5 h-5', isDark ? 'text-red-400' : 'text-red-500')} />
            )}
            <span className={cn(
              'text-lg font-black',
              beatCreator ? 'text-white' : isDark ? 'text-red-400' : 'text-red-600'
            )}>
              {scoreDiff > 0 ? '+' : ''}{scoreDiff} {language === 'he' ? 'נקודות' : 'pts'}
            </span>
          </motion.div>

          {/* Stats Row */}
          <div className={cn(
            'grid grid-cols-2 gap-3',
            beatCreator ? 'text-white' : ''
          )}>
            <div className={cn(
              'text-center p-3 rounded-neo border-2',
              beatCreator ? 'bg-white/20 border-white/30' : isDark ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-300'
            )}>
              <p className={cn(
                'text-2xl font-black',
                beatCreator ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'
              )}>
                {results.playerWords.length}
              </p>
              <p className={cn(
                'text-xs',
                beatCreator ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                {language === 'he' ? 'מילים' : 'words'}
              </p>
            </div>
            <div className={cn(
              'text-center p-3 rounded-neo border-2',
              beatCreator ? 'bg-white/20 border-white/30' : isDark ? 'bg-black/20 border-white/10' : 'bg-white/50 border-gray-300'
            )}>
              <p className={cn(
                'text-2xl font-black',
                beatCreator ? 'text-white' : isDark ? 'text-white' : 'text-gray-800'
              )}>
                {Math.max(...results.playerWords.map(w => w.length), 0)}
              </p>
              <p className={cn(
                'text-xs',
                beatCreator ? 'text-white/70' : isDark ? 'text-gray-400' : 'text-gray-500'
              )}>
                {language === 'he' ? 'מילה ארוכה' : 'longest'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          {/* Try Again */}
          <Button
            onClick={onPlayAgain}
            className={cn(
              'w-full flex items-center justify-center gap-2 p-4',
              'font-black text-lg uppercase rounded-neo',
              'border-4 border-neo-black shadow-hard-lg',
              'hover:shadow-hard-xl hover:-translate-y-1 transition-all',
              'bg-neo-lime text-neo-black'
            )}
          >
            <RotateCw className="w-5 h-5" />
            {language === 'he' ? 'נסה שוב' : 'Try Again'}
          </Button>

          {/* Share Challenge */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleShare}
              className={cn(
                'flex items-center justify-center gap-2 p-3',
                'font-bold uppercase rounded-neo',
                'border-2 border-neo-black shadow-hard-sm',
                'hover:shadow-hard-md hover:-translate-y-0.5 transition-all',
                'bg-neo-cyan text-neo-black'
              )}
            >
              <Share2 className="w-4 h-4" />
              {language === 'he' ? 'שתף' : 'Share'}
            </Button>
            <Button
              onClick={handleCopyLink}
              className={cn(
                'flex items-center justify-center gap-2 p-3',
                'font-bold uppercase rounded-neo',
                'border-2 border-neo-black shadow-hard-sm',
                'hover:shadow-hard-md hover:-translate-y-0.5 transition-all',
                copied ? 'bg-neo-lime text-neo-black' : 'bg-neo-yellow text-neo-black'
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? (language === 'he' ? 'הועתק!' : 'Copied!') : (language === 'he' ? 'העתק' : 'Copy')}
            </Button>
          </div>

          {/* Back to Home */}
          <Button
            onClick={onBackToHome}
            variant="ghost"
            className={cn(
              'w-full flex items-center justify-center gap-2 p-3',
              'font-bold uppercase rounded-neo',
              isDark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-black/5'
            )}
          >
            <Home className="w-4 h-4" />
            {language === 'he' ? 'חזרה לדף הבית' : 'Back to Home'}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ChallengeResults;
