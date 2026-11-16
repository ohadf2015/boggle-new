'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { ArrowLeft, ArrowRight, Lightbulb, Check, X } from 'lucide-react';
import { useSpellingGame } from './hooks/useSpellingGame';
import PracticeResultsCard from './PracticeResultsCard';
import type { VocabularyWord } from '@/lib/supabase/education/types';
import type { EnrichedVocabularyWord } from '@/types/vocabulary';
import { WordContextRow } from './WordContextRow';
import { PronunciationButton } from './PronunciationButton';
import { usePracticeSfx } from '@/components/education/practice/usePracticeSfx';
import StreakFlame from '@/components/education/practice/StreakFlame';
import { PracticeInsufficientData } from './PracticeInsufficientData';
import { wordsReadyForDrill } from '@/lib/education/normalizePracticeWords';

export interface SpellingChallengePracticeProps {
  words: VocabularyWord[];
  onComplete: (results: { correct: number; total: number; accuracy: number }) => void;
  onBack: () => void;
  /** Jump straight into the next ready mode, when the lesson offers one. */
  onNext?: () => void;
  /** Human name of that next mode, for the button label. */
  nextLabel?: string;
  /** XP session data to display on results screen (optional) */
  xpSessionData?: {
    sessionXpEarned: number;
    sessionMasteryMessage: string | null;
  };
}

/**
 * SpellingChallengePractice - Type-the-word spelling practice mode
 *
 * Features:
 * - Shows definition, student types the word
 * - Progressive difficulty (shorter words first)
 * - Hint system (first letter free, additional hints reset streak)
 * - Streak tracking with visual feedback
 * - Auto-advance after answer (1s correct, 2s incorrect)
 * - Results display with PracticeResultsCard
 */
interface SpellingRoundProps extends SpellingChallengePracticeProps {
  /** Start a fresh round: the full list (no argument) or only the words just missed. */
  onNewRound: (words?: VocabularyWord[]) => void;
}

/**
 * Each round is a fresh mount (the game hook fixes its word order on mount), so
 * "Again" and "Practice these" both start clean: same list, or only the misses.
 */
export function SpellingChallengePractice(props: SpellingChallengePracticeProps) {
  const [round, setRound] = useState<{ n: number; words: VocabularyWord[] | null }>({ n: 0, words: null });
  const onNewRound = useCallback((retry?: VocabularyWord[]) => {
    setRound((r) => ({ n: r.n + 1, words: retry && retry.length > 0 ? retry : null }));
  }, []);
  return <SpellingRound key={round.n} {...props} words={round.words ?? props.words} onNewRound={onNewRound} />;
}

