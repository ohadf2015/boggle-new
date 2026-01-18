'use client';

import { motion } from 'framer-motion';
import { Check, X, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CompletedChallengeOverlayProps {
  correctAnswer: string;
  userAnswer: string;
  wasCorrect: boolean;
}

/**
 * CompletedChallengeOverlay - Shows when navigating back to a completed challenge
 * Displays the user's answer, whether it was correct, and the correct answer if wrong
 * Prevents re-interaction with the challenge
 */
export default function CompletedChallengeOverlay({
  correctAnswer,
  userAnswer,
  wasCorrect,
}: CompletedChallengeOverlayProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm rounded-xl"
    >
      {/* Lock Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="mb-4"
      >
        <div
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            border-4 ${wasCorrect ? 'border-neo-lime bg-neo-lime/20' : 'border-neo-pink bg-neo-pink/20'}
          `}
        >
          {wasCorrect ? (
            <Check className="w-8 h-8 text-neo-lime" />
          ) : (
            <X className="w-8 h-8 text-neo-pink" />
          )}
        </div>
      </motion.div>

      {/* Status Text */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center space-y-3"
      >
        <div className="flex items-center gap-2 justify-center text-slate-400">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-bold uppercase">
            {t('buzz.challengeCompleted')}
          </span>
        </div>

        {/* User's Answer */}
        <div className="space-y-1">
          <div className="text-xs text-slate-500 uppercase font-bold">
            {t('buzz.lockedYourAnswer')}
          </div>
          <div
            className={`
              text-2xl font-black px-4 py-2 rounded-lg border-2
              ${wasCorrect
                ? 'text-neo-lime border-neo-lime/50 bg-neo-lime/10'
                : 'text-neo-pink border-neo-pink/50 bg-neo-pink/10'
              }
            `}
          >
            {userAnswer || '-'}
          </div>
        </div>

        {/* Correct Answer (only shown if wrong) */}
        {!wasCorrect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-1"
          >
            <div className="text-xs text-slate-500 uppercase font-bold">
              {t('buzz.lockedCorrectAnswer')}
            </div>
            <div className="text-xl font-black text-neo-lime px-4 py-2 rounded-lg border-2 border-neo-lime/30 bg-neo-lime/5">
              {correctAnswer}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
