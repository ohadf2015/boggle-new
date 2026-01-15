'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Lightbulb, TrendingUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import ScrambledChallenge from './challenges/ScrambledChallenge';
import FillBlankChallenge from './challenges/FillBlankChallenge';
import ChainChallenge from './challenges/ChainChallenge';
import SpotOnChallenge from './challenges/SpotOnChallenge';
import TrioChallenge from './challenges/TrioChallenge';
import WordleChallenge from './challenges/WordleChallenge';
import AnswerFeedbackModal from './AnswerFeedbackModal';
import { normalizeWord } from '@/shared/utils/wordNormalization';
import type { Language } from '@/shared/types/game';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';

interface BuzzGameScreenProps {
  challengeData: {
    id: number;
    puzzleDate: string;
    language: string;
    challenges: Array<{
      type: 'scrambled' | 'fillBlank' | 'chain' | 'spotOn' | 'trio' | 'wordle';
      trendTopic: string;
      prompt: string;
      answer: string;
      hint?: string;
      difficulty: 'easy' | 'medium' | 'hard';
      trendingContext?: string;
      options?: string[];
    }>;
  };
  onComplete: (result: {
    challengeId: number;
    score: number;
    challengesSolved: Array<{
      challengeIndex: number;
      userAnswer: string;
      correct: boolean;
      timeTakenSeconds: number;
    }>;
    completionTimeSeconds: number;
  }) => void;
  onQuit: () => void;
}

/**
 * BuzzGameScreen - Main gameplay component for Daily Buzz
 * Renders challenge types dynamically and tracks progress
 */
