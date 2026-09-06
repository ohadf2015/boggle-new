'use client';

import { useState, useCallback, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
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
  Layers,
  MousePointer2,
} from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { VocabularyWord } from '@/lib/supabase/education';
import { FlashcardSwipeStack } from './FlashcardSwipeStack';
import type { EnrichedVocabularyWord, VocabularyExample } from '@/types/vocabulary';
import { useSocketOptional } from '@/utils/SocketContext';
import { PronunciationButton } from './PronunciationButton';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { WordContextRow } from './WordContextRow';

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
  const socketContext = useSocketOptional();
  const socket = socketContext?.socket;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [reviewMode, setReviewMode] = useState<ReviewMode>('classic');
  const [enrichedWords, setEnrichedWords] = useState<EnrichedVocabularyWord[]>([]);
  const [autoPronounce, setAutoPronounce] = useState(false);

  const { speak } = useSpeechSynthesis(language);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  // Practice renders from the teacher's own words, always and immediately.
  //
  // This used to gate the whole screen on a socket round trip: it set
  // `isEnriching`, emitted `enrichVocabulary`, and cleared the flag only inside
  // the `vocabularyEnriched` handler. No server handler for `enrichVocabulary`
  // exists anywhere in the repo, so that reply never arrived and every student
  // sat on a spinner forever, on every lesson. The emit and listener are gone
  // with it; there is nothing on the other end to talk to.
  useEffect(() => {
    if (words.length === 0) return;
    setEnrichedWords(
      words.map((word) => ({
        word: word.word,
        definition: word.definition || '',
        pronunciation: undefined,
        // No producer exists for part of speech; the only one ever wired was
        // the phantom socket reply. Left undefined rather than invented.
        partOfSpeech: undefined,
        // The teacher's own example sentence is real data already on the word,
        // so the context row still has something true to show. WordContextRow
        // reads `examples[0].text`.
        examples: word.example ? [{ text: word.example }] : [],
        contextualExamples: word.example ? [{ text: word.example }] : [],
      }))
    );
  }, [words]);

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

  // Results screen
  if (showResults) {
    const correctCount = results.filter(Boolean).length;
    const percentage = Math.round((correctCount / words.length) * 100);

    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-neo-navy p-4 sm:p-6 flex items-center justify-center">
        <Card className="border-neo border-neo-black shadow-hard-lg bg-neo-navy/80 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AdaptiveMotion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <Trophy className="w-16 h-16 mx-auto text-neo-yellow mb-4" />
            </AdaptiveMotion.div>

            <h2 className="text-2xl font-neo-display text-neo-white mb-2">
              {t('education.practice.complete')}
            </h2>

            <div className="my-6">
              <p className="text-5xl font-neo-display text-neo-cyan">{percentage}%</p>
              <p className="text-slate-400 mt-2">
                {correctCount} / {words.length} {t('education.practice.correctCount')}
              </p>

              {/* XP Session Summary - Mastery message shown FIRST (research requirement) */}
              {xpSessionData && (
                <div className="mt-4 pt-4 border-t border-neo-black/30">
                  {xpSessionData.sessionMasteryMessage && (
                    <p className="font-neo-display text-lg text-neo-yellow mb-2">
                      {xpSessionData.sessionMasteryMessage}
                    </p>
                  )}
                  <p className="text-neo-white font-neo-body">
                    +{xpSessionData.sessionXpEarned} {t('education.xp.xpGained')}
                  </p>
                </div>
              )}
            </div>

            {/* Word results summary */}
            <div className="bg-neo-black/30 rounded-neo p-4 mb-6 max-h-40 overflow-y-auto">
              {words.map((word, idx) => (
                <div
                  key={`word-${idx}-${word.word}`}
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
                <RotateCcw className="w-4 h-4 me-2" />
                {t('common.retry')}
              </Button>
              <Button
                variant="outline"
                onClick={onBack}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.back')}
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
      <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-neo-navy p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          {/* Header with mode toggle */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label={t('common.back')}
              className="text-slate-400 hover:text-neo-white"
            >
              <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-neo-display text-neo-white">
                {t('education.practice.flashcards')}
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
                title={t('education.lesson.classicMode')}
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewMode('swipe')}
                className="text-neo-pink hover:bg-neo-pink/20 bg-neo-pink/20"
                title={t('education.lesson.swipeMode')}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Swipe stack */}
          <FlashcardSwipeStack
            words={enrichedWords}
            onGotIt={() => handleAnswer(true)}
            onDontKnow={() => handleAnswer(false)}
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
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen bg-neo-navy p-4 sm:p-6">
      <div className="max-w-lg mx-auto">
        {/* Header with mode toggle */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-slate-400 hover:text-neo-white"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-neo-display text-neo-white">
              {t('education.practice.flashcards')}
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
                title={t('education.lesson.classicMode')}
              >
                <MousePointer2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewMode('swipe')}
                className="text-neo-pink hover:bg-neo-pink/20"
                title={t('education.lesson.swipeMode')}
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar and auto-pronounce option */}
        <div className="mb-8">
          <div className="h-2 bg-neo-black/30 rounded-full mb-3 overflow-hidden">
            <AdaptiveMotion.div
              className="h-full bg-neo-cyan"
              style={{ transformOrigin: 'left' }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress / 100 }}
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
              {t('education.lesson.autoPronounce')}
            </label>
          </div>
        </div>

        {/* Flashcard */}
        <AdaptiveMotion.div
          className="relative h-64 sm:h-80 perspective-1000 cursor-pointer mb-8"
          onClick={handleFlip}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          <AdaptiveAnimatePresence mode="wait">
            <AdaptiveMotion.div
              key={`${currentIndex}-${isFlipped}`}
              initial={{ rotateY: isFlipped ? -180 : 0, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: isFlipped ? 0 : 180, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <div
                className={cn(
                  'h-full rounded-neo border-3 border-black shadow-hard-lg',
                  'flex items-center justify-center',
                  isFlipped ? 'bg-neo-cyan/15' : 'bg-neo-navy/80'
                )}
              >
                <div className="p-6 text-center">
                  {isFlipped ? (
                    <div>
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <span className="px-2 py-0.5 bg-neo-cyan/20 border-2 border-neo-cyan/40 rounded-neo text-xs font-black text-neo-cyan uppercase">
                          {t('education.practice.definition')}
                        </span>
                        <PronunciationButton
                          word={currentWord.word}
                          lang={language}
                          size="sm"
                        />
                      </div>
                      <p className="text-xl sm:text-2xl font-neo-body text-neo-white">
                        {currentWord.definition || t('education.practice.noDefinition')}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-neo-yellow/20 border-2 border-neo-yellow/40 rounded-neo text-xs font-black text-neo-yellow uppercase mb-3">
                        {t('education.practice.word')}
                      </span>
                      <p className="text-3xl sm:text-4xl font-neo-display font-black text-neo-white">
                        {currentWord.word}
                      </p>
                      <WordContextRow
                        partOfSpeech={enrichedWords[currentIndex]?.partOfSpeech}
                        example={enrichedWords[currentIndex]?.examples?.[0]?.text}
                      />
                      <p className="text-sm text-neo-white mt-4 font-neo-body">
                        {t('education.practice.tapToFlip')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>
        </AdaptiveMotion.div>

        {/* Answer buttons */}
        <div className="flex gap-4">
          <AdaptiveMotion.button
            onClick={() => handleAnswer(false)}
            disabled={!isFlipped}
            whileHover={isFlipped ? { scale: 1.04, y: -3, boxShadow: '6px 6px 0px black' } : undefined}
            whileTap={isFlipped ? { scale: 0.96, y: 2, boxShadow: '2px 2px 0px black' } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-neo',
              'bg-neo-pink text-black font-neo-display font-black uppercase',
              'border-3 border-black shadow-hard',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <X className="w-5 h-5" />
            {t('education.practice.dontKnow')}
          </AdaptiveMotion.button>
          <AdaptiveMotion.button
            onClick={() => handleAnswer(true)}
            disabled={!isFlipped}
            whileHover={isFlipped ? { scale: 1.04, y: -3, boxShadow: '6px 6px 0px black' } : undefined}
            whileTap={isFlipped ? { scale: 0.96, y: 2, boxShadow: '2px 2px 0px black' } : undefined}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3 rounded-neo',
              'bg-neo-cyan text-black font-neo-display font-black uppercase',
              'border-3 border-black shadow-hard',
              'disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            <Check className="w-5 h-5" />
            {t('education.practice.gotIt')}
          </AdaptiveMotion.button>
        </div>

        {/* Navigation hint */}
        <p className="text-center text-xs text-neo-white font-neo-body mt-4">
          {isFlipped
            ? t('education.practice.chooseAnswer')
            : t('education.practice.tapCard')}
        </p>
      </div>
    </div>
  );
}
