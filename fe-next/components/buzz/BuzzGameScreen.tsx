'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';
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
      className="flex-1 flex flex-col p-4 overflow-hidden"
    >
      {/* Top bar - Quit button */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={handleQuitClick}
          className="border-2 border-neo-black shadow-hard-sm hover:shadow-hard active:shadow-none font-bold"
        >
          <X className="w-4 h-4 me-1" />
          {t('common.quit') || 'QUIT'}
        </Button>

        {/* Score */}
        <motion.div
          key={score}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="px-4 py-2 bg-neo-yellow/20 border-2 border-neo-yellow rounded-lg"
        >
          <span className="font-black text-neo-yellow text-lg">
            {score} {t('common.pts') || 'PTS'}
          </span>
        </motion.div>
      </div>

      {/* Progress indicator */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400 font-medium">
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
          <span className="text-xs text-neo-yellow font-bold uppercase">
            {(() => {
              const typeKey = `buzz.type.${currentChallenge.type}`;
              return t(typeKey) || currentChallenge.type;
            })()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${((currentIndex + 1) / challengeData.challenges.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
            className="h-full bg-neo-yellow"
          />
        </div>
      </div>

      {/* Trending Topic Badge */}
      <div className="mb-4 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700">
          <Sparkles className="w-4 h-4 text-neo-cyan" />
          <span className="text-sm font-medium text-slate-300">
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

      {/* Challenge Container */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-2xl"
          >
            {renderChallenge()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom actions */}
      <div className="mt-4 space-y-3">
        {/* Hint button */}
        {currentChallenge.hint && !showHint && (
          <Button
            onClick={() => setShowHint(true)}
            variant="ghost"
            className="w-full border-2 border-slate-600 hover:border-neo-cyan"
          >
            <Lightbulb className="w-4 h-4 me-2" />
            {t('buzz.hint') || 'Show Hint'} (-5 {t('common.pts') || 'PTS'})
          </Button>
        )}

        {/* Skip button */}
        <Button
          onClick={handleSkip}
          variant="outline"
          className="w-full bg-slate-800 border-2 border-slate-600 hover:border-neo-pink"
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