export default function BuzzGameScreen({
  challengeData,
  onComplete,
  onQuit,
}: BuzzGameScreenProps) {
  const { t, dir } = useLanguage();
  const { playWordAcceptedSound, playErrorSound } = useSoundEffects();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<
    Array<{ challengeIndex: number; userAnswer: string; correct: boolean; timeTakenSeconds: number }>
  >([]);
  const [showHint, setShowHint] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [challengeStartTime, setChallengeStartTime] = useState(() => Date.now());

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    userAnswer: string;
    points: number;
    trendingContext?: string;
  } | null>(null);
  const [pendingNextAction, setPendingNextAction] = useState<'next' | 'complete' | null>(null);

  // Navigation guard - prevent accidental back navigation during game
  useNavigationGuard({
    enabled: true, // Component only exists during active gameplay
    message: t('buzz.quitConfirm'),
    onNavigationAttempt: () => {
      setShowQuitConfirm(true);
      return false;
    },
  });

  const currentChallenge = challengeData.challenges[currentIndex];
  const isLastChallenge = currentIndex === challengeData.challenges.length - 1;

  // Reset hint and challenge start time when moving to next challenge
  useEffect(() => {
    setShowHint(false);
    setChallengeStartTime(Date.now());
  }, [currentIndex]);

  // Handle answer submission
  const handleAnswer = useCallback(
    (userAnswer: string) => {
      // Normalize answers for language-specific comparison (e.g., Hebrew final letters)
      const normalizedUserAnswer = normalizeWord(userAnswer.trim(), challengeData.language as Language);
      const normalizedCorrectAnswer = normalizeWord(currentChallenge.answer.trim(), challengeData.language as Language);
      const correct = normalizedUserAnswer === normalizedCorrectAnswer;
      const timeTaken = Math.floor((Date.now() - challengeStartTime) / 1000);

      // Play sound
      if (correct) {
        playWordAcceptedSound?.();
      } else {
        playErrorSound?.();
      }

      // Calculate points: Base 20 points, -5 for hint used
      const basePoints = 20;
      const hintPenalty = showHint ? 5 : 0;
      const points = correct ? basePoints - hintPenalty : 0;

      setScore((prev) => prev + points);

      // Record answer
      const answerRecord = {
        challengeIndex: currentIndex,
        userAnswer: userAnswer,
        correct,
        timeTakenSeconds: timeTaken,
      };
      setAnswers((prev) => [...prev, answerRecord]);

      // Show feedback modal instead of immediately moving to next
      setFeedbackData({
        isCorrect: correct,
        correctAnswer: currentChallenge.answer,
        userAnswer: userAnswer,
        points: points,
        trendingContext: currentChallenge.trendingContext,
      });
      setShowFeedback(true);
      setPendingNextAction(isLastChallenge ? 'complete' : 'next');
    },
    [
      currentChallenge,
      currentIndex,
      isLastChallenge,
      showHint,
      challengeStartTime,
      challengeData.language,
      playWordAcceptedSound,
      playErrorSound,
    ]
  );

  // Handle feedback modal close - proceed to next challenge or complete
  const handleFeedbackClose = useCallback(() => {
    setShowFeedback(false);
    setFeedbackData(null);

    if (pendingNextAction === 'complete') {
      // Complete the game
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      onComplete({
        challengeId: challengeData.id,
        score: score,
        challengesSolved: answers,
        completionTimeSeconds: totalTime,
      });
    } else if (pendingNextAction === 'next') {
      // Move to next challenge
      setCurrentIndex((prev) => prev + 1);
    }
    setPendingNextAction(null);
  }, [pendingNextAction, startTime, challengeData.id, score, answers, onComplete]);

  // Handle skip challenge
  const handleSkip = useCallback(() => {
    handleAnswer(''); // Submit empty answer
  }, [handleAnswer]);

  // Swipe gesture for mobile navigation (swipe left to skip in LTR, swipe right to skip in RTL)
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleSkip,
    isRtl: dir === 'rtl',
    threshold: 75,
    enableHaptic: true,
  });

  // Handle quit
  const handleQuitClick = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const handleConfirmQuit = useCallback(() => {
    onQuit();
  }, [onQuit]);

  // Render challenge component based on type
  const renderChallenge = () => {
    const props = {
      challenge: currentChallenge,
      onAnswer: handleAnswer,
      showHint,
    };

    switch (currentChallenge.type) {
      case 'scrambled':
        return <ScrambledChallenge {...props} />;
      case 'fillBlank':
        return <FillBlankChallenge {...props} />;
      case 'chain':
        return <ChainChallenge {...props} />;
      case 'spotOn':
        return <SpotOnChallenge {...props} />;
      case 'trio':
        return <TrioChallenge {...props} />;
      case 'wordle':
        return <WordleChallenge {...props} />;
      default:
        return <div>Unknown challenge type</div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col p-4 overflow-hidden relative"
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Top bar - Score and Quit */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleQuitClick}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none active:translate-x-0.5 active:translate-y-0.5 font-bold transition-all"
        >
          <X className="w-4 h-4 me-1" />
          {t('common.quit')}
        </Button>

        {/* Animated Score Display */}
        <motion.div
          key={score}
          initial={{ scale: 1.3, rotate: -5 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="relative"
        >
          <div className="px-4 py-2 bg-neo-yellow/15 border-3 border-neo-yellow rounded-neo-lg shadow-hard-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neo-yellow" />
              <span className="font-black text-neo-yellow text-lg tabular-nums">
                {score}
              </span>
              <span className="text-xs font-bold text-neo-yellow/70 uppercase">
                {t('common.pts')}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Combined Progress & Topic Section - Compact Layout */}
      <div className="mb-2 relative z-10">
        {/* Segmented Progress Bar (thin) */}
        <div className="flex gap-1 mb-2">
          {challengeData.challenges.map((_, i) => (
            <motion.div
              key={i}
              initial={i === currentIndex ? { scale: 0.8 } : {}}
              animate={i === currentIndex ? { scale: 1 } : {}}
              className={`
                h-1.5 flex-1 rounded-full transition-colors duration-300
                ${
                  i < currentIndex
                    ? 'bg-neo-lime'
                    : i === currentIndex
                      ? 'bg-neo-yellow'
                      : 'bg-slate-700'
                }
              `}
            />
          ))}
        </div>

        {/* Info Row: Counter + Topic + Type - All in one line */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-400 font-bold shrink-0">
            {currentIndex + 1}/{challengeData.challenges.length}
          </span>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentChallenge.trendTopic}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/60 rounded-neo border border-slate-700 min-w-0"
            >
              <TrendingUp className="w-3 h-3 text-neo-cyan shrink-0" />
              <span className="text-xs font-bold text-white truncate">
                {currentChallenge.trendTopic}
              </span>
            </motion.div>
          </AnimatePresence>

          <motion.span
            key={currentChallenge.type}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-2 py-0.5 bg-neo-cyan/15 border border-neo-cyan/30 rounded text-[10px] text-neo-cyan font-black uppercase shrink-0"
          >
            {t(`buzz.type.${currentChallenge.type}`) || currentChallenge.type}
          </motion.span>
        </div>
      </div>

      {/* Challenge Container - with swipe gesture support for mobile */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative z-10"
        {...swipeHandlers}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 60, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -60, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-2xl"
          >
            {renderChallenge()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions - Compact */}
      <div className="mt-2 space-y-1.5 relative z-10">
        {/* Hint button */}
        {currentChallenge.hint && !showHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={() => setShowHint(true)}
              variant="ghost"
              className="w-full py-2 border-2 border-slate-600 hover:border-neo-purple hover:bg-neo-purple/10 rounded-neo transition-all"
            >
              <Lightbulb className="w-4 h-4 me-2 text-neo-purple" />
              <span className="font-bold text-sm">{t('buzz.hint')}</span>
              <span className="ms-2 text-xs text-slate-400">
                (-5 {t('common.pts')})
              </span>
            </Button>
          </motion.div>
        )}

        {/* Skip button */}
        <Button
          onClick={handleSkip}
          variant="outline"
          className="w-full py-2 bg-slate-900/80 border-2 border-slate-600 hover:border-neo-pink hover:bg-neo-pink/10 rounded-neo font-bold text-sm text-slate-200 hover:text-white transition-all"
        >
          {isLastChallenge ? (
            <>
              {t('buzz.finish')}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </>
          ) : (
            <>
              {t('buzz.skip')}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </>
          )}
        </Button>
      </div>

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('buzz.quitConfirmTitle')}
        description={t('buzz.quitConfirm')}
        confirmText={t('daily.imSure')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmQuit}
        variant="danger"
      />

      {/* Answer Feedback Modal */}
      {feedbackData && (
        <AnswerFeedbackModal
          isOpen={showFeedback}
          isCorrect={feedbackData.isCorrect}
          correctAnswer={feedbackData.correctAnswer}
          userAnswer={feedbackData.userAnswer}
          points={feedbackData.points}
          trendingContext={feedbackData.trendingContext}
          onClose={handleFeedbackClose}
        />
      )}
    </motion.div>
  );
}