function SpellingRound({
  words,
  onComplete,
  onBack,
  xpSessionData,
  onNext,
  nextLabel,
  onNewRound,
}: SpellingRoundProps) {
  const { t, dir, language } = useLanguage();
  const isRTL = dir === 'rtl';
  const sfx = usePracticeSfx();

  /*
    Trimmed, de-duplicated, blanks dropped — a teacher's list arrives with all
    three. Spelling asks for the WORD and nothing else (the definition is a
    bonus prompt, not the question — see the definition card below), so the
    only entry this drill cannot use is one with no word at all.
  */
  const usable = useMemo(() => wordsReadyForDrill(words, 'word'), [words]);

  const {
    currentWord,
    wordIndex,
    totalWords,
    currentHint,
    getHint,
    submitAnswer,
    currentStreak,
    maxStreak,
    hintsUsed,
    correctCount,
    attempts,
    accuracy,
    isComplete,
    advance,
    resetGame,
  } = useSpellingGame(usable, { manualAdvanceOnWrong: true });

  // Mirror the hook's sort-by-length so wordIndex maps to the right enriched
  // word — including the hook's drop of entries with no `word`, or the two
  // lists index differently and the hint row describes a different card than
  // the one on screen.
  const sortedWords = useMemo(
    () => [...usable].sort((a, b) => a.word.length - b.word.length),
    [usable]
  );

  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean; correctWord: string; attempt?: string } | null>(null);
  // One entry per answered word: drives the progress track and the "catch these" list.
  const [outcomes, setOutcomes] = useState<Array<{ correct: boolean; attempt: string }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [totalHintsUsed, setTotalHintsUsed] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const sessionStartRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session start time — and open the round with a cue, so the
  // student hears that a drill has begun rather than just seeing a new card.
  useEffect(() => {
    sessionStartRef.current = Date.now();
    sfx.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Focus input on mount and word change
  useEffect(() => {
    if (!isComplete && !feedback && inputRef.current) {
      inputRef.current.focus();
    }
  }, [wordIndex, isComplete, feedback]);

  // Show results and report completion when game ends
  useEffect(() => {
    if (isComplete && !showResults) {
      setTimeSpent(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      setTimeout(() => {
        setShowResults(true);
        onComplete({ correct: correctCount, total: attempts, accuracy });
      }, 500);
    }
  }, [isComplete, showResults, onComplete, correctCount, attempts, accuracy]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim() || feedback) return;

      const result = submitAnswer(inputValue);
      const answeredAt = wordIndex;
      setOutcomes((prev) => {
        const next = [...prev];
        next[answeredAt] = { correct: result.correct, attempt: inputValue.trim() };
        return next;
      });
      if (result.correct) sfx.correct();
      else sfx.wrong();
      // Keep what they typed: seeing their own spelling next to the right one is the lesson.
      setFeedback({ ...result, attempt: inputValue.trim() });
      setInputValue('');

      if (result.correct) setTimeout(() => setFeedback(null), 1000);
    },
    [inputValue, feedback, submitAnswer, sfx, wordIndex]
  );

  const handleNext = useCallback(() => {
    setFeedback(null);
    advance();
  }, [advance]);

  const handleRestart = useCallback(() => {
    resetGame();
    onNewRound();
  }, [resetGame, onNewRound]);

  const missed = useMemo(
    () => sortedWords.filter((_, i) => outcomes[i] && !outcomes[i].correct),
    [sortedWords, outcomes]
  );

  // "Nailed it!|Spot on!|…" — a different cheer per word, so a streak does not read as one stamp.
  const praise = useMemo(() => {
    const raw = t('eduStudent.practice.praise');
    const list = typeof raw === 'string' && raw.includes('|') ? raw.split('|').filter(Boolean) : [];
    return list.length > 0 ? list[wordIndex % list.length] : t('education.practice.correct');
  }, [t, wordIndex]);


  // Track hints used across all words — intentionally fires on word transition only
  useEffect(() => {
    setTotalHintsUsed(prev => prev + hintsUsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordIndex]);

  const hintSpent = currentHint.length >= (sortedWords[wordIndex]?.word?.length ?? 0);

  if (usable.length < 1) {
    return <PracticeInsufficientData onBack={onBack} />;
  }

  if (showResults) {
    return (
      <div className="min-h-full bg-neo-navy flex items-center justify-center p-4">
        <PracticeResultsCard
          correct={correctCount}
          total={attempts}
          xpEarned={xpSessionData?.sessionXpEarned}
          onRestart={handleRestart}
          onBack={onBack}
          timeSpent={timeSpent}
          maxStreak={maxStreak}
          hintsUsed={totalHintsUsed}
          onNext={onNext}
          nextLabel={nextLabel}
          footer={
            missed.length > 0 ? (
              <div data-testid="spelling-missed" className="mt-1 flex flex-col items-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="font-neo-display text-sm font-bold uppercase tracking-wide text-neo-cream">
                  {t('eduStudent.results.missedTitle')}
                </p>
                <ul className="flex flex-wrap justify-center gap-2">
                  {missed.map((w) => (
                    <li
                      key={w.word}
                      dir="auto"
                      className="rounded-neo border-[3px] border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-base font-black tracking-[0.08em] text-neo-black shadow-hard-sm"
                    >
                      {w.word}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  data-testid="spelling-retry-missed"
                  onClick={() => onNewRound(missed)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-[2px] border-neo-pink bg-neo-navy px-4 font-neo-body text-sm font-bold uppercase text-neo-pink transition-colors hover:bg-neo-navy-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
                >
                  {t('eduStudent.results.practiceThese')}
                  <DirectionalIcon icon={ArrowRight} className="size-4" />
                </button>
              </div>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-neo-navy p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
          >
            <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
          </Button>

          <div className="text-center">
            <h2 className="text-xl font-neo-display text-neo-white mb-1">
              {t('education.practice.spellTheWord')}
            </h2>
            <div className="flex flex-col items-center gap-1">
              <p className="text-neo-white font-neo-body" data-testid="progress-text">
                {wordIndex + (isComplete ? 0 : 0)} / {totalWords}
              </p>
            </div>
          </div>

          <div className="w-10" />
        </div>
        {/*
          One pip per word, filled lime or pink as it is answered: a round you can
          see filling up, and the misses stay visible. The old 80px hairline bar
          was hard to see at all. Long teacher lists fall back to a single bar.
        */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalWords}
          aria-valuenow={wordIndex}
          aria-label={t('eduStudent.practice.progress', { current: Math.min(wordIndex + 1, totalWords), total: totalWords })}
          data-testid="practice-progress-track"
          className="mt-3 flex gap-1"
        >
          {totalWords <= 20 ? (
            Array.from({ length: totalWords }, (_, i) => (
              <span
                key={i}
                data-state={outcomes[i] ? (outcomes[i].correct ? 'hit' : 'miss') : i === wordIndex ? 'current' : 'todo'}
                className={cn(
                  'h-2.5 flex-1 rounded-full border-2 border-neo-black transition-colors duration-300',
                  outcomes[i]
                    ? outcomes[i].correct
                      ? 'bg-neo-lime'
                      : 'bg-neo-pink'
                    : i === wordIndex
                      ? 'bg-neo-cyan motion-safe:animate-pulse'
                      : 'bg-neo-white/15'
                )}
              />
            ))
          ) : (
            <span className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-neo-white/15">
              <span
                className="block h-full bg-neo-cyan transition-[width] duration-300"
                style={{ width: `${(wordIndex / totalWords) * 100}%` }}
              />
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto space-y-6">
        {/*
          The streak used to be a flat orange pill reading "4x streak". It is
          now a fire that visibly grows through four stages and stings when it
          reaches a new one — the one tense mechanic in this drill, finally
          audible. `streak-display` stays as the testid for existing coverage.
        */}
        {currentStreak > 0 && (
          <div data-testid="streak-display" className="flex justify-center">
            <StreakFlame streak={currentStreak} />
          </div>
        )}

        {/* Definition card */}
        <AdaptiveAnimatePresence mode="wait">
          <AdaptiveMotion.div
            key={wordIndex}
            initial={{ x: isRTL ? -20 : 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? 20 : -20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="definition-card"
            className={cn(
              'p-8 rounded-neo',
              // Cream edge, not black: a black border on navy measures 1.23:1,
              // so the prompt card had no visible edge at all.
              'bg-neo-navy-light border-[3px] border-neo-cream',
              'shadow-hard-lg',
              'min-h-[120px] flex items-center justify-center'
            )}
          >
            <p className="font-neo-body text-neo-white text-2xl text-center">
              {/*
                A word with no definition is not a broken round — Spelling's
                prompt is the audio. "No words to practice" over a live 8-word
                drill read as a failure that had not happened.
              */}
              {currentWord?.definition || t('student.practiceFun.listenAndSpell')}
            </p>
            <WordContextRow
              partOfSpeech={(sortedWords[wordIndex] as Partial<EnrichedVocabularyWord>)?.partOfSpeech}
              example={(sortedWords[wordIndex] as Partial<EnrichedVocabularyWord>)?.examples?.[0]?.text}
            />
          </AdaptiveMotion.div>
        </AdaptiveAnimatePresence>

        {/* Hint display */}
        <div
          data-testid="hint-display"
          className="flex items-center justify-center gap-3"
        >
          <span className="font-mono text-neo-cyan text-2xl tracking-widest">
            {/*
              Blanks come from the SORTED list. Reading the unsorted prop here
              counted the underscores off a different word entirely, and the
              optional chain stopped one level too early: an entry with no
              `word` threw and took the whole round down with it.
            */}
            {currentHint}
            {'_'.repeat(
              Math.max(0, (sortedWords[wordIndex]?.word?.length ?? 0) - currentHint.length)
            )}
          </span>
          {sortedWords[wordIndex] && (
            <PronunciationButton
              word={sortedWords[wordIndex].word}
              lang={language}
              size="sm"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sfx.hint();
              getHint();
            }}
            disabled={!!feedback || isComplete || hintSpent}
            data-testid="hint-button"
            className="text-neo-yellow hover:text-neo-yellow/80"
          >
            <Lightbulb className="w-5 h-5" />
          </Button>
        </div>

        <div data-testid="spelling-answer-zone" className="relative min-h-[152px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!!feedback || isComplete}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-testid="spelling-input"
            aria-label={t('education.practice.spellTheWord')}
            className={cn(
              'px-6 py-4 rounded-neo',
              'border-[4px] border-neo-black',
              'bg-neo-white text-neo-black',
              'font-neo-body text-xl',
              'shadow-hard',
              'focus:outline-hidden focus:ring-4 focus:ring-neo-purple',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity]'
            )}
            placeholder={t('education.practice.typeWord')}
          />
          <button
            type="submit"
            disabled={!!feedback || isComplete || !inputValue.trim()}
            className={cn(
              'px-6 py-4 rounded-neo',
              // Lime + black, the same primary the picker's PLAY uses. White on
              // neo-purple measures 4.23:1 — under AA — and dropped further the
              // moment `disabled:opacity-50` faded the label with the fill.
              'bg-neo-lime hover:bg-neo-lime/90',
              'border-[3px] border-black',
              'shadow-hard hover:shadow-hard-lg',
              'font-neo-display text-black text-xl',
              // Disabled drains the FILL and keeps a readable label and a
              // visible edge, instead of fading the whole control.
              'disabled:bg-neo-navy-light disabled:text-neo-cream disabled:border-neo-cream',
              'disabled:shadow-none disabled:cursor-not-allowed',
              'transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity] active:translate-y-1'
            )}
          >
            {t('education.practice.submit')}
          </button>
        </form>
        {feedback && (
          <div
            data-testid="feedback-display"
            role="status"
            className={cn(
              'absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-neo border-[3px] border-neo-black p-2 text-center shadow-hard-lg sm:gap-2 sm:p-3',
              'motion-safe:animate-[lc-verdict-in_260ms_cubic-bezier(.34,1.56,.64,1)]',
              feedback.correct ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-neo-black motion-safe:animate-neo-shake'
            )}
          >
            <style>{'@keyframes lc-verdict-in{0%{transform:scale(.85) rotate(-2deg)}100%{transform:scale(1) rotate(0)}}'}</style>
            <p className="flex items-center gap-2 font-neo-display text-xl font-black uppercase sm:text-2xl">
              {feedback.correct ? <Check className="size-7" strokeWidth={3.5} /> : <X className="size-7" strokeWidth={3.5} />}
              {feedback.correct ? praise : t('education.practice.incorrect')}
            </p>
            {feedback.correct ? (
              <p className="font-neo-display text-xl font-black tracking-wider" dir="auto">{feedback.correctWord}</p>
            ) : (
              <>
                {/* Their spelling, struck through, on the same row as the right one: the card has no room for another line. */}
                <p className="flex flex-wrap items-baseline justify-center gap-2 font-neo-body text-sm font-bold">
                  {feedback.attempt ? (
                    <span data-testid="feedback-attempt">
                      <span className="sr-only">{t('eduStudent.practice.youWrote')} </span>
                      <s dir="auto" className="font-neo-display text-base font-black tracking-[0.1em] decoration-[3px] opacity-80">{feedback.attempt.length > 16 ? `${feedback.attempt.slice(0, 16)}…` : feedback.attempt}</s>
                    </span>
                  ) : null}
                  <span>{t('eduStudent.practice.answerIs')}</span>
                  <span dir="auto" className="rounded-neo border-[3px] border-neo-black bg-neo-cream px-2 py-0.5 font-neo-display text-xl font-black tracking-[0.15em] text-neo-black shadow-hard-sm sm:text-2xl">
                    {feedback.correctWord}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  autoFocus
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-neo border-[3px] border-neo-black bg-neo-navy px-4 py-1.5 font-neo-display text-base font-black uppercase text-neo-lime shadow-hard transition-transform active:translate-y-0.5 active:shadow-none sm:mt-1 sm:px-5 sm:py-2 sm:text-lg"
                >
                  {wordIndex + 1 >= totalWords ? t('eduStudent.practice.finish') : t('eduStudent.practice.next')}
                  <DirectionalIcon icon={ArrowRight} className="size-5" />
                </button>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default SpellingChallengePractice;
