/**
 * LessonPractice Component
 *
 * Interactive flashcard-style vocabulary practice with progress tracking
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useLesson } from '@/hooks/useVocabularyLesson';
import { usePracticeSettings } from '@/hooks/usePracticeSettings';
import { cn } from '@/lib/utils';
import { normalizeWord, normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Star, Trophy, ArrowLeft, Flame, Settings } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import type { Language } from '@/shared/types/game';
import { PracticeCardSkeleton } from '@/components/ui/EducationSkeletons';

/**
 * Detect if a string contains Hebrew characters
 * Used to ensure Hebrew normalization is applied even if lesson.language is missing
 */
function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Normalize a word for comparison, with smart language detection
 * Falls back to Hebrew normalization if Hebrew characters are detected
 */
function normalizeForComparison(word: string, language?: Language): string {
  // If word contains Hebrew characters, always use Hebrew normalization
  if (containsHebrew(word)) {
    return normalizeHebrewWord(word);
  }
  // Otherwise use the specified language or default to lowercase
  return normalizeWord(word, language || 'en');
}

interface LessonPracticeProps {
  lessonId: string;
}

export default function LessonPractice({ lessonId }: LessonPracticeProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const isRTL = language === 'he';

  const { lesson, isLoading: isLoadingLesson } = useLesson(lessonId);
  const { progress, recordAttempt, isLoading: isLoadingProgress } = useStudentProgress(lessonId);
  const { settings, updateSettings } = usePracticeSettings();

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [requireTypeCorrect, setRequireTypeCorrect] = useState(false);
  const [typeCorrectAnswer, setTypeCorrectAnswer] = useState('');
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  // Get current progress for this lesson
  const currentProgress = progress.find((p) => p.lesson_id === lessonId);

  // Calculate word list with mastery status
  const wordList = useMemo(() => {
    if (!lesson || !lesson.words) return [];

    const masteredWords = currentProgress?.words_mastered || [];
    const wordsAttempted = currentProgress?.words_attempted || {};

    // Normalize mastered words for comparison (handles Hebrew final letters)
    const normalizedMasteredWords = masteredWords.map((w) => normalizeForComparison(w, lesson.language));

    return lesson.words.map((word) => {
      const normalizedWord = normalizeForComparison(word.word, lesson.language);
      return {
        ...word,
        isMastered: normalizedMasteredWords.includes(normalizedWord),
        // For attempts lookup, try both normalized and original key
        attempts: wordsAttempted[normalizedWord]?.attempts ||
                  wordsAttempted[word.word.toLowerCase()]?.attempts || 0,
        correctAttempts: wordsAttempted[normalizedWord]?.correct ||
                         wordsAttempted[word.word.toLowerCase()]?.correct || 0,
      };
    });
  }, [lesson, currentProgress]);

  // Prioritize unmastered words, then mastered (randomized once on mount)
  const [practiceWords, setPracticeWords] = useState<typeof wordList>([]);

  useEffect(() => {
    if (wordList.length === 0) return;

    const unmastered = wordList.filter((w) => !w.isMastered);
    const mastered = wordList.filter((w) => w.isMastered);

    // Fisher-Yates shuffle
    const shuffleArray = <T,>(array: T[]): T[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    setPracticeWords([...shuffleArray(unmastered), ...shuffleArray(mastered)]);
  }, [wordList]);

  const currentWord = practiceWords[currentWordIndex];
  const totalWords = wordList.length;
  const masteredCount = wordList.filter((w) => w.isMastered).length;
  const masteryPercent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // Check if all words are mastered
  useEffect(() => {
    if (totalWords > 0 && masteredCount === totalWords && !showCompletion) {
      setShowCompletion(true);
    }
  }, [totalWords, masteredCount, showCompletion]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // Handle next word
  const handleNext = useCallback(() => {
    // Clear any running timers
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    setShowFeedback(false);
    setAnswer('');
    setCountdown(null);
    setRequireTypeCorrect(false);
    setTypeCorrectAnswer('');

    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
    } else {
      // Loop back to start
      setCurrentWordIndex(0);
    }
  }, [currentWordIndex, practiceWords.length]);

  // Handle streak celebrations
  const showStreakCelebration = useCallback((currentStreak: number) => {
    if (currentStreak === 5) {
      toast.success(t('student.practice.streakMilestone').replace('{{count}}', '5'), {
        icon: '🔥',
        duration: 2000,
      });
    } else if (currentStreak === 10) {
      toast.success(t('student.practice.streakMilestone').replace('{{count}}', '10'), {
        icon: '💎',
        duration: 3000,
      });
    } else if (currentStreak === 15) {
      toast.success(t('student.practice.streakMilestone').replace('{{count}}', '15'), {
        icon: '👑',
        duration: 3000,
      });
    }
  }, [t]);

  // Start auto-advance countdown
  const startAutoAdvance = useCallback((delayMs: number) => {
    if (!settings.autoAdvanceEnabled) return;

    // Start countdown display
    const totalSeconds = Math.ceil(delayMs / 1000);
    setCountdown(totalSeconds);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    // Set auto-advance timer
    autoAdvanceRef.current = setTimeout(() => {
      handleNext();
    }, delayMs);
  }, [settings.autoAdvanceEnabled, handleNext]);

  // Handle type-to-learn submission
  const handleTypeCorrectSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentWord) return;

    const lessonLanguage = lesson?.language || (containsHebrew(currentWord.word) ? 'he' : language || 'en') as Language;
    const userTyped = normalizeForComparison(typeCorrectAnswer.trim(), lessonLanguage);
    const correctAnswer = normalizeForComparison(currentWord.word.trim(), lessonLanguage);

    if (userTyped === correctAnswer) {
      setRequireTypeCorrect(false);
      // Start auto-advance after typing correct answer
      startAutoAdvance(settings.autoAdvanceIncorrect);
    } else {
      toast.error(t('student.practice.tryAgain'), {
        icon: '✏️',
        duration: 1000,
      });
    }
  }, [currentWord, typeCorrectAnswer, lesson?.language, language, t, startAutoAdvance, settings.autoAdvanceIncorrect]);

  // Handle answer submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!currentWord || !answer.trim() || isChecking) return;

      setIsChecking(true);

      // Check if answer is correct (normalized for language, including Hebrew final letters)
      // Uses smart detection to ensure Hebrew words are always normalized even if lesson.language is missing
      const lessonLanguage = lesson?.language || (containsHebrew(currentWord.word) ? 'he' : language || 'en') as Language;
      const userAnswer = normalizeForComparison(answer.trim(), lessonLanguage);
      const correctAnswer = normalizeForComparison(currentWord.word.trim(), lessonLanguage);
      const correct = userAnswer === correctAnswer;

      setIsCorrect(correct);
      setShowFeedback(true);

      // Update streak and show celebrations
      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        toast.success(t('student.practice.correct'), {
          icon: '✓',
          duration: 1000,
        });
        // Check for streak milestones
        showStreakCelebration(newStreak);
      } else {
        setStreak(0);
        toast.error(t('student.practice.incorrect'), {
          icon: '✗',
          duration: 1500,
        });
      }

      // Record attempt
      try {
        await recordAttempt(lessonId, currentWord.word, correct);
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }

      setIsChecking(false);

      // Handle auto-advance based on settings
      if (correct) {
        // Correct answer: use shorter timing
        startAutoAdvance(settings.autoAdvanceCorrect);
      } else {
        // Incorrect answer: require typing if enabled, otherwise use longer timing
        if (settings.requireTypeOnIncorrect) {
          setRequireTypeCorrect(true);
          // Don't auto-advance until they type the correct answer
        } else {
          startAutoAdvance(settings.autoAdvanceIncorrect);
        }
      }
    },
    [currentWord, answer, isChecking, lessonId, recordAttempt, t, streak, showStreakCelebration, settings, startAutoAdvance, lesson?.language, language]
  );

  // Handle skip
  const handleSkip = useCallback(() => {
    setStreak(0);
    handleNext();
  }, [handleNext]);

  // Handle exit
  const handleExit = useCallback(() => {
    router.push(`/${language}/student`);
  }, [router, language]);

  if (isLoadingLesson || isLoadingProgress) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-20 bg-neo-white/10 rounded animate-pulse" />
          <div className="h-5 w-32 bg-neo-white/10 rounded animate-pulse" />
        </div>
        {/* Progress bar skeleton */}
        <div className="h-6 w-full bg-neo-white/10 rounded animate-pulse" />
        {/* Practice card skeleton */}
        <PracticeCardSkeleton />
        {/* Word indicator skeleton */}
        <div className="h-4 w-16 mx-auto bg-neo-white/10 rounded animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-neo-pink font-neo-body text-lg">{t('common.error')}</p>
        <Button onClick={handleExit} className="mt-4">
          {t('common.back')}
        </Button>
      </div>
    );
  }

  // Completion screen
  if (showCompletion) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 space-y-6"
      >
        {/* Celebration animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: [0, 360] }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <Trophy className="w-24 h-24 text-neo-yellow" />
        </motion.div>

        {/* Completion message */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-neo-display text-neo-yellow">
            {t('student.practice.complete.title')}
          </h2>
          <p className="text-xl text-neo-white/80 font-neo-body">
            {t('student.practice.complete.subtitle')}
          </p>
        </div>

        {/* Stats */}
        <Card className="bg-neo-navy border-neo border-neo-black shadow-hard">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between gap-8">
              <span className="text-neo-white/70 font-neo-body">{t('student.lessons.words')}</span>
              <span className="text-neo-cyan font-neo-display text-2xl tabular-nums">{totalWords}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-neo-white/70 font-neo-body">{t('student.lessons.mastered')}</span>
              <span className="text-neo-yellow font-neo-display text-2xl tabular-nums">{masteredCount}</span>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => {
              setShowCompletion(false);
              setCurrentWordIndex(0);
            }}
            variant="outline"
            className="font-neo-body"
          >
            {t('student.lessons.review')}
          </Button>
          <Button
            onClick={handleExit}
            className="bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black font-neo-display shadow-hard"
          >
            {t('student.practice.complete.backToLessons')}
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handleExit}
          variant="ghost"
          size="sm"
          className="text-neo-white/70 hover:text-neo-white font-neo-body"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>

        {/* Progress stats */}
        <div className="flex items-center gap-4 text-sm font-neo-body">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-neo-orange">
              <Flame className="w-4 h-4" />
              <span className="font-bold tabular-nums">{streak}</span>
            </div>
          )}
          <div className="text-neo-white/70 tabular-nums">
            {masteredCount} / {totalWords} {t('student.lessons.mastered')}
          </div>
          {/* Settings button */}
          <Button
            onClick={() => setIsSettingsOpen(true)}
            variant="ghost"
            size="sm"
            className="text-neo-white/70 hover:text-neo-white p-1"
            aria-label={t('student.practice.settings')}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Progress bar - uses scaleX for compositor-only animation */}
      <div className="relative w-full h-6 bg-neo-black border-neo border-neo-black overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 w-full bg-neo-cyan origin-left transition-transform duration-300"
          style={{ transform: `scaleX(${masteryPercent / 100})` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-neo-body font-bold text-neo-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tabular-nums">
            {masteryPercent}%
          </span>
        </div>
      </div>

      {/* Practice card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentWord?.word}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
        >
          <Card
            className={cn(
              'bg-neo-navy border-neo-thick border-neo-black shadow-hard-lg',
              'overflow-hidden'
            )}
          >
            <CardContent className="p-8 space-y-6">
              {/* Definition */}
              <div className="text-center space-y-2">
                <div className="text-sm text-neo-white/60 font-neo-body uppercase tracking-wide">
                  {t('student.practice.definition')}
                </div>
                <div className="text-2xl md:text-3xl font-neo-display text-neo-white min-h-[80px] flex items-center justify-center">
                  {currentWord?.definition || t('student.practice.hint')}
                </div>
              </div>

              {/* Answer input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={t('student.practice.yourAnswer')}
                    disabled={showFeedback}
                    className={cn(
                      'text-center text-xl font-neo-body py-6',
                      'bg-neo-black/50 border-neo border-neo-white/30',
                      'text-neo-white placeholder:text-neo-white/40',
                      'focus:border-neo-cyan focus:ring-neo-cyan',
                      showFeedback && isCorrect && 'border-green-500 bg-green-500/10',
                      showFeedback && !isCorrect && 'border-red-500 bg-red-500/10'
                    )}
                    autoFocus
                  />

                  {/* Feedback icon */}
                  <AnimatePresence>
                    {showFeedback && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        {isCorrect ? (
                          <Check className="w-8 h-8 text-green-500" />
                        ) : (
                          <X className="w-8 h-8 text-red-500" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleSkip}
                    variant="outline"
                    className="flex-1 font-neo-body"
                    disabled={showFeedback}
                  >
                    {t('student.practice.skip')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={!answer.trim() || showFeedback || isChecking}
                    className="flex-1 bg-neo-pink hover:bg-neo-pink/90 text-neo-black font-neo-display shadow-hard"
                  >
                    {t('student.practice.submit')}
                  </Button>
                </div>
              </form>

              {/* Show correct answer on incorrect */}
              <AnimatePresence>
                {showFeedback && !isCorrect && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <div className="text-center text-neo-cyan font-neo-body">
                      {t('student.practice.correctAnswer')}: <span className="font-bold text-lg">{currentWord?.word}</span>
                    </div>

                    {/* Type-to-learn input */}
                    {requireTypeCorrect && (
                      <form onSubmit={handleTypeCorrectSubmit} className="space-y-2">
                        <p className="text-center text-sm text-neo-white/70">
                          {t('student.practice.typeCorrectAnswer')}
                        </p>
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            value={typeCorrectAnswer}
                            onChange={(e) => setTypeCorrectAnswer(e.target.value)}
                            placeholder={currentWord?.word}
                            className={cn(
                              'text-center font-neo-body py-2',
                              'bg-neo-black/50 border-neo border-neo-cyan/50',
                              'text-neo-white placeholder:text-neo-white/30',
                              'focus:border-neo-cyan focus:ring-neo-cyan'
                            )}
                            autoFocus
                          />
                          <Button
                            type="submit"
                            disabled={!typeCorrectAnswer.trim()}
                            className="bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black font-neo-body"
                          >
                            {t('student.practice.submit')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Countdown and Continue button */}
              <AnimatePresence>
                {showFeedback && countdown !== null && !requireTypeCorrect && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-3"
                  >
                    <span className="text-sm text-neo-white/50 tabular-nums">
                      {t('student.practice.nextIn').replace('{{seconds}}', String(countdown))}
                    </span>
                    <Button
                      onClick={handleNext}
                      variant="outline"
                      size="sm"
                      className="text-neo-cyan border-neo-cyan hover:bg-neo-cyan/20"
                    >
                      {t('student.practice.continue')}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mastery celebration (shows when reaching 3 correct in a row) */}
              <AnimatePresence>
                {showFeedback && isCorrect && currentWord && currentWord.isMastered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center justify-center gap-2 text-neo-yellow font-neo-display"
                  >
                    <Star className="w-5 h-5 fill-neo-yellow" />
                    <span>{t('student.practice.progress.mastered')}</span>
                    <Star className="w-5 h-5 fill-neo-yellow" />
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Word indicator */}
      <div className="text-center text-sm text-neo-white/50 font-neo-body tabular-nums">
        {currentWordIndex + 1} / {practiceWords.length}
      </div>

      {/* Settings Modal */}
      <Dialog.Root open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
          <Dialog.Content
            className={cn(
              'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-full max-w-md p-6 bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50',
              'rounded-neo'
            )}
          >
            <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-4 text-balance">
              {t('student.practice.settings')}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {t('student.practice.settingsDescription')}
            </Dialog.Description>

            <div className="space-y-6">
              {/* Auto-advance toggle */}
              <div className="flex items-center justify-between">
                <label className="text-neo-white font-neo-body">
                  {t('student.practice.autoAdvance')}
                </label>
                <button
                  type="button"
                  onClick={() => updateSettings({ autoAdvanceEnabled: !settings.autoAdvanceEnabled })}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    settings.autoAdvanceEnabled ? 'bg-neo-cyan' : 'bg-neo-white/20'
                  )}
                  role="switch"
                  aria-checked={settings.autoAdvanceEnabled}
                >
                  <span
                    className={cn(
                      'block w-5 h-5 rounded-full bg-neo-white transition-transform',
                      settings.autoAdvanceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>

              {/* Correct answer timing */}
              <div className="space-y-2">
                <label className="text-neo-white font-neo-body text-sm">
                  {t('student.practice.correctTiming')}
                </label>
                <div className="flex gap-2">
                  {[1000, 1500, 2000, 3000].map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => updateSettings({ autoAdvanceCorrect: ms })}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-neo border-neo font-neo-body text-sm tabular-nums',
                        settings.autoAdvanceCorrect === ms
                          ? 'bg-neo-cyan text-neo-black border-neo-black'
                          : 'bg-neo-black/30 text-neo-white/70 border-neo-white/20 hover:border-neo-cyan'
                      )}
                    >
                      {ms / 1000}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Incorrect answer timing */}
              <div className="space-y-2">
                <label className="text-neo-white font-neo-body text-sm">
                  {t('student.practice.incorrectTiming')}
                </label>
                <div className="flex gap-2">
                  {[2000, 3000, 4000, 5000].map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => updateSettings({ autoAdvanceIncorrect: ms })}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-neo border-neo font-neo-body text-sm tabular-nums',
                        settings.autoAdvanceIncorrect === ms
                          ? 'bg-neo-pink text-neo-black border-neo-black'
                          : 'bg-neo-black/30 text-neo-white/70 border-neo-white/20 hover:border-neo-pink'
                      )}
                    >
                      {ms / 1000}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Type correct answer on incorrect */}
              <div className="flex items-center justify-between">
                <label className="text-neo-white font-neo-body text-sm">
                  {t('student.practice.requireTypeCorrect')}
                </label>
                <button
                  type="button"
                  onClick={() => updateSettings({ requireTypeOnIncorrect: !settings.requireTypeOnIncorrect })}
                  className={cn(
                    'w-12 h-6 rounded-full transition-colors',
                    settings.requireTypeOnIncorrect ? 'bg-neo-cyan' : 'bg-neo-white/20'
                  )}
                  role="switch"
                  aria-checked={settings.requireTypeOnIncorrect}
                >
                  <span
                    className={cn(
                      'block w-5 h-5 rounded-full bg-neo-white transition-transform',
                      settings.requireTypeOnIncorrect ? 'translate-x-6' : 'translate-x-0.5'
                    )}
                  />
                </button>
              </div>
            </div>

            <Dialog.Close asChild>
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-neo-white"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
