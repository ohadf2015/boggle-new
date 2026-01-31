/**
 * LessonPractice Component
 *
 * Interactive flashcard-style vocabulary practice with progress tracking
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useLesson } from '@/hooks/useVocabularyLesson';
import { cn } from '@/lib/utils';
import { normalizeWord, normalizeHebrewWord } from '@/shared/utils/wordNormalization';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Star, Trophy, ArrowLeft, Flame } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Language } from '@/shared/types/game';

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

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

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

  // Handle next word
  const handleNext = useCallback(() => {
    setShowFeedback(false);
    setAnswer('');

    if (currentWordIndex < practiceWords.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
    } else {
      // Loop back to start
      setCurrentWordIndex(0);
    }
  }, [currentWordIndex, practiceWords.length]);

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

      // Update streak
      if (correct) {
        setStreak((prev) => prev + 1);
        toast.success(t('student.practice.correct'), {
          icon: '✓',
          duration: 1000,
        });
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

      // Auto-advance after 1.5 seconds
      setTimeout(() => {
        handleNext();
      }, 1500);
    },
    [currentWord, answer, isChecking, lessonId, recordAttempt, t, handleNext, lesson?.language, language]
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
      <div className="flex justify-center items-center py-12">
        <NeoLoader variant="mascot-letters" size="lg" text={t('common.loading')} />
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
              <span className="text-neo-cyan font-neo-display text-2xl">{totalWords}</span>
            </div>
            <div className="flex items-center justify-between gap-8">
              <span className="text-neo-white/70 font-neo-body">{t('student.lessons.mastered')}</span>
              <span className="text-neo-yellow font-neo-display text-2xl">{masteredCount}</span>
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
              <span className="font-bold">{streak}</span>
            </div>
          )}
          <div className="text-neo-white/70">
            {masteredCount} / {totalWords} {t('student.lessons.mastered')}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-6 bg-neo-black border-neo border-neo-black overflow-hidden">
        <div
          className="h-full bg-neo-cyan transition-all duration-300"
          style={{ width: `${masteryPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-neo-body font-bold text-neo-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
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
                    className="text-center text-neo-cyan font-neo-body"
                  >
                    {t('student.practice.correct')}: <span className="font-bold">{currentWord?.word}</span>
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
      <div className="text-center text-sm text-neo-white/50 font-neo-body">
        {currentWordIndex + 1} / {practiceWords.length}
      </div>
    </div>
  );
}
