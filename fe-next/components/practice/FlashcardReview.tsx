'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Check,
  X,
  RotateCcw,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Layers,
  MousePointer2,
  Loader2,
} from 'lucide-react';
import type { VocabularyWord } from '@/lib/supabase/teacher';
import { FlashcardSwipeStack } from './FlashcardSwipeStack';
import type { EnrichedVocabularyWord, VocabularyExample } from '@/types/vocabulary';
import { socket } from '@/lib/socket';
import { PronunciationButton } from './PronunciationButton';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

interface FlashcardReviewProps {
  words: VocabularyWord[];
  onComplete: (results: { correct: number; total: number }) => void;
  onBack: () => void;
  onCardReviewed?: (correct: boolean) => void;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
}

type ReviewMode = 'classic' | 'swipe';

export default function FlashcardReview({
  words,
  onComplete,
  onBack,
  onCardReviewed,
  xpSessionData,
}: FlashcardReviewProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('classic');
  const [enrichedWords, setEnrichedWords] = useState<EnrichedVocabularyWord[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const [autoPronounce, setAutoPronounce] = useState(false);

  const { speak } = useSpeechSynthesis(language);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  // Enrich vocabulary words with Daily Buzz context on mount
  useEffect(() => {
    if (words.length === 0) return;

    setIsEnriching(true);

    // Convert VocabularyWord to enrichment format
    const wordsToEnrich = words.map((word) => ({
      word: word.word,
      definition: word.definition || 'No definition provided',
    }));

    // Request enrichment via WebSocket
    socket.emit('enrichVocabulary', {
      words: wordsToEnrich,
      language: language,
    });

    // Listen for enriched response
    const handleEnriched = (data: { enrichedWords: any[] }) => {
      const enriched: EnrichedVocabularyWord[] = data.enrichedWords.map((word: any) => ({
        word: word.word,
        definition: word.definition,
        pronunciation: word.pronunciation,
        partOfSpeech: word.partOfSpeech,
        examples: word.examples || [],
        contextualExamples: (word.contextualExamples || []).map((text: string) => ({
          text,
        })) as VocabularyExample[],
      }));
      setEnrichedWords(enriched);
      setIsEnriching(false);
    };

    socket.on('vocabularyEnriched', handleEnriched);

    // Cleanup
    return () => {
      socket.off('vocabularyEnriched', handleEnriched);
    };
  }, [words, language]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => {
      const nextFlipped = !prev;
      // Auto-pronounce when flipping to answer (definition) side
      if (nextFlipped && autoPronounce && currentWord) {
        speak(currentWord.word);
      }
      return nextFlipped;
    });
  }, [autoPronounce, currentWord, speak]);

  const handleAnswer = useCallback((correct: boolean) => {
    setResults((prev) => [...prev, correct]);
    onCardReviewed?.(correct);

    if (currentIndex === words.length - 1) {
      // Last card - show results
      const finalResults = [...results, correct];
      const correctCount = finalResults.filter(Boolean).length;
      setShowResults(true);
      onComplete({ correct: correctCount, total: words.length });
    } else {
      // Next card
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, words.length, results, onCardReviewed, onComplete]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults([]);
    setShowResults(false);
  }, []);

  // Loading state while enriching
  if (isEnriching) {
    return (
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6 flex items-center justify-center">
        <Card className="border-neo border-neo-black shadow-hard-lg bg-neo-navy/80 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-neo-cyan animate-spin mb-4" />
            <p className="text-neo-white font-neo-body">
              {t('education.lesson.enrichingContent') || 'Loading enriched content...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    const correctCount = results.filter(Boolean).length;
    const percentage = Math.round((correctCount / words.length) * 100);

    return (
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6 flex items-center justify-center">
        <Card className="border-neo border-neo-black shadow-hard-lg bg-neo-navy/80 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Trophy className="w-16 h-16 mx-auto text-neo-yellow mb-4" />
            </motion.div>

            <h2 className="text-2xl font-neo-display text-neo-white mb-2">
              {t('education.practice.complete') || 'Practice Complete!'}
            </h2>

            <div className="my-6">
              <p className="text-5xl font-neo-display text-neo-cyan">{percentage}%</p>
              <p className="text-slate-400 mt-2">
                {correctCount} / {words.length} correct
              </p>

              {/* XP Session Summary - Mastery message shown FIRST (research requirement) */}
              {xpSessionData && (
                <div className="mt-4 pt-4 border-t border-neo-black/30">
                  {xpSessionData.sessionMasteryMessage && (
                    <p className="font-neo-display text-lg text-neo-yellow mb-2">
                      {xpSessionData.sessionMasteryMessage}
                    </p>
                  )}
                  <p className="text-neo-white/80 font-neo-body">
                    +{xpSessionData.sessionXpEarned} {t('education.xp.xpGained') || 'XP'}
                  </p>
                </div>
              )}
            </div>

            {/* Word results summary */}
            <div className="bg-neo-black/30 rounded-neo p-4 mb-6 max-h-40 overflow-y-auto">
              {words.map((word, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1 text-sm"
                >
                  <span className="text-neo-white font-neo-body">{word.word}</span>
                  {results[idx] ? (
                    <Check className="w-4 h-4 text-neo-cyan" />
                  ) : (
                    <X className="w-4 h-4 text-neo-pink" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleRestart}
                className={cn(
                  'flex-1 bg-neo-cyan text-neo-black font-bold',
                  'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed'
                )}
              >
                <RotateCcw className={cn('w-4 h-4', isRTL ? 'ml-2' : 'mr-2')} />
                {t('common.retry') || 'Try Again'}
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.back') || 'Back'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render swipe mode
  if (reviewMode === 'swipe' && enrichedWords.length > 0) {
    return (
      <div className="min-h-screen bg-neo-navy p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          {/* Header with mode toggle */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-slate-400 hover:text-neo-white"
            >
              <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-neo-display text-neo-white">
                {t('education.practice.flashcards') || 'Flashcard Review'}
              </h1>
              <p className="text-sm text-slate-400">
                {currentIndex + 1} / {words.length}
              </p>
            </div>
            {/* Mode toggle buttons - in swipe mode, swipe button is active */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewMode('classic')}
                className="text-neo-cyan hover:bg-neo-cyan/20"
                title={t('education.lesson.classicMode') || 'Classic Mode'}
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewMode('swipe')}
                className="text-neo-pink hover:bg-neo-pink/20 bg-neo-pink/20"
                title={t('education.lesson.swipeMode') || 'Swipe Mode'}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Swipe stack */}
          <FlashcardSwipeStack
            words={enrichedWords}
            onGotIt={(word) => handleAnswer(true)}
            onDontKnow={(word) => handleAnswer(false)}
            onComplete={() => {
              const correctCount = results.filter(Boolean).length;
              setShowResults(true);
              onComplete({ correct: correctCount, total: words.length });
            }}
          />
        </div>
      </div>
    );
  }

  // Classic mode (existing tap-to-flip)
  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* Header with mode toggle */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-400 hover:text-neo-white"
          >
            <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-neo-display text-neo-white">
              {t('education.practice.flashcards') || 'Flashcard Review'}
            </h1>
            <p className="text-sm text-slate-400">
              {currentIndex + 1} / {words.length}
            </p>
          </div>
          {/* Mode toggle buttons (only show if enriched) */}
          {enrichedWords.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewMode('classic')}
                className="text-neo-cyan hover:bg-neo-cyan/20 bg-neo-cyan/20"
                title={t('education.lesson.classicMode') || 'Classic Mode'}
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewMode('swipe')}
                className="text-neo-pink hover:bg-neo-pink/20"
                title={t('education.lesson.swipeMode') || 'Swipe Mode'}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar and auto-pronounce option */}
        <div className="mb-8">
          <div className="h-2 bg-neo-black/30 rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-neo-cyan"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Auto-pronounce checkbox */}
          <div className="flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="auto-pronounce"
              checked={autoPronounce}
              onChange={(e) => setAutoPronounce(e.target.checked)}
              className="w-4 h-4 accent-neo-cyan cursor-pointer"
            />
            <label
              htmlFor="auto-pronounce"
              className="text-sm text-slate-400 font-neo-body cursor-pointer select-none"
            >
              {t('education.lesson.autoPronounce') || 'Auto-pronounce'}
            </label>
          </div>
        </div>

        {/* Flashcard */}
        <div
          className="relative h-64 sm:h-80 perspective-1000 cursor-pointer mb-8"
          onClick={handleFlip}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentIndex}-${isFlipped}`}
              initial={{ rotateY: isFlipped ? -180 : 0, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 0 : 180, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <Card
                className={cn(
                  'h-full border-neo border-neo-black shadow-hard-lg',
                  'flex items-center justify-center',
                  isFlipped ? 'bg-neo-cyan/10' : 'bg-neo-navy/80'
                )}
              >
                <CardContent className="p-6 text-center">
                  {isFlipped ? (
                    // Definition side with pronunciation
                    <div>
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <p className="text-sm text-neo-cyan font-neo-body">
                          {t('education.practice.definition') || 'Definition'}
                        </p>
                        <PronunciationButton
                          word={currentWord.word}
                          lang={language}
                          size="sm"
                        />
                      </div>
                      <p className="text-xl sm:text-2xl font-neo-body text-neo-white">
                        {currentWord.definition || 'No definition provided'}
                      </p>
                    </div>
                  ) : (
                    // Word side
                    <div>
                      <p className="text-sm text-slate-400 mb-2 font-neo-body">
                        {t('education.practice.word') || 'Word'}
                      </p>
                      <p className="text-3xl sm:text-4xl font-neo-display text-neo-white">
                        {currentWord.word}
                      </p>
                      <p className="text-sm text-slate-500 mt-4">
                        {t('education.practice.tapToFlip') || 'Tap to reveal'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Answer buttons */}
        <div className="flex gap-4">
          <Button
            onClick={() => handleAnswer(false)}
            disabled={!isFlipped}
            className={cn(
              'flex-1 bg-neo-pink/20 text-neo-pink font-bold',
              'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <X className={cn('w-5 h-5', isRTL ? 'ml-2' : 'mr-2')} />
            {t('education.practice.dontKnow') || "Don't Know"}
          </Button>
          <Button
            onClick={() => handleAnswer(true)}
            disabled={!isFlipped}
            className={cn(
              'flex-1 bg-neo-cyan/20 text-neo-cyan font-bold',
              'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Check className={cn('w-5 h-5', isRTL ? 'ml-2' : 'mr-2')} />
            {t('education.practice.gotIt') || 'Got It!'}
          </Button>
        </div>

        {/* Navigation hint */}
        <p className="text-center text-xs text-slate-500 mt-4">
          {isFlipped
            ? t('education.practice.chooseAnswer') || 'Choose how well you knew the word'
            : t('education.practice.tapCard') || 'Tap the card to see the definition'}
        </p>
      </div>
    </div>
  );
}
