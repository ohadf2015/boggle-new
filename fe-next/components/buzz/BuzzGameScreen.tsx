'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Lightbulb, Sparkles, TrendingUp, Zap } from 'lucide-react';
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
  const { t } = useLanguage();
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
      const correct =
        userAnswer.toLowerCase().trim() === currentChallenge.answer.toLowerCase().trim();
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
          {t('common.quit') || 'QUIT'}
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
                {t('common.pts') || 'PTS'}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Progress Section */}
      <div className="mb-4 relative z-10">
        {/* Challenge counter and type */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300 font-bold">
              {(() => {
                const template = t('buzz.challenge');
                if (template && template.includes('{number}')) {
                  return template
                    .replace('{number}', String(currentIndex + 1))
                    .replace('{total}', String(challengeData.challenges.length));
                }
                return `Challenge ${currentIndex + 1} of ${challengeData.challenges.length}`;
              })()}
            </span>
          </div>
          <motion.span
            key={currentChallenge.type}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-2.5 py-1 bg-neo-cyan/20 border border-neo-cyan/40 rounded-neo text-xs text-neo-cyan font-black uppercase tracking-wide"
          >
            {(() => {
              const typeKey = `buzz.type.${currentChallenge.type}`;
              return t(typeKey) || currentChallenge.type;
            })()}
          </motion.span>
        </div>

        {/* Segmented Progress Bar */}
        <div className="flex gap-1">
          {challengeData.challenges.map((_, i) => (
            <motion.div
              key={i}
              initial={i === currentIndex ? { scale: 0.8 } : {}}
              animate={i === currentIndex ? { scale: 1 } : {}}
              className={`
                h-2 flex-1 rounded-full transition-colors duration-300
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
      </div>

      {/* Trending Topic Badge - Animated */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentChallenge.trendTopic}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="mb-4 flex items-center justify-center relative z-10"
        >
          <div className="relative inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 rounded-neo-lg border-2 border-slate-600 shadow-hard-sm">
            {/* Decorative glow */}
            <div className="absolute inset-0 bg-neo-cyan/5 rounded-neo-lg blur-sm" />

            <div className="relative flex items-center gap-2">
              <div className="p-1 bg-neo-cyan/20 rounded-neo">
                <TrendingUp className="w-4 h-4 text-neo-cyan" />
              </div>
              <span className="text-sm font-bold text-white">
                {(() => {
                  const template = t('buzz.topicIs');
                  if (template && template.includes('{topic}')) {
                    return template.replace('{topic}', currentChallenge.trendTopic);
                  }
                  return `Topic: ${currentChallenge.trendTopic}`;
                })()}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Challenge Container */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
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

      {/* Bottom actions */}
      <div className="mt-4 space-y-2 relative z-10">
        {/* Hint button */}
        {currentChallenge.hint && !showHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              onClick={() => setShowHint(true)}
              variant="ghost"
              className="w-full py-3 border-2 border-slate-600 hover:border-neo-purple hover:bg-neo-purple/10 rounded-neo transition-all"
            >
              <Lightbulb className="w-4 h-4 me-2 text-neo-purple" />
              <span className="font-bold">{t('buzz.hint') || 'Show Hint'}</span>
              <span className="ms-2 text-xs text-slate-400">
                (-5 {t('common.pts') || 'PTS'})
              </span>
            </Button>
          </motion.div>
        )}

        {/* Skip button */}
        <Button
          onClick={handleSkip}
          variant="outline"
          className="w-full py-3 bg-slate-900/80 border-2 border-slate-600 hover:border-neo-pink hover:bg-neo-pink/10 rounded-neo font-bold transition-all"
        >
          {isLastChallenge ? (
            <>
              {t('buzz.finish') || 'FINISH'}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </>
          ) : (
            <>
              {t('buzz.skip') || 'SKIP CHALLENGE'}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </>
          )}
        </Button>
      </div>

      {/* Quit Confirmation Dialog */}
      <ConfirmationDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        title={t('buzz.quitConfirmTitle') || 'Quit Daily Buzz?'}
        description={
          t('buzz.quitConfirm') ||
          "Your progress will be saved, but incomplete challenges won't count toward your score."
        }
        confirmText={t('daily.imSure') || "I'm Sure"}
        cancelText={t('common.cancel') || 'Cancel'}
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
