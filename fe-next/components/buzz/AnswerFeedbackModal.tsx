'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatValidAnswers } from '@/utils/buzz/answerValidation';

interface AnswerFeedbackModalProps {
  isOpen: boolean;
  isCorrect: boolean;
  correctAnswer: string;
  alternatives?: string[];
  userAnswer: string;
  points: number;
  trendingContext?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

const AUTO_CLOSE_DELAY = 1500;

/**
 * AnswerFeedbackModal - Shows feedback after each Buzz challenge answer
 * Displays correct/incorrect status with points earned and the correct answer
 * Auto-dismisses after 1.5 seconds by default
 */
export default function AnswerFeedbackModal({
  isOpen,
  isCorrect,
  correctAnswer,
  alternatives,
  userAnswer,
  points,
  trendingContext,
  onClose,
  autoCloseMs = AUTO_CLOSE_DELAY,
}: AnswerFeedbackModalProps) {
  const { t } = useLanguage();

  // Auto-close after delay
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => clearTimeout(timer);
  }, [isOpen, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className={`
              w-[90%] max-w-sm p-6 mx-4 rounded-xl border-3 border-neo-black shadow-hard-lg
              ${isCorrect ? 'bg-emerald-600' : 'bg-red-600'}
            `}
          >
            {/* Result Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="flex justify-center mb-4"
            >
              <div
                className={`
                  w-20 h-20 rounded-full flex items-center justify-center border-4
                  ${isCorrect ? 'bg-emerald-500 border-emerald-300' : 'bg-red-500 border-red-300'}
                `}
              >
                {isCorrect ? (
                  <Check className="w-12 h-12 text-white" strokeWidth={3} />
                ) : (
                  <X className="w-12 h-12 text-white" strokeWidth={3} />
                )}
              </div>
            </motion.div>

            {/* Result Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-center space-y-3"
            >
              {/* Status */}
              <h3
                className={`
                  text-3xl font-black uppercase tracking-wide
                  ${isCorrect ? 'text-emerald-300' : 'text-red-300'}
                `}
              >
                {isCorrect
                  ? t('buzz.feedback.correct')
                  : t('buzz.feedback.incorrect')}
              </h3>

              {/* Points */}
              <div
                className={`
                  text-xl font-bold
                  ${isCorrect ? 'text-neo-yellow' : 'text-slate-400'}
                `}
              >
                +{points} {t('common.pts')}
              </div>

              {/* Correct Answer (always show for incorrect, show for correct too) */}
              {!isCorrect && (
                <div className="mt-4 p-3 bg-black/30 rounded-lg border border-slate-600">
                  <div className="text-xs text-slate-400 uppercase font-bold mb-1">
                    {t('buzz.feedback.answerWas')}
                  </div>
                  <div className="text-2xl font-black text-white uppercase">
                    {formatValidAnswers(correctAnswer, alternatives)}
                  </div>
                </div>
              )}

              {/* User's Answer (for incorrect) */}
              {!isCorrect && userAnswer && (
                <div className="text-sm text-slate-400">
                  <span className="font-medium">
                    {t('buzz.results.yourAnswer')}
                  </span>{' '}
                  <span className="text-red-300 line-through">{userAnswer}</span>
                </div>
              )}

              {/* Trending Context (for incorrect - educational) */}
              {!isCorrect && trendingContext && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 text-left"
                >
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {trendingContext}
                  </p>
                </motion.div>
              )}
            </motion.div>

            {/* Progress indicator */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
              className={`
                mt-4 h-1 rounded-full origin-left
                ${isCorrect ? 'bg-emerald-400' : 'bg-red-400'}
              `}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
