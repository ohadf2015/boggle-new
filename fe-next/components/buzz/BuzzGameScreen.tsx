'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Lightbulb, TrendingUp, Zap, Check } from 'lucide-react';
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
import CompletedChallengeOverlay from './challenges/CompletedChallengeOverlay';
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
      alternatives?: string[];
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

// Maximum score achievable in Daily Buzz - displayed as "score/100"
const MAX_SCORE = 100;

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

  // Draft answers for bidirectional navigation
  const [draftAnswers, setDraftAnswers] = useState<Map<number, string>>(new Map());
  // Track which challenges used hints
  const [hintsUsed, setHintsUsed] = useState<Set<number>>(new Set());
  // Track answered challenges
  const answeredChallenges = useMemo(() => new Set(answers.map(a => a.challengeIndex)), [answers]);

  // Feedback modal state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<{
    isCorrect: boolean;
    correctAnswer: string;
    alternatives?: string[];
    userAnswer: string;
    points: number;
    trendingContext?: string;
  } | null>(null);
  // Store pending completion data to avoid stale state issues
  const [pendingCompletionData, setPendingCompletionData] = useState<{
    answers: Array<{ challengeIndex: number; userAnswer: string; correct: boolean; timeTakenSeconds: number }>;
    score: number;
  } | null>(null);

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

  // Restore hint state when navigating to a challenge
  useEffect(() => {
    setShowHint(hintsUsed.has(currentIndex));
    // Only reset timer if this challenge hasn't been answered yet
    if (!answeredChallenges.has(currentIndex)) {
      setChallengeStartTime(Date.now());
    }
  }, [currentIndex, hintsUsed, answeredChallenges]);

  // Handle answer submission
  const handleAnswer = useCallback(
    (userAnswer: string) => {
      // Don't re-submit if already answered
      if (answeredChallenges.has(currentIndex)) {
        return;
      }

      // Normalize answers for language-specific comparison (e.g., Hebrew final letters)
      const normalizedUserAnswer = normalizeWord(userAnswer.trim(), challengeData.language as Language);
      const normalizedCorrectAnswer = normalizeWord(currentChallenge.answer.trim(), challengeData.language as Language);

      // Check against alternatives if provided (for fill_blank challenges)
      const normalizedAlternatives = currentChallenge.alternatives?.map(alt =>
        normalizeWord(alt.trim(), challengeData.language as Language)
      );

      const correct = normalizedUserAnswer === normalizedCorrectAnswer ||
        (normalizedAlternatives?.some(alt => normalizedUserAnswer === alt) ?? false);
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

      setScore((prev) => Math.min(MAX_SCORE, prev + points));

      // Record answer
      const answerRecord = {
        challengeIndex: currentIndex,
        userAnswer: userAnswer,
        correct,
        timeTakenSeconds: timeTaken,
      };
      setAnswers((prev) => [...prev, answerRecord]);

      // Clear draft answer for this challenge
      setDraftAnswers((prev) => {
        const next = new Map(prev);
        next.delete(currentIndex);
        return next;
      });

      // Show feedback modal
      setFeedbackData({
        isCorrect: correct,
        correctAnswer: currentChallenge.answer,
        alternatives: currentChallenge.alternatives,
        userAnswer: userAnswer,
        points: points,
        trendingContext: currentChallenge.trendingContext,
      });
      setShowFeedback(true);

      // Check if all challenges are answered - store completion data to avoid stale state
      const allAnswered = answers.length + 1 === challengeData.challenges.length;
      if (allAnswered) {
        // Store the complete answers array AND the updated score now while we have accurate values
        const updatedAnswers = [...answers, answerRecord];
        const updatedScore = Math.min(MAX_SCORE, score + points);
        setPendingCompletionData({ answers: updatedAnswers, score: updatedScore });
      }
    },
    [
      currentChallenge,
      currentIndex,
      showHint,
      challengeStartTime,
      challengeData.language,
      challengeData.challenges.length,
      playWordAcceptedSound,
      playErrorSound,
      answeredChallenges,
      answers,
      score,
    ]
  );

  // Handle feedback modal close
  const handleFeedbackClose = useCallback(() => {
    setShowFeedback(false);
    setFeedbackData(null);

    if (pendingCompletionData) {
      // Complete the game - use stored data to avoid stale state issues
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      onComplete({
        challengeId: challengeData.id,
        score: pendingCompletionData.score,
        challengesSolved: pendingCompletionData.answers,
        completionTimeSeconds: totalTime,
      });
      setPendingCompletionData(null);
    } else {
      // Auto-advance to next challenge if not the last one
      // Use setState callback to avoid stale closure over currentIndex
      setCurrentIndex((prevIndex) => {
        if (prevIndex < challengeData.challenges.length - 1) {
          return prevIndex + 1;
        }
        return prevIndex;
      });
    }
  }, [pendingCompletionData, startTime, challengeData.id, challengeData.challenges.length, onComplete]);

  // Handle navigation to previous challenge
  const handlePrevChallenge = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Handle navigation to next challenge
  const handleNextChallenge = useCallback(() => {
    setCurrentIndex((prev) => (prev < challengeData.challenges.length - 1 ? prev + 1 : prev));
  }, [challengeData.challenges.length]);

  // Bidirectional swipe gesture for mobile navigation
  // NOTE: useSwipeGesture already handles RTL reversal internally when isRtl=true,
  // so we map left->next and right->prev as if in LTR mode. The hook will reverse them for RTL.
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNextChallenge,  // Swipe left = go forward/next
    onSwipeRight: handlePrevChallenge,  // Swipe right = go backward/previous
    isRtl: dir === 'rtl',
    threshold: 75,
    enableHaptic: true,
  });

  // Handle hint click
  const handleHintClick = useCallback(() => {
    setShowHint(true);
    setHintsUsed((prev) => new Set(prev).add(currentIndex));
  }, [currentIndex]);

  // Handle finish - submit all answers
  const handleFinish = useCallback(() => {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    // Fill in empty answers for unanswered challenges
    const allAnswers = challengeData.challenges.map((_, idx) => {
      const existing = answers.find(a => a.challengeIndex === idx);
      return existing || {
        challengeIndex: idx,
        userAnswer: '',
        correct: false,
        timeTakenSeconds: 0,
      };
    });
    onComplete({
      challengeId: challengeData.id,
      score: score,
      challengesSolved: allAnswers,
      completionTimeSeconds: totalTime,
    });
  }, [startTime, challengeData.id, challengeData.challenges, score, answers, onComplete]);

  // Handle quit
  const handleQuitClick = useCallback(() => {
    setShowQuitConfirm(true);
  }, []);

  const handleConfirmQuit = useCallback(() => {
    onQuit();
  }, [onQuit]);

  // Get the answer record for the current challenge (if it exists)
  const currentAnswer = useMemo(
    () => answers.find((a) => a.challengeIndex === currentIndex),
    [answers, currentIndex]
  );
  const isCurrentChallengeAnswered = answeredChallenges.has(currentIndex);

  // Render challenge component based on type
  const renderChallenge = () => {
    // Defensive check - should never happen but prevents crashes
    if (!currentChallenge) {
      return (
        <div className="text-center p-8">
          <div className="text-4xl mb-4">🤔</div>
          <p className="text-slate-400 font-bold">{t('buzz.noChallenge')}</p>
        </div>
      );
    }

    const props = {
      challenge: currentChallenge,
      onAnswer: handleAnswer,
      showHint,
    };

    // Render the challenge with locked overlay if already answered
    // Add key prop to force remount when challenge changes
    const challengeComponent = (() => {
      switch (currentChallenge.type) {
        case 'scrambled':
          return <ScrambledChallenge key={currentIndex} {...props} />;
        case 'fillBlank':
          return <FillBlankChallenge key={currentIndex} {...props} />;
        case 'chain':
          return <ChainChallenge key={currentIndex} {...props} />;
        case 'spotOn':
          return <SpotOnChallenge key={currentIndex} {...props} />;
        case 'trio':
          return <TrioChallenge key={currentIndex} {...props} />;
        case 'wordle':
          return <WordleChallenge key={currentIndex} {...props} />;
        default:
          return <div>Unknown challenge type</div>;
      }
    })();

    // If this challenge is already answered, show the locked overlay
    if (isCurrentChallengeAnswered && currentAnswer) {
      return (
        <div className="relative">
          {/* Render the challenge in the background (blurred/dimmed) */}
          <div className="opacity-20 pointer-events-none select-none">
            {challengeComponent}
          </div>
          {/* Overlay showing completion status */}
          <CompletedChallengeOverlay
            correctAnswer={currentChallenge.answer}
            userAnswer={currentAnswer.userAnswer}
            wasCorrect={currentAnswer.correct}
          />
        </div>
      );
    }

    return challengeComponent;
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
        {/* Segmented Progress Bar (thin) - shows answered status */}
        <div className="flex gap-1 mb-2">
          {challengeData.challenges.map((_, i) => {
            const isAnswered = answeredChallenges.has(i);
            const isCurrent = i === currentIndex;
            return (
              <motion.div
                key={i}
                initial={isCurrent ? { scale: 0.8 } : {}}
                animate={isCurrent ? { scale: 1 } : {}}
                className={`
                  h-1.5 flex-1 rounded-full transition-colors duration-300 relative
                  ${
                    isAnswered
                      ? 'bg-neo-lime'
                      : isCurrent
                        ? 'bg-neo-yellow'
                        : 'bg-slate-700'
                  }
                `}
              >
                {/* Checkmark for answered challenges */}
                {isAnswered && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Check className="w-3 h-3 text-neo-lime" />
                  </div>
                )}
              </motion.div>
            );
          })}
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
        {/* Navigation Controls */}
        <div className="space-y-2">
          {/* Desktop Navigation - Back/Skip Buttons */}
          <div className="hidden sm:flex items-center justify-between gap-2">
            <Button
              onClick={handlePrevChallenge}
              disabled={currentIndex === 0}
              variant="outline"
              className="flex-1 py-2 border-2 border-slate-600 hover:border-neo-cyan hover:bg-neo-cyan/10 rounded-neo transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold"
            >
              {dir === 'rtl' ? (
                <ChevronRight className="w-4 h-4 me-1" />
              ) : (
                <ChevronLeft className="w-4 h-4 me-1" />
              )}
              {t('buzz.back')}
            </Button>
            <Button
              onClick={handleNextChallenge}
              disabled={currentIndex === challengeData.challenges.length - 1}
              variant="outline"
              className="flex-1 py-2 border-2 border-slate-600 hover:border-neo-cyan hover:bg-neo-cyan/10 rounded-neo transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold"
            >
              {t('buzz.skip')}
              {dir === 'rtl' ? (
                <ChevronLeft className="w-4 h-4 ms-1" />
              ) : (
                <ChevronRight className="w-4 h-4 ms-1" />
              )}
            </Button>
          </div>

          {/* Mobile Navigation - Swipe Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="sm:hidden flex items-center justify-center gap-2 py-2 text-slate-400"
          >
            <motion.div
              animate={{ x: dir === 'rtl' ? [0, 5, 0] : [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              {dir === 'rtl' ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </motion.div>
            <span className="text-xs font-bold uppercase">
              {t('buzz.swipeToNavigate')}
            </span>
            <motion.div
              animate={{ x: dir === 'rtl' ? [0, -5, 0] : [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            >
              {dir === 'rtl' ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Hint button - only show if challenge not answered */}
        {currentChallenge.hint && !showHint && !answeredChallenges.has(currentIndex) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={handleHintClick}
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

        {/* Finish button - only show when all challenges answered */}
        {answeredChallenges.size === challengeData.challenges.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Button
              onClick={handleFinish}
              className="w-full py-3 bg-neo-lime text-neo-black border-3 border-neo-black shadow-hard-lg hover:shadow-hard-xl hover:-translate-y-1 active:translate-y-0 active:shadow-hard-pressed rounded-neo font-black text-base uppercase transition-all"
            >
              <Check className="w-5 h-5 me-2" />
              {t('buzz.finish')}
            </Button>
          </motion.div>
        )}
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
          alternatives={feedbackData.alternatives}
          userAnswer={feedbackData.userAnswer}
          points={feedbackData.points}
          trendingContext={feedbackData.trendingContext}
          onClose={handleFeedbackClose}
        />
      )}
    </motion.div>
  );
}
